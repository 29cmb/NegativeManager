import { Express } from 'express';
import database from '../../modules/database';
import { RouteRequest, StrictRouteRequest } from '../../Types';

// TODO: Test this endpoint, unable to store cookies in postman
export default (app: Express) => {
    app.post("/api/v1/mods/deny", async (req: RouteRequest, res) => {
        const { mod } = req.body;
        if (
            mod === undefined
            || typeof mod !== "string"
        ) {
            res.status(400).json({
                success: false,
                message: "Required fields not provided or not formatted properly",
            });
            return;
        }

        if (!req.session?.user) {
            res.status(401).json({
                success: false,
                message: "You must be logged in to deny a mod",
            });
            return;
        }

        database.methods.ChangeModApprovalStatus(
            req as StrictRouteRequest,
            mod,
            false
        ).then((result: { status: number, response: { success: boolean, message: string } }) => {
            res.status(result.status).json(result.response);
        })
    })
    
    return {
        route: "/api/v1/mods/deny",
        method: "POST",
    }
}