import { Express, Request, Response } from "express";
import database from "../modules/database";

const githubReleaseSourceRegex = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/archive\/refs\/tags\/(.+?)\.(zip|tar\.gz)$/;

// TODO: Test this endpoint, unable to store cookies in postman
export default (app: Express) => {
    app.post(
        "/api/v1/mods/submit",
        async (
            req: Request & {
                session?: { user?: string };
                body: {
                    name: string;
                    description: string;
                    icon: string;
                    dependancies: string[];
                    github_release_link: string;
                };
            },
            res: Response
        ) => {
            const {
                name,
                description,
                icon,
                dependancies,
                github_release_link,
            } = req.body;

            if (
                name === undefined
                || description === undefined
                || icon === undefined
                || dependancies === undefined
                || github_release_link === undefined
                || typeof name !== "string"
                || typeof description !== "string"
                || typeof icon !== "string"
                || !Array.isArray(dependancies)
                || dependancies.some((dep: any) => typeof dep !== "string")
                || typeof github_release_link !== "string"
                || !githubReleaseSourceRegex.test(github_release_link)
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
                    message: "You must be logged in to submit a mod",
                });
                return;
            }

            database.methods.submit(
                req,
                name,
                description,
                icon,
                dependancies,
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