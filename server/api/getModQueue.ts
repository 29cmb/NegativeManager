import { Express, Request } from 'express';
import database from '../modules/database';

export default (app: Express) => {
    app.get("/api/v1/mods/queue", async (req: Request & {
        session?: { user?: string };
    }, res) => {
        if (!req.session?.user) {
            res.status(401).json({
                success: false,
                message: "You must be logged in to view the mod queue",
            });
            return;
        }

        database.methods.GetModQueue(req).then((result: { status: number, response: { success: boolean, message: string } }) => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        route: "/api/v1/mods/queue",
        method: "GET"
    }
}