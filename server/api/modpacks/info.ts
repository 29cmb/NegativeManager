import { Express } from "express"
import database from "../../modules/database"
export default (app: Express) => {
    app.get("/api/v1/modpacks/info/:id", async (req, res) => {
        const { id } = req.params
        
        const modpack = await database.methods.GetPublicModpack(id)
        if(!modpack) {
            res.status(404).json({ success: false, message: `Modpack with id ${id} was not found` })
            return
        }

        res.status(200).json({ success: true, modpack })
    })

    return {
        method: "GET",
        route: "/api/v1/modpacks/info/:id"
    }
}