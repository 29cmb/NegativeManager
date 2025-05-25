import { Express } from "express"
import database from "../../modules/database"

export default (app: Express) => {
    app.get("/api/v1/mods/search/:query/:page{/:sort}", async (req, res) => {
        const { query, page, sort } = req.params

        const pageNum = parseInt(page)
        if(isNaN(pageNum) || pageNum < 1) {
            res.status(400).json({ success: false, message: "Page isn't a valid number" })
            return
        }

        const sortTypes = ["downloads", "likes"]
        if(sort && !sortTypes.some(v => v === sort)) {
            res.status(400).json({ success: false, message: "Sort type not found (options are downloads and likes)" })
            return
        }

        const result = await database.methods.GetSearch(pageNum, query, sort as "downloads" | "likes" | undefined)
        if(result.success === false) {
            res.status(500).json({ success: false, message: "Mongodb error" })
            return
        }

        res.status(200).json({ success: true, mods: result.mods })
    })

    return {
        method: "GET",
        route: "/api/v1/mods/search/:query"
    }
}