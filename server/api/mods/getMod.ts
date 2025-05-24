import { Express } from "express"
import database from "../../modules/database"
export default (app: Express) => {
    app.get("/api/v1/mods/info/:id", async (req, res) => {
        const { id } = req.params
        
        const mod = await database.methods.GetMod(id)
        if(!mod) {
            res.status(404).json({ success: false, message: `Mod with id ${id} was not found` })
            return
        }

        res.status(200).json({ success: true, mod })
    })

    return {
        method: "GET",
        route: "/api/v1/mods/info/:id"
    }
}