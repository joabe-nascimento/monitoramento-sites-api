const mongoose = require('mongoose');

const linksSchema = new mongoose.Schema({
    link: { type: String, required: true }, // Campo "usuario" do tipo String, obrigatório
    created_at: { type: Date, default: Date.now }, // Adiciona o campo created_at com a data atual
});

const Links = mongoose.model('Links', linksSchema);

module.exports = Links;