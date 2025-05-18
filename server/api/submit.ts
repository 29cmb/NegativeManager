import { Express, Response } from "express";
import database from "../modules/database";
import { RouteRequest, StrictRouteRequest } from "../Types";

const githubReleaseRegex = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/releases\/tag\/([^\/]+)$/;
const githubSourceRegex = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)(?:\.git)?$/;

export default (app: Express) => {
    app.post(
        "/api/v1/mods/submit",
        async (
            req: RouteRequest,
            res: Response
        ) => {
            const {
                name,
                description,
                icon,
                dependencies,
                source_code,
                github_release_link
            } = req.body;

            if (
                name === undefined
                || description === undefined
                || icon === undefined
                || dependencies === undefined
                || source_code === undefined
                || github_release_link === undefined
                || typeof name !== "string"
                || typeof description !== "string"
                || typeof icon !== "string"
                || typeof source_code !== "string"
                || typeof github_release_link !== "string"
                || !Array.isArray(dependencies)
                || !icon.startsWith("data:image/")
                || dependencies.some((dep: {id: string, tag: string}) => dep.id === undefined || dep.tag === undefined || typeof(dep.id) !== "string" || typeof(dep.tag) !== "string")
                || !githubSourceRegex.test(source_code)
                || !githubReleaseRegex.test(github_release_link)
            ) {
                res.status(400).json({
                    success: false,
                    message: "Required fields not provided or not formatted properly",
                });
                return;
            }

            const releaseMatch = githubReleaseRegex.exec(github_release_link)
            const sourceMatch = githubSourceRegex.exec(source_code)
            if (!releaseMatch || !sourceMatch) {
                res.status(400).json({
                    success: false,
                    message: "Invalid GitHub URLs provided",
                })
                return
            }
            const [, releaseOwner, releaseRepo] = releaseMatch
            const [, sourceOwner, sourceRepo] = sourceMatch
            if (releaseOwner !== sourceOwner || releaseRepo !== sourceRepo) {
                res.status(400).json({
                    success: false,
                    message: "Release and source code must be from the same GitHub repository",
                })
                return
            }

            if (!req.session?.user) {
                res.status(401).json({
                    success: false,
                    message: "You must be logged in to submit a mod",
                });
                return;
            }

            database.methods.submit(
                req as StrictRouteRequest,
                name,
                description,
                icon,
                dependencies as [{ id: string, tag: string }],
                source_code,
                github_release_link
            ).then((result: { status: number; response: { success: boolean; message: string } }) => {
                res.status(result.status).json(result.response);
            })
        }
    );

    return {
        route: "/api/v1/mods/submit",
        method: "POST",
    };
};