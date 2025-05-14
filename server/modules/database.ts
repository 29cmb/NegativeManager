import { Collection, Db, MongoClient, ServerApiVersion, WithId } from "mongodb";
import { argon2encrypt, argon2verify } from "./encryption";
import { Request } from "express"
import axios from "axios"
import crypto from "crypto"

const uri = `mongodb+srv://${process.env.DATABASEUSER}:${process.env.DATABASEPASS}@${process.env.DATABASEURI}/?retryWrites=true&w=majority&appName=${process.env.DATABASEAPPNAME}`;

const client = new MongoClient(uri as string, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const data = {
    uri,
    client,
    databases: {} as {[key: string]: Db},
    collections: {} as {[key: string]: Collection},
    methods: {} as {[key: string]: Function},
    async init() {
        try {
            await client.connect();

            // database setup
            this.databases.accounts = client.db(process.env.ACCOUNTS_DATABASE || "Accounts");
            this.databases.mods = client.db(process.env.MODS_DATABASE || "Mods");

            // collections setup
            this.collections.users = this.databases.accounts.collection(process.env.USERS_COLLECTION || "Users");
            this.collections.sessions = this.databases.accounts.collection(process.env.SESSIONS_COLLECTION || "Sessions");

            this.collections.catalog = this.databases.mods.collection(process.env.CATALOG_COLLECTION || "Catalog");

            // initialize methods
            this.methods.signup = async (email: string, username: string, password: string): Promise<{status: number, response: {success: boolean, message: string}}> => {
                const existingUser = await this.methods.getUser(username)
                if (existingUser) {
                    return { status: 409, response: { success: false, message: "Username already exists" } };
                }

                await data.collections.users.insertOne({
                    email,
                    username,
                    password: (await argon2encrypt(password)), // don't forget this, pretty important
                    createdAt: Date.now(),
                    verified: false,
                    submission_ban: false,
                    level: 0
                }).catch((err) => {
                    console.error("❌ | Error inserting user into database:", err);
                    return { status: 500, response: { success: false, message: "Error inserting user into database" } };
                })

                return { status: 200, response: { success: true, message: "User created successfully" } };
            }

            this.methods.GetUserFromUsername = async (username: string) => {
                return data.collections.users.findOne({ username });
            }

            this.methods.getUser = async (id: string) => {
                return data.collections.users.findOne({ $id: id });
            }

            this.methods.login = async (req: Request & {session: {user: string}}, username: string, password: string) : Promise<{status: number, response: {success: boolean, message: string}}> => {
                const user = await data.methods.GetUserFromUsername(username);
                if (!user) {
                    return { status: 401, response: { success: false, message: "Invalid username or password" } };
                }

                const passwordMatch = await argon2verify(password, user.password);
                if (!passwordMatch) {
                    return { status: 401, response: { success: false, message: "Invalid username or password" } };
                }

                req.session.user = user.$id
                return { status: 200, response: { success: true, message: "Login successful" } };
            }

            this.methods.submit = async (req: Request & {session: {user: string}}, name: string, description: string, icon: string, dependencies: string[], source_code: string, github_release_link: string) : Promise<{status: number, response: {success: boolean, message: string}}> => {
                const existingMod = await this.collections.catalog.findOne({ name, author: req.session.user })
                if(existingMod) {
                    return { status: 409, response: { success: false, message: "You already have a mod of the same name" } };
                }

                const user = await this.methods.getUser(req.session.user);
                if(!user || user.submission_ban) {
                    return { status: 401, response: { success: false, message: "You are banned from submitting mods" } };
                }

                dependencies.forEach(dep => {
                    const mod = this.collections.catalog.findOne({ $id: dep });
                    if(!mod) {
                        return { status: 400, response: { success: false, message: "Invalid dependency table" } };
                    }
                })

                const match = github_release_link.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/releases\/tag\/([^\/]+)$/);

                if (!match) {
                    return { status: 400, response: { success: false, message: "Invalid GitHub release link" } };
                }
                
                const [_, owner, repo, tag] = match;

                if(!tag) {
                    return { status: 400, response: { success: false, message: "Invalid GitHub release link" } };
                }

                var releaseInfo: any;

                await axios.get(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
                    headers: { "Accept": "application/vnd.github+json" }
                }).then((response) => {
                    releaseInfo = response.data;
                }).catch((err) => {
                    switch(err.response.status) {
                        case 404:
                            return { status: 400, response: { success: false, message: "Release not found" } };
                        case 403:
                            return { status: 400, response: { success: false, message: "Rate limit exceeded" } };
                        case 500:
                            return { status: 500, response: { success: false, message: "GitHub API error" } };
                        default:
                            return { status: 500, response: { success: false, message: "Unknown error" } };
                    }
                });

                var checksum;
                await axios.get(releaseInfo.zipball_url, {
                    responseType: "arraybuffer"
                }).then((response) => {
                    const hash = crypto.createHash('sha256');
                    hash.update(response.data);
                    checksum = hash.digest('hex');
                }).catch((err) => {
                    console.error("❌ | Error calculating checksum:", err);
                    return { status: 500, response: { success: false, message: "Error calculating checksum" } };
                })

                // Hey me! Maybe don't forge to write the part of the method that actually inserts the mod into the database? That would be pretty cool, right?
                await this.collections.catalog.insertOne({
                    name,
                    description,
                    icon,
                    dependencies,
                    author: req.session.user,
                    source_code,
                    updateApprovalPending: true,
                    initiallyApproved: false,
                    downloads: 0,
                    favorites: 0,
                    releases: [
                        {
                            name: releaseInfo.name,
                            body: releaseInfo.body,
                            tag: releaseInfo.tag_name,
                            url: releaseInfo.zipball_url,
                            created_at: releaseInfo.published_at,
                            checksum,
                            approved: false
                        }
                    ]
                }).catch((err) => {
                    console.error("❌ | Error inserting mod into database:", err);
                    return { status: 500, response: { success: false, message: "Error inserting mod into database" } };
                })

                return { status: 200, response: { success: true, message: "Mod submitted successfully" } }
            }

            this.methods.ChangeModApprovalStatus = async (req: Request & {session: {user: string}}, id: string, status: boolean) : Promise<{status: number, response: {success: boolean, message: string}}> => {
                const user = this.methods.getUser(req.session.user);
                if(!user || user.level < 1) {
                    return { 
                        status: 403, 
                        response: {
                            success: false,
                            message: "You do not have permission to accept mods",
                        }
                    };
                }

                const mod = await this.collections.catalog.findOne({ $id: id });
                if(!mod) {
                    return { status: 404, response: { success: false, message: "Mod not found" } };
                }

                if(mod.approved === status) {
                    return { status: 409, response: { success: false, message: "Mod already has that approval status" } };
                }

                await this.collections.catalog.updateOne({ $id: id }, { $set: { approved: status } }).catch((err) => {
                    console.error("❌ | Error updating mod approval status:", err);
                    return { status: 500, response: { success: false, message: "Error updating mod approval status" } };
                })

                return { status: 200, response: { success: true, message: "Mod approval status changed successfully" } }
            }

            this.methods.GetModQueue = async (req: Request & {session: {user: string}}) : Promise<{status: number, response: {[key: string]: any}}> => {
                const user = await this.methods.getUser(req.session.user);
                if(!user || user.level < 1) {
                    return { 
                        status: 403, 
                        response: {
                            success: false,
                            message: "You do not have permission to view the mod queue",
                        }
                    };
                }

                const mods = await this.collections.catalog.find({ approved: false }).toArray();
                if(!mods) {
                    return { status: 404, response: { success: false, message: "No mods found" } };
                }

                return { status: 200, response: { success: true, message: "Mod queue retrieved successfully", mods } }
            }

            this.methods.SubmissionBan = async (req: Request & {session: {user: string}}, id: string, status: boolean): Promise<{status: number, response: {success: boolean, message: string}}> => {
                const user = await this.methods.getUser(req.session.user);
                if(!user || user.level < 1) {
                    return { 
                        status: 403, 
                        response: {
                            success: false,
                            message: "You do not have permission to manage the ban status of users",
                        }
                    };
                }

                const targetUser = await this.methods.getUser(id);
                if(!targetUser) {
                    return { status: 404, response: { success: false, message: "User not found" } };
                }

                if(targetUser.level >= user.level) {
                    return { status: 403, response: { success: false, message: "You cannot ban this user" } };
                }

                this.collections.users.updateOne({ $id: id }, { $set: { submission_ban: status } }).catch((err) => {
                    console.error("❌ | Error updating user submission ban status:", err);
                    return { status: 500, response: { success: false, message: "Error updating user submission ban status" } };
                })

                return {
                    status: 200,
                    response: {
                        success: true,
                        message: "User submission ban status changed successfully",
                    }
                }
            }

            await this.databases.accounts.command({ ping: 1 })
            console.log("🏓 | Pinged accounts database")
            await this.databases.mods.command({ ping: 1 })
            console.log("🏓 | Pinged mods database")
            console.log("🚀 | Connected to MongoDB")
        } catch (error) {
            console.error("❌ | Error connecting to MongoDB:", error);
            throw error;
        }
    }
}

export default data;