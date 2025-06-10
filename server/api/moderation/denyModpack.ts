import { Express } from 'express';
import database from '../../modules/database';
import { RouteRequest, StrictRouteRequest } from '../../Types';

// TODO: Test this endpoint, unable to store cookies in postman
export default (app: Express) => {
    app.post("/api/v1/modpacks/deny", async (req: RouteRequest, res) => {
        const { modpack } = req.body;
        if (
            modpack === undefined 
            || typeof modpack !== "string"
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
                message: "You must be logged in to deny a modpack",
            });
            return;
        }

        database.methods.ChangeModpackApprovalStatus(
            req as StrictRouteRequest,
            modpack,
            false
        ).then((result: { status: number, response: { success: boolean, message: string } }) => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        route: "/api/v1/modpacks/deny",
        method: "POST",
    }
}