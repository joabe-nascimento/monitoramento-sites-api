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

let siteStates = {};

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

async function checkSitesAndSendAlert() {
  try {
    const links = await Links.find();
    for (const link of links) {
      const siteUrl = link.link;
      try {
        await axios.get(siteUrl, { httpsAgent: agent });
        if (siteStates[siteUrl] === "Offline") {
          await sendTelegramMessage(`O site ${siteUrl} está de volta online.`);
        }
        siteStates[siteUrl] = "Online";
        console.log(`[${new Date().toLocaleString()}] O site ${siteUrl} está ativo.`);
      } catch (error) {
        console.error(`[${new Date().toLocaleString()}] O site ${siteUrl} está inacessível. Erro: ${error.message}`);
        if (siteStates[siteUrl] !== "Offline") {
          await sendTelegramMessage(`Um ou mais sites estão fora do ar!\n\nO site ${siteUrl} está inacessível.`);
        }
        siteStates[siteUrl] = "Offline";
      }
    }
  } catch (error) {
    console.error("Erro ao buscar links do banco de dados:", error.message);
  }
}

function sendEmail(subject, text) {
  const mailOptions = {
    from: "seu-email@gmail.com",
    to: "destinatario@gmail.com",
    subject: subject,
    text: text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Erro ao enviar e-mail:", error);
    } else {
      console.log("E-mail enviado:", info.response);
    }
  });
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
      try {
        await axios.get(siteUrl, { httpsAgent: agent });
        results.push({ url: siteUrl, status: "Online" });
      } catch (error) {
        results.push({ url: siteUrl, status: "Offline" });
      }
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
    try {
      await axios.get(link, { httpsAgent: agent });
      siteStates[link] = "Online";
      console.log(`[${new Date().toLocaleString()}] O site ${link} está ativo.`);

      // Enviar mensagem ao Telegram informando que o site foi adicionado e está online
      await sendTelegramMessage(`Novo site adicionado e está online: ${link}`);
    } catch (error) {
      console.error(`[${new Date().toLocaleString()}] O site ${link} está inacessível. Erro: ${error.message}`);

      // Enviar mensagem ao Telegram informando que o site foi adicionado mas está offline
      await sendTelegramMessage(`Novo site adicionado, mas está inacessível: ${link}`);
      siteStates[link] = "Offline";
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
