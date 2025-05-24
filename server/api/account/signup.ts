import { Express } from "express"
import database from "../../modules/database"
import { RouteRequest } from "../../Types";
export default (app: Express) => {
    app.post("/api/v1/signup", (req: RouteRequest, res) => {
        const { email, username, password } = req.body;
        if(
            email === undefined
            || username === undefined
            || password === undefined
            || typeof email !== "string"
            || typeof username !== "string"
            || typeof password !== "string"
        ) {
            res.status(400).json({ success: false, message: "Required fields not provided or not formatted properly" })
            return
        }

        if(username.length < 3 || username.length > 35) {
            res.status(400).json({ success: false, message: "Username must be between 3 and 35 characters" })
            return
        }

        if(password.length < 6) {
            res.status(400).json({ success: false, message: "Password must be at least 6 characters" })
            return
        }

        database.methods.signup(email, username, password).then((result: {status: number, response: {success: boolean, message: string}}) => {
            res.status(result.status).json(result.response)
        })
    })

    return {
        route: "/api/v1/signup",
        method: "POST",
    }
}