import { Express } from "express"
import { RouteRequest, StrictRouteRequest } from "../Types"
import database from "../modules/database"
export default (app: Express) => {
    app.post("/api/v1/mods/archive", (req: RouteRequest, res) => {
        const { id } = req.body

        if(id === undefined || typeof id !== "string") {
            res.status(400).json({ success: false, message: "Required fields not provided or not formatted properly" })
            return
        }

        if(!req.session?.user) {
            res.status(401).json({ success: false, message: "You must be logged in to archive mods" })
        }

        database.methods.ArchiveMod(
            req as StrictRouteRequest,
            id
        ).then((result: { status: number, response: { success: boolean, message: string } }) => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        method: "POST",
        route: "/api/v1/mods/archive"
    }
}