import { Express } from "express"
import database from "../../modules/database"
import { RouteRequest, StrictRouteRequest } from "../Types";

export default (app: Express) => {
    app.post("/api/v1/mods/submit_unban", (req: RouteRequest, res) => {
        const { id } = req.body;
        if (id === undefined || typeof id !== "string") {
            res.status(400).json({
                success: false,
                message: "Required fields not provided or not formatted properly",
            });

            return;
        }

        if (!req.session?.user) {
            res.status(401).json({
                success: false,
                message: "You must be logged in to unban a user from submitting mods",
            });

            return;
        }

        database.methods.SubmissionBan(req as StrictRouteRequest, id, false).then((result: { status: number, response: { success: boolean, message: string } }) => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        route: "/api/v1/mods/submit_unban",
        method: "POST"
    }
}