import { Express, Request } from 'express';
import database from '../../modules/database';
import { RouteRequest, StrictRouteRequest } from '../../Types';

export default (app: Express) => {
    app.get("/api/v1/mods/queue", async (req: RouteRequest, res) => {
        if (!req.session?.user) {
            res.status(401).json({
                success: false,
                message: "You must be logged in to view the mod queue",
            });
            return;
        }

        database.methods.GetModQueue(req as StrictRouteRequest).then((result: { status: number, response: { success: boolean, message: string } }) => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        route: "/api/v1/mods/queue",
        method: "GET"
    }
}