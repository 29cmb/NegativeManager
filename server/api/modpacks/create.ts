import { Express } from "express"
import { RouteRequest, StrictRouteRequest } from "../../Types"
import database from "../../modules/database"

export default (app: Express) => {
    app.post("/api/v1/modpacks/create", (req: RouteRequest, res) => {
        const { 
            name,
            description,
            icon,
            mods
        } = req.body

        if(
            name === undefined
            || description === undefined
            || icon === undefined
            || !Array.isArray(mods)
            || typeof name !== "string"
            || typeof description !== "string"
            || typeof icon !== "string"
            || !icon.startsWith("data:image/")
            || mods.some((mod: { id: string, tag: string }) => (
                mod.id === undefined 
                    || mod.tag === undefined
                    || typeof mod.id !== "string"
                    || typeof mod.tag !== "string"
            ))
        ) {
            res.status(400).json({ success: false, message: "Required fields not provided or not formatted properly" })
            return
        }

        if(!req.session?.user) {
            res.status(401).json({ success: false, message: "You must be logged in to create a modpack" })
            return
        }

        database.methods.CreateModpack(
            req as StrictRouteRequest,
            name,
            description,
            icon,
            mods as [{ id: string, tag: string }]
        ).then((result: { status: number, response: { success: boolean, message: string } }) => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        method: "POST",
        route: "/api/v1/modpacks/create"
    }
}