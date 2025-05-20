import { Express } from "express"
import database from "../modules/database"

export default (app: Express) => {
    app.get("/api/v1/mods/:id/comments", async (req, res) => {
        const { id } = req.params

        const mod = await database.methods.GetMod(id)
        if(!mod) {
            res.status(404).json({ success: false, message: `Mod with id ${id} was not found` })
            return
        }

        database.methods.GetModComments(id).then((result) => {
            res.status(result.status).json(result.response)
        })
    })

    return {
        method: "GET",
        route: "/api/v1/mods/:id/comments"
    }
}