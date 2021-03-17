const Board = require('../models/board')

const boardController = {}

boardController.getBoards = async (req, res) => {
    const boards = await Board.find();
    res.header('Access-Control-Allow-Origin', "*");
    res.json(boards);
}

boardController.getUserBoards = async (req, res) => {
    const boards = await Board.find({ users: req.params.user });
    res.header('Access-Control-Allow-Origin', "*");
    res.json(boards);
}

boardController.createBoard = async (req, res) => {
    const board = new Board(req.body)
    await board.save()
    res.header('Access-Control-Allow-Origin', "*")
    res.json({
        'status': 'Board saved',
        'id': board._id
    })
}

boardController.getBoardById = async (req, res) => {
    const { id } = req.params
    const board = await Board.findById(id)
    res.header('Access-Control-Allow-Origin', "*")
    res.json(board)
}

boardController.deleteBoard = async (req, res) => {
    const { id } = req.params
    await Board.findByIdAndDelete(id)
    res.header('Access-Control-Allow-Origin', "*")
    res.json({
        'status': 'Board deleted'
    })
}

boardController.updateBoard = async (req, res) => {
    const { id } = req.params
    const { board } = req.body
    await Board.findByIdAndUpdate(id, {$set: board} )
    res.header('Access-Control-Allow-Origin', "*")
    res.json({
        'status': 'Board updated'
    })
}

module.exports = boardController