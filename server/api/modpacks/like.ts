import { Express } from "express"
import database from "../../modules/database"
import { RouteRequest, StrictRouteRequest } from "../../Types"

export default (app: Express) => {
    app.post("/api/v1/modpacks/like", (req: RouteRequest, res) => {
        const { modpack } = req.body
        if(!modpack || typeof modpack !== "string") {
            res.status(400).json({ success: false, message: "Required fields not provided or not formatted properly" })
            return
        }

        if(!req.session?.user) {
            res.status(401).json({ success: false, message: "You must be logged in to like a modpack" })
        }
        
        database.methods.ChangeModpackLikeStatus(req as StrictRouteRequest, modpack, true).then((result: {status: number, response: {success: boolean, message: string}}) => {
            res.status(result.status).json(result.response)
        })
    })

    return {
        method: "POST",
        route: "/api/v1/modpacks/like"
    }
}