require('dotenv').config(); // Para carregar variáveis de ambiente
const axios = require('axios');
const nodemailer = require('nodemailer');
const express = require('express');
const cors = require('cors');
const https = require('https');
const connectDataBase = require('./database/db.js');
const Links = require('./models/Links.js');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const siteStates = {};
const retryAttempts = 3;
const retryDelay = 2000;

let lastMessageTime = 0;
const minInterval = 10 * 60 * 1000;
const maxInterval = 30 * 60 * 1000;

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const updownApiKey = process.env.UPDOWN_API_KEY;

async function sendTelegramMessage(message) {
  const now = Date.now();

  if (now - lastMessageTime >= minInterval) {
    if (lastMessageTime === 0 || now - lastMessageTime >= maxInterval) {
      lastMessageTime = now;

      const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegramChatId = process.env.TELEGRAM_CHAT_ID;

      try {
        await axios.post(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          chat_id: telegramChatId,
          text: message,
        });
        console.log('Mensagem enviada para o grupo do Telegram com sucesso.');
      } catch (error) {
        console.error('Erro ao enviar mensagem para o grupo do Telegram:', error.message);
      }
    } else {
      console.log('Aguarde o intervalo mínimo para enviar uma nova mensagem.');
    }
  }
}

async function checkSiteStatus(siteUrl) {
  try {
    const response = await axios.get(`https://updown.io/api/checks?api-key=${updownApiKey}`);
    const siteCheck = response.data.find(check => check.url === siteUrl);

    if (siteCheck) {
      const status = siteCheck.down ? "Offline" : "Online";
      return status;
    } else {
      console.error("O site não foi encontrado no Updown.io");
      return "Unknown";
    }
  } catch (error) {
    console.error("Erro ao verificar status do site através do Updown.io:", error.message);
    return "Error";
  }
}

async function checkSitesAndSendAlert() {
  try {
    const links = await Links.find();
    for (const link of links) {
      const siteUrl = link.link;
      const newState = await checkSiteStatus(siteUrl);

      if (siteStates[siteUrl] !== newState) {
        if (newState === "Online") {
          await sendTelegramMessage(`O site ${siteUrl} está de volta online.`);
        } else if (newState === "Offline") {
          await sendTelegramMessage(`Um ou mais sites estão fora do ar!\n\nO site ${siteUrl} está inacessível.`);
        } else {
          await sendTelegramMessage(`O site ${siteUrl} tem um status desconhecido. Verifique manualmente.`);
        }
        siteStates[siteUrl] = newState;
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

    const initialState = await checkSiteStatus(link);
    siteStates[link] = initialState;

    if (initialState === "Online") {
      await sendTelegramMessage(`Novo site adicionado e está online: ${link}`);
    } else if (initialState === "Offline") {
      await sendTelegramMessage(`Novo site adicionado, mas está inacessível: ${link}`);
    } else {
      await sendTelegramMessage(`O site ${link} foi adicionado, mas seu status é desconhecido.`);
    }

    res.status(201).json({ message: "Link adicionado com sucesso" });
  } catch (error) {
    console.error("Erro ao adicionar link:", error.message);
    res.status(500).json({ error: "Erro ao adicionar link" });
  }
});

checkSitesAndSendAlert();

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
