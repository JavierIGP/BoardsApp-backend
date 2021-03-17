const mongoose = require('mongoose')
const { Schema } = mongoose

var layoutSchema = new Schema({
    name: { type: String, required: true },
    grid: { type: Map, required: true },
    categories: { type: [], required: true }
})

module.exports = mongoose.model('Layout', layoutSchema)



