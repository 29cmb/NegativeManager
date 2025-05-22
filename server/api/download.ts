import { Express } from "express"
import axios from "axios"
import database from "../modules/database"
import crypto from "crypto"

const visits = {} as {[mod: string]: string[]}

export default (app: Express) => {
    app.get("/api/v1/mods/download/:id/:tag", async (req, res) => {
        const ip = req.ip
        const { id, tag } = req.params

        const mod = await database.methods.GetMod(id)
        if(!mod) {
            res.status(404).json({ success: false, message: "Mod not found" })
            return
        }

        const release = await database.methods.GetRelease(id, tag)
        if(!release) {
            res.status(404).json({ success: false, message: "Release not found" })
            return
        }

        if(mod.approved !== true || release.approved !== true) {
            res.status(403).json({ success: false, message: "Mod or release has not been approved by moderators" })
            return
        }

        if (!visits[id]) visits[id] = [];
        if(!visits[mod._id.toString()].some(value => value === ip) && ip !== undefined) {
            visits[mod._id.toString()].push(ip)
            setTimeout(() => {
                visits[mod._id.toString()].filter(v => v !== ip)
            }, 1000 * 60 * 30)
            
            database.methods.ModDownload(id, tag)
        }

        if (!release.download) {
            res.status(400).json({ success: false, message: "No download URL found for this mod" })
            return
        }

        try {
            await axios.head(release.download, { timeout: 5000 });
        } catch (err) {
            res.status(404).json({ success: false, message: "Download URL is not reachable or does not exist" });
            return;
        }

        let checksum;
        try {
            const response = await axios.get(release.download, { responseType: "arraybuffer" })
            const hash = crypto.createHash('sha256')
            hash.update(response.data)
            checksum = hash.digest('hex')
        } catch (err) {
            res.status(500).json({ success: false, message: "Error calculating checksum" })
            return
        }

        if(checksum !== release.checksum) {
            res.status(422).json({ success: false, message: "Checksum is not valid for file. Owner must update the mod." })
            return
        }

        try {
            const fileResponse = await axios.get(release.download, {
                responseType: "stream",
                validateStatus: status => status >= 200 && status < 300
            })
            res.setHeader("Content-Disposition", `attachment; filename="${mod.name}.zip"`)
            res.setHeader("Content-Type", fileResponse.headers["content-type"] || "application/octet-stream")
            fileResponse.data.pipe(res)
        } catch {
            res.status(502).json({ success: false, message: "Failed to fetch file from source" })
        }
    })

    return {
        method: "GET",
        route: "/api/v1/mods/download/:id/:tag"
    }
}