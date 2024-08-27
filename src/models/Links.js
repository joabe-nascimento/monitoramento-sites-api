// Importa o Mongoose, que é uma biblioteca para modelar objetos MongoDB
const mongoose = require('mongoose');

// Define um esquema (Schema) para os documentos da coleção "administradores"
const linksSchema = new mongoose.Schema({
    link: { type: String, required: true }, // Campo "usuario" do tipo String, obrigatório
    created_at: { type: Date, default: Date.now }, // Adiciona o campo created_at com a data atual
});

// Cria um modelo (Model) chamado "Administradores" usando o esquema definido anteriormente
const Links = mongoose.model('Links', linksSchema);

// Exporta o modelo "Administradores" para que possa ser importado e utilizado em outros arquivos do aplicativo
module.exports = Links;