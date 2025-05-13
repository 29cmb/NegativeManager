import { Express, Request } from "express"
import database from "../modules/database"

export default (app: Express) => {
    app.post("/api/v1/mods/submit_ban", (req: Request & {
        session?: { user?: string },
        body: {
            id: string;
        };
    }, res) => {
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
                message: "You must be logged in to submit ban a user",
            });

            return;
        }

        database.methods.SubmissionBan(req, id, true).then((result: { status: number, response: { success: boolean, message: string } }) => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        route: "/api/v1/mods/ban",
        method: "POST"
    }
}