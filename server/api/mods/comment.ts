import { Express } from "express"
import { RouteRequest, StrictRouteRequest } from "../../Types"
import database from "../../modules/database"

export default (app: Express) => {
    app.post("/api/v1/mods/comment", async (req: RouteRequest, res) => {
        const { mod, comment } = req.body
        if(
            !mod
            || !comment
            || typeof mod !== "string"
            || typeof comment !== "string"
        ) {
            res.status(400).json({ success: false, message: "Required fields not provided or not formatted properly." })
            return
        }

        if(!req.session?.user) {
            res.status(401).json({ success: false, message: "You must be logged in to comment on a mod" })
            return
        }

        database.methods.Comment(req as StrictRouteRequest, mod, comment).then(result => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        method: "POST",
        route: "/api/v1/mods/comment"
    }
}