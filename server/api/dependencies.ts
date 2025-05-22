import { Express } from "express"
import database from "../modules/database"

export default (app: Express) => {
    app.get("/api/v1/mods/:id/:tag/dependencies", async (req, res) => {
        const { id, tag } = req.params
        
        const mod = await database.methods.GetMod(id)
        if(!mod) {
            res.status(404).json({ success: false, message: "Mod not found" })
            return
        }

        const release = await database.methods.GetRelease(id, tag)
        if(!release) {
            res.status(404).json({ success: false, message: "Release not found" })
            return
        }

        if(mod.approved !== true || release.approved !== true) {
            res.status(403).json({ success: false, message: "Mod or release has not been approved by moderators" })
            return
        }

        database.methods.GetDependencies(id, tag).then((result) => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        method: "GET",
        route: "/api/v1/mods/:id/dependencies"
    }
}