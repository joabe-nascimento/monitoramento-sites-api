const axios = require("axios"); 
const nodemailer = require("nodemailer");
const express = require("express");
const cors = require("cors");
const https = require("https");

const connectDataBase = require("./database/db.js");
const Links = require("./models/Links.js");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const siteStates = {};
const retryAttempts = 3; // Número de tentativas antes de considerar o site como offline
const retryDelay = 2000; // Tempo de espera entre as tentativas em milissegundos
const alertInterval = 10 * 60 * 1000; // Intervalo de 10 minutos para repetir alertas

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  secure: false,
  auth: {
    user: "seu-email@gmail.com",
    pass: "sua-senha-do-email",
  },
});

const agent = new https.Agent({
  rejectUnauthorized: false,
});

async function sendTelegramMessage(message) {
  const telegramBotToken = "7472348745:AAGMqF50_Q4TAWyQgeJySb0tG-njguiJmrI";
  const telegramChatId = "-1002155037998";

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        chat_id: telegramChatId,
        text: message,
      }
    );
    if (response.data.ok) {
      console.log("Mensagem enviada para o grupo do Telegram com sucesso.");
    } else {
      console.error("Erro ao enviar mensagem para o grupo do Telegram:", response.data.description);
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem para o grupo do Telegram:", error.message);
  }
}

async function checkSiteStatus(siteUrl) {
  let attempt = 0;
  while (attempt < retryAttempts) {
    try {
      await axios.get(siteUrl, { httpsAgent: agent });
      return "Online";
    } catch (error) {
      attempt++;
      console.error(`[${new Date().toLocaleString()}] Tentativa ${attempt} para ${siteUrl} falhou. Erro: ${error.message}`);
      if (attempt >= retryAttempts) {
        return "Offline";
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

async function checkSitesAndSendAlert() {
  try {
    const links = await Links.find();
    for (const link of links) {
      const siteUrl = link.link;
      const newState = await checkSiteStatus(siteUrl);

      if (siteStates[siteUrl]?.state !== newState) {
        // Estado mudou, enviar mensagem de notificação
        if (newState === "Online") {
          await sendTelegramMessage(`O site ${siteUrl} está de volta online.`);
        } else {
          await sendTelegramMessage(`Um ou mais sites estão fora do ar!\n\nO site ${siteUrl} está inacessível.`);
        }

        siteStates[siteUrl] = { state: newState, lastAlert: Date.now() };
      } else if (newState === "Offline") {
        // Estado é "Offline", repetir alerta se passou o intervalo
        const lastAlert = siteStates[siteUrl]?.lastAlert || 0;
        if (Date.now() - lastAlert >= alertInterval) {
          await sendTelegramMessage(`O site ${siteUrl} continua inacessível.`);
          siteStates[siteUrl].lastAlert = Date.now();
        }
      }

      console.log(`[${new Date().toLocaleString()}] O site ${siteUrl} está ${newState}.`);
    }
  } catch (error) {
    console.error("Erro ao buscar links do banco de dados:", error.message);
  }
}

app.get("/", (req, res) => {
  console.log("Rota base solicitada");
  res.json({ msg: "API rodando!" });
});

app.get("/checkSites", async (req, res) => {
  const results = [];
  try {
    const links = await Links.find();
    for (const link of links) {
      const siteUrl = link.link;
      const status = await checkSiteStatus(siteUrl);
      results.push({ url: siteUrl, status });
    }
  } catch (error) {
    console.error("Erro ao buscar links do banco de dados:", error.message);
  }
  res.json(results);
});

app.post("/addLink", async (req, res) => {
  const { link } = req.body;
  if (!link) {
    return res.status(400).json({ error: "Link é obrigatório" });
  }

  try {
    const newLink = new Links({ link });
    await newLink.save();

    // Verificar o estado do site e enviar notificação imediatamente
    const initialState = await checkSiteStatus(link);
    siteStates[link] = { state: initialState, lastAlert: Date.now() };

    // Enviar mensagem ao Telegram informando o estado do site
    if (initialState === "Online") {
      await sendTelegramMessage(`Novo site adicionado e está online: ${link}`);
    } else {
      await sendTelegramMessage(`Novo site adicionado, mas está inacessível: ${link}`);
    }

    res.status(201).json({ message: "Link adicionado com sucesso" });
  } catch (error) {
    console.error("Erro ao adicionar link:", error.message);
    res.status(500).json({ error: "Erro ao adicionar link" });
  }
});

// Chamada inicial para verificar os sites
checkSitesAndSendAlert();

// Intervalo para verificar os sites a cada 5 minutos
setInterval(checkSitesAndSendAlert, 5 * 60 * 1000);

connectDataBase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor funcionando e MongoDB conectado na porta ${port}!`);
    });
  })
  .catch((error) => {
    console.error("Erro ao conectar ao banco de dados:", error.message);
  });
