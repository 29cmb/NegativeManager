import { Express } from "express"
import database from "../../modules/database"

export default (app: Express) => {
    app.get("/api/v1/mods/download_all/:id/:tag", async (req, res) => {
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

        const downloadLinks: {name: string, tag: string, download: string}[] = []
        const downloadFailed: {identifier: string, tag: string}[] = []

        const GetDependencies = async (m: string, r: string) => {
            const dbMod = await database.methods.GetMod(m)
            if(!dbMod) {
                downloadFailed.push({ identifier: `ID ${m}`, tag: r })
                return
            }

            const dbRelease = await database.methods.GetRelease(m, r)
            if(!dbRelease) {
                downloadFailed.push({ identifier: dbMod.name, tag: r })
                return
            }

            for(const dependency of dbRelease.dependencies) {
                if(downloadLinks.some(dl => dl.name === dbMod.name)) {
                    // Prevent recursion
                    downloadFailed.push({ identifier: dbMod.name, tag: r })
                    return
                }

                await GetDependencies(dependency.id, dependency.tag)
            }

            downloadLinks.push({ name: dbMod.name, tag: dbRelease.tag, download: dbRelease.download })
        }

        await GetDependencies(id, tag)

        res.status(200).json({ success: true, downloadLinks, downloadFailed })
    })

    return {
        route: "/api/v1/mods/download_all/:id/:tag",
        method: "GET"
    }
}