import { Express, Request, response } from "express"
import database from "../modules/database"

export default (app: Express) => {
    app.post("/api/v1/mods/release/update", (req: Request & {
            session?: { user?: string };
            body: {
                mod: string,
                tag: string
            };
    }, res) => {
        const { mod, tag } = req.body
        if(
            mod === undefined
            || tag === undefined
            || typeof mod !== "string"
            || typeof tag !== "string"
        ) {
            res.status(400).json({ success: false, message: "Required fields not provided or not formatted properly" })
            return
        }

        if(!req.session?.user) {
            res.status(401).json({ success: false, message: "You must be logged in to update a release" })
            return
        }

        database.methods.UpdateReleaseSettings(req, mod, tag).then((result: { status: number, response: { success: boolean, message: string } }) => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        method: "POST",
        route: "/api/v1/mods/release/update"
    }
} 