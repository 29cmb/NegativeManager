import { Express, Request } from "express"
import database from "../../modules/database"
import { RouteRequest, StrictRouteRequest } from "../../Types";
export default (app: Express) => {
    app.post("/api/v1/login", (req: RouteRequest, res) => {
        const { username, password } = req.body;
        if(
            username === undefined
            || password === undefined
            || typeof username !== "string"
            || typeof password !== "string"
        ) {
            res.status(400).json({ success: false, message: "Required fields not provided or not formatted properly" })
            return
        }

        if(req.session?.user) {
            res.status(400).json({ success: false, message: "Already logged in" })
            return
        }

        database.methods.login(req as StrictRouteRequest, username, password).then((result: {status: number, response: {success: boolean, message: string}}) => {
            res.status(result.status).json(result.response)
        })
    })

    return {
        route: "/api/v1/login",
        method: "POST",
    }
}