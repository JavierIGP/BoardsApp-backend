const express = require('express')
const router = express.Router()

const websocketController = require('../controllers/websocket.controller')

router.ws('/:id', websocketController.handle);

module.exports = router