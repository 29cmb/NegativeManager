import { Express } from "express"
import database from "../../modules/database"

export default (app: Express) => {
    app.get("/api/v1/modpacks/:id/comments", async (req, res) => {
        const { id } = req.params

        const modpack = await database.methods.GetModpack(id)
        if(!modpack) {
            res.status(404).json({ success: false, message: `Modpack with id ${id} was not found` })
            return
        }

        database.methods.GetModpackComments(id).then((result) => {
            res.status(result.status).json(result.response)
        })
    })

    return {
        method: "GET",
        route: "/api/v1/modpacks/:id/comments"
    }
}