const express = require('express')

const router = express.Router()

const layoutController = require('../controllers/layout.controller')
const boardController = require('../controllers/boards.controller')

router.get('/layouts', layoutController.getLayouts)
router.post('/layouts', layoutController.createLayout)
router.get('/layouts/:id', layoutController.getLayoutById)
router.delete('/layouts/:id', layoutController.deleteLayout)

router.get('/boards', boardController.getBoards)
router.post('/boards', boardController.createBoard)
router.get('/boards/:id', boardController.getBoardById)
router.get('/boards/user/:user', boardController.getUserBoards)
router.delete('/boards/:id', boardController.deleteBoard)

module.exports = router
