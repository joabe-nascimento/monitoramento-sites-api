// Importa a biblioteca mongoose para interagir com o MongoDB
const mongoose = require("mongoose");

// Importa a biblioteca dotenv para carregar variáveis de ambiente de um arquivo .env
require("dotenv").config();

// Variáveis de Ambiente localizadas no arquivo .env
const db_user = process.env.DB_TI_USER; // Nome de usuário do banco de dados MongoDB
const db_pass = process.env.DB_TI_PASSWORD; // Senha do banco de dados MongoDB
const cluster = process.env.DB_TI_CLUSTER; // Cluster MongoDB
const db_name = process.env.DB_TI_NAME; // Nome do banco de dados MongoDB

// Função que conecta ao banco de dados MongoDB utilizando variáveis de ambiente para segurança
async function connectDataBase() {
  try {
    // Conecta ao banco de dados MongoDB utilizando a string de conexão e as variáveis de ambiente
    await mongoose.connect(
      `mongodb+srv://${db_user}:${db_pass}@${cluster}.mongodb.net/${db_name}?retryWrites=true&w=majority&appName=projeto-uniaomedica`, 
      { useNewUrlParser: true, useUnifiedTopology: true }
    );
    console.log("Conectado ao MongoDB com sucesso!");
  } catch (error) {
    console.error("Erro ao conectar ao MongoDB:", error);
  }
}

// Exporta a função para poder utilizá-la em outros locais do projeto
module.exports = connectDataBase;
