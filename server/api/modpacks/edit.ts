import { Express } from "express"
import database from "../../modules/database"
import { RouteRequest, StrictRouteRequest } from "../../Types";

export default (app: Express) => {
    app.post("/api/v1/modpacks/edit", async (req: RouteRequest, res) => {
        const { mod, settings } = req.body

        if(
            mod == undefined
            || settings == undefined
            || typeof mod !== "string"
            || typeof settings !== "object"
            || (
                (settings.name === undefined || typeof settings.name !== "string")
                && (settings.description === undefined || typeof settings.description !== "string")
                && (settings.icon === undefined || typeof settings.icon !== "string" || !settings.icon.startsWith("data:image/"))
                && (settings.mods === undefined || !Array.isArray(settings.mods) || settings.mods.some((m: { id: string, tag: string }) => (
                    typeof m !== "object"
                    || m.id === undefined
                    || m.tag === undefined
                    || typeof m.id !== "string"
                    || typeof m.tag !== "string"
                )))
            )
        ) {
            res.status(500).json({ success: false, message: "Required fields not provided or not formatted properly" })
            return
        }

        if (!req.session?.user) {
            res.status(401).json({
                success: false,
                message: "You must be logged in to update a modpack",
            });
            return;
        }
        
        database.methods.ChangeModpackSettings(
            req as StrictRouteRequest,
            mod,
            settings
        ).then((result: { status: number, response: { success: boolean, message: string } }) => {
            res.status(result.status).json(result.response);
        })
    })

    return {
        method: "POST",
        route: "/api/v1/modpacks/settings"
    }
}