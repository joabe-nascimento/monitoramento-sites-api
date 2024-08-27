// Importa o Mongoose, que é uma biblioteca para modelar objetos MongoDB
const mongoose = require('mongoose');

// Define um esquema (Schema) para os documentos da coleção "administradores"
const linksSchema = new mongoose.Schema({
    link: { type: String, required: true }, // Campo "usuario" do tipo String, obrigatório
    created_at: { type: Date, default: Date.now }, // Adiciona o campo created_at com a data atual
});

const Links = mongoose.model('Links', linksSchema);

module.exports = Links;