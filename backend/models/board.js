const mongoose = require('mongoose')
const { Schema } = mongoose

var boardSchema = new Schema({
    name: { type: String, required: true },
    users: { type: Array, required: true },
    layout: { type: Schema.Types.ObjectId, ref:'Layout', required: true },
    data: { type: {}, required: true }
})

module.exports = mongoose.model('Boards', boardSchema)



