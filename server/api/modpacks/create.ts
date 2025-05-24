import { Express } from "express"
import { RouteRequest } from "../../Types"
export default (app: Express) => {
    app.post("/api/v1/modpacks/create", (req: RouteRequest, res) => {
        
    })

    return {
        method: "POST",
        route: "/api/v1/modpacks/create"
    }
}