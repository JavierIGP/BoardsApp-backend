const Layout = require("../models/layout")

const layoutController = {}

layoutController.getLayouts = async (req,res) => {
    const layouts = await Layout.find()
    res.header('Access-Control-Allow-Origin', "*")
    res.json(layouts)
}

layoutController.createLayout = async (req, res) => {
    const layout = new Layout(req.body)
    await layout.save()
    res.header('Access-Control-Allow-Origin', "*")
    res.json({
        'status': 'Layout saved'
    })
}

layoutController.getLayoutById = async (req, res) => {
    const { id } = req.params
    const layout = await Layout.findById(id)
    res.header('Access-Control-Allow-Origin', "*")
    res.json(layout)
}

layoutController.deleteLayout = async (req, res) => {
    const { id } = req.params
    await Layout.findByIdAndDelete(id)
    res.header('Access-Control-Allow-Origin', "*")
    res.json({
        'status': 'Layout deleted'
    })
}

module.exports = layoutController