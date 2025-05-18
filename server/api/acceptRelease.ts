import { Express } from 'express';
import database from '../modules/database';
import { RouteRequest, StrictRouteRequest } from '../Types';

// TODO: Test this endpoint, unable to store cookies in postman
export default (app: Express) => {
    app.post("/api/v1/mods/release/accept", async (req: RouteRequest, res) => {
        const { mod, tag } = req.body;
        if (
            mod === undefined
            || tag === undefined
            || typeof mod !== "string"
            || typeof tag !== "string"
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
                message: "You must be logged in to accept a release",
            });
            return;
        }

        database.methods.ChangeModReleaseApprovalStatus(
            req as StrictRouteRequest,
            mod,
            tag,
            true
        ).then((result: { status: number, response: { success: boolean, message: string } }) => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        route: "/api/v1/mods/release/accept",
        method: "POST",
    }
}