import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { argon2encrypt, argon2verify } from "./encryption";
import axios from "axios"
import crypto from "crypto"
import { CommentData, Database, ModData, StrictRouteRequest } from "../Types";

const uri = `mongodb+srv://${process.env.DATABASEUSER}:${process.env.DATABASEPASS}@${process.env.DATABASEURI}/?retryWrites=true&w=majority&appName=${process.env.DATABASEAPPNAME}`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const data = {
    uri,
    client,
    databases: {},
    collections: {},
    methods: {},
    async init() {
        try {
            await client.connect();

            // database setup
            this.databases.accounts = client.db(process.env.ACCOUNTS_DATABASE || "Accounts");
            this.databases.mods = client.db(process.env.MODS_DATABASE || "Mods");

            // collections setup
            this.collections.users = this.databases.accounts.collection(process.env.USERS_COLLECTION || "Users");
            this.collections.sessions = this.databases.accounts.collection(process.env.SESSIONS_COLLECTION || "Sessions");
            this.collections.catalog = this.databases.mods.collection<ModData>(process.env.CATALOG_COLLECTION || "Catalog");
            this.collections.comments = this.databases.mods.collection<CommentData>(process.env.COMMENTS_COLLECTION || "Comments")

            // initialize methods
            this.methods.signup = async (email, username, password) => {
                const existingUser = await this.methods.getUser(username)
                if (existingUser) {
                    return { status: 409, response: { success: false, message: "Username already exists" } };
                }

                const pw = await argon2encrypt(password) // don't forget this, pretty important
                if(pw == null) {
                    return { status: 500, response: { success: false, message: "Error hashing password" } }
                }

                await data.collections.users.insertOne({
                    email,
                    username,
                    password: pw,
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

            this.methods.GetUserFromUsername = async (username) => {
                return this.collections.users.findOne({ username });
            }

            this.methods.getUser = async (id) => {
                return this.collections.users.findOne({ _id: new ObjectId(id) });
            }

            this.methods.GetMod = async (id) => {
                try {
                    var oid
                    try {
                        // don't error if the id isn't in the right format
                        oid = new ObjectId(id)
                    } catch(_) {
                        return null
                    } 

                    return this.collections.catalog.findOne({ _id: oid })
                } catch(err) {
                    console.log(`❌ | An error occured in the GetMod method: ${err}`)
                    return null
                }
            }

            this.methods.GetRelease = async (modId, tag) => {
                const mod = await this.methods.GetMod(modId)
                if (!mod || !Array.isArray(mod.releases)) return null;
                return mod.releases.find((release: any) => release.tag === tag) || null;
            }

            this.methods.login = async (req, username, password) => {
                const user = await data.methods.GetUserFromUsername(username);
                if (!user) {
                    return { status: 401, response: { success: false, message: "Invalid username or password" } };
                }

                const passwordMatch = await argon2verify(password, user.password);
                if (!passwordMatch) {
                    return { status: 401, response: { success: false, message: "Invalid username or password" } };
                }

                req.session.user = user._id.toString()
                return { status: 200, response: { success: true, message: "Login successful" } };
            }

            this.methods.submit = async (req, name, description, icon, dependencies, source_code, github_release_link) => {
                try {
                    const existingMod = await this.collections.catalog.findOne({ name, author: req.session.user })
                    if(existingMod) {
                        return { status: 409, response: { success: false, message: "You already have a mod of the same name" } }
                    }

                    const user = await this.methods.getUser(req.session.user)
                    if(!user || user.submission_ban) {
                        return { status: 401, response: { success: false, message: "You are banned from submitting mods" } }
                    }

                    for (const dep of dependencies) {
                        const mod = await this.methods.GetMod(dep.id);
                        if(!mod) {
                            return { status: 404, response: { success: false, message: `Could not find mod ${dep.id} from the dependency table` } }
                        }

                        const release = await this.methods.GetRelease(dep.id, dep.tag)
                        if(!release) {
                            return { status: 404, response: { success: false, message: `Could not find release ${dep.tag} under mod ${dep.id} from the dependency table` } }
                        }
                    }

                    const match = github_release_link.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/releases\/tag\/([^\/]+)$/)
                    if (!match) {
                        return { status: 400, response: { success: false, message: "Invalid GitHub release link" } }
                    }

                    const [_, owner, repo, tag] = match
                    if(!tag) {
                        return { status: 400, response: { success: false, message: "Invalid GitHub release link" } }
                    }

                    let releaseInfo;
                    try {
                        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
                            headers: { "Accept": "application/vnd.github+json" }
                        });
                        releaseInfo = response.data
                    } catch (err: any) {
                        switch(err?.response?.status) {
                            case 404:
                                return { status: 400, response: { success: false, message: "Release not found" } }
                            case 403:
                                return { status: 400, response: { success: false, message: "Rate limit exceeded" } }
                            case 500:
                                return { status: 500, response: { success: false, message: "GitHub API error" } }
                            default:
                                return { status: 500, response: { success: false, message: "Unknown error" } }
                        }
                    }

                    let checksum;
                    try {
                        const response = await axios.get(releaseInfo.zipball_url, { responseType: "arraybuffer" })
                        const hash = crypto.createHash('sha256')
                        hash.update(response.data)
                        checksum = hash.digest('hex')
                    } catch (err) {
                        console.error("❌ | Error calculating checksum:", err)
                        return { status: 500, response: { success: false, message: "Error calculating checksum" } }
                    }

                    // Hey me! Maybe don't forget to write the part of the method that actually inserts the mod into the database? That would be pretty cool, right?
                    await this.collections.catalog.insertOne({
                        name,
                        description,
                        icon,
                        author: req.session.user,
                        source_code,
                        updateApprovalPending: true,
                        approved: false,
                        reviewed: false,
                        moderationReason: null,
                        archived: false,
                        downloads: 0,
                        favorites: 0,
                        releases: [
                            {
                                name: releaseInfo.name,
                                body: releaseInfo.body,
                                tag: releaseInfo.tag_name,
                                url: github_release_link,
                                download: releaseInfo.zipball_url,
                                dependencies,
                                created_at: releaseInfo.published_at,
                                checksum,
                                approved: false,
                                reviewed: false,
                                moderationReason: null
                            }
                        ]
                    });

                    return { status: 200, response: { success: true, message: "Mod submitted successfully" } };
                } catch (err) {
                    console.error("❌ | Error in submit method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.ChangeModApprovalStatus = async (req, id, status, reason) => {
                try {
                    const user = await this.methods.getUser(req.session.user);
                    if(!user || user.level < 1) {
                        return { 
                            status: 403, 
                            response: {
                                success: false,
                                message: "You do not have permission to accept mods",
                            }
                        };
                    }

                    const mod = await this.methods.GetMod(id)
                    if(!mod) {
                        return { status: 404, response: { success: false, message: "Mod not found" } };
                    }

                    // Hey guys! Quick tip! When you rework functions, add the funtionality to the rework!!!
                    await this.collections.catalog.updateOne({ _id: new ObjectId(id) }, {
                        $set: { approved: status, reviewed: true, moderationReason: reason || null }
                    })

                    return { status: 200, response: { success: true, message: "Mod approval status changed" } }
                } catch (err) {
                    console.error("❌ | Error in ChangeModApprovalStatus method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.ChangeModReleaseApprovalStatus = async (req, id, tag, status, reason?) => {
                try {
                    const user = await this.methods.getUser(req.session.user);
                    if(!user || user.level < 1) {
                        return { 
                            status: 403, 
                            response: {
                                success: false,
                                message: "You do not have permission to accept mods",
                            }
                        };
                    }

                    const mod = await this.methods.GetMod(id)
                    if(!mod) {
                        return { status: 404, response: { success: false, message: "Mod not found" } };
                    }

                    // if(mod.approved === status) {
                    //     return { status: 409, response: { success: false, message: "Mod already has that approval status" } };
                    // }

                    // await this.collections.catalog.updateOne({ $id: id }, { $set: { approved: status } }).catch((err) => {
                    //     console.error("❌ | Error updating mod approval status:", err);
                    //     return { status: 500, response: { success: false, message: "Error updating mod approval status" } };
                    // })

                    const release = mod.releases.find((release: any) => release.tag === tag);
                    if(!release) {
                        return { status: 404, response: { success: false, message: "Release not found" } };
                    }

                    if(release.approved === status) {
                        return { status: 409, response: { success: false, message: "Release already has that approval status" } };
                    }

                    await this.collections.catalog.findOneAndUpdate(
                        { _id: new ObjectId(id), "releases.tag": tag }, 
                        { $set: { 
                            "releases.$.approved": status, 
                            "releases.$.reviewed": true, 
                            "releases.$.moderationReason": reason || null
                        } }
                    )

                    const result = await this.methods.GetMod(id)
                    if(!result) {
                        console.error("❌ | Error updating release tag")
                        return { status: 500, response: { success: false, message: "Error updating mod approval status" } };
                    }

                    await this.collections.catalog.updateOne(
                        { _id: new ObjectId(id) },
                        { $set: 
                            { 
                                updateApprovalPending: result.releases.some((release: {approved: boolean}) => release.approved === false)
                            }
                        }
                    )

                    return { status: 200, response: { success: true, message: "Mod approval status changed successfully" } }
                } catch (err) {
                    console.error("❌ | Error in ChangeModReleaseApprovalStatus method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.GetModQueue = async (req) => {
                try {
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
    
                    const mods = await this.collections.catalog.find({ updateApprovalPending: true, $or: [{ modApproved: false }] }).toArray();
                    if(!mods) {
                        return { status: 404, response: { success: false, message: "No mods found" } };
                    }
    
                    return { status: 200, response: { success: true, message: "Mod queue retrieved successfully", mods } }
                } catch(err) {
                    console.error("❌ | Error in GetModQueue method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.SubmissionBan = async (req, id, status) => {
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

                return await this.collections.users.updateOne({ _id: new ObjectId(id) }, { $set: { submission_ban: status } }).then(() => {
                    return {
                        status: 200,
                        response: {
                            success: true,
                            message: "User submission ban status changed successfully",
                        }
                    }
                }).catch((err) => {
                    console.error("❌ | Error updating user submission ban status:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                })
            }

            this.methods.ChangeModSettings = async (
                req,
                modId, 
                settings
            ) => {
                try {
                    const user = await this.methods.getUser(req.session.user);
                    if(!user) {
                        return { 
                            status: 401,
                            response: {
                                success: false,
                                message: "You must be logged in to change mod settings",
                            }
                        };
                    }
    
                    const mod = await this.methods.GetMod(modId)
                    if(!mod) {
                        return {
                            status: 404,
                            response: {
                                success: false,
                                message: "Mod not found"       
                            }
                        }
                    }
    
                    // Maybe add collaborators in the future, idk
                    if(mod.author !== req.session.user && user.level < 1) {
                        return {
                            status: 403,
                            response: {
                                success: false,
                                message: "You do not have permission to edit this mod!"
                            }
                        }
                    }
    
                    const allowedFields = [
                        "name",
                        "description",
                        "icon"
                    ]
    
                    await this.collections.catalog.updateOne({ _id: new ObjectId(modId) }, {
                        $set: {
                            ...(Object.fromEntries(
                                Object.entries(settings).filter(([key]) => allowedFields.includes(key))
                            )),
                            approved: false,
                            reviewed: false
                        }
                    })

                    return {
                        status: 200,
                        response: {
                            success: true,
                            message: "Mod settings updated successfully",
                        }
                    }
                } catch(err) {
                    console.error("❌ | Error in ChangeModSettings method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.UpdateReleaseSettings = async (
                req,
                modId,
                tag 
            ) => {
                try {
                    const mod = await this.methods.GetMod(modId)
                    if(!mod) {
                        return { status: 404, response: { success: false, message: "Mod not found" } }
                    }

                    const release = await this.methods.GetRelease(modId, tag)
                    if(!release) {
                        return { status: 404, response: { success: false, message: "Release not found" } }
                    }

                    const user = await this.methods.getUser(req.session.user)
                    if(!user) {
                        return { status: 401, response: { success: false, message: "You must be logged in to update release settings" } }
                    }

                    if(mod.author !== user._id.toString() && user.level < 1) {
                        return {
                            status: 403,
                            response: {
                                success: false,
                                message: "You do not have permission to edit this release!"
                            }
                        }
                    }

                    const match = release.url.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/releases\/tag\/([^\/]+)$/)
                    if (!match) {
                        return { status: 400, response: { success: false, message: "Invalid GitHub release link" } }
                    }

                    const [, owner, repo] = match
                    if(!tag) {
                        return { status: 400, response: { success: false, message: "Invalid GitHub release link" } }
                    }

                    let releaseInfo;
                    try {
                        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
                            headers: { "Accept": "application/vnd.github+json" }
                        });
                        releaseInfo = response.data
                    } catch (err: any) {
                        switch(err?.response?.status) {
                            case 404:
                                return { status: 404, response: { success: false, message: "Release not found" } }
                            case 403:
                                return { status: 429, response: { success: false, message: "Rate limit exceeded" } }
                            case 500:
                                return { status: 500, response: { success: false, message: "GitHub API error" } }
                            default:
                                return { status: 500, response: { success: false, message: "Unknown error" } }
                        }
                    }

                    let checksum;
                    try {
                        const response = await axios.get(releaseInfo.zipball_url, { responseType: "arraybuffer" })
                        const hash = crypto.createHash('sha256')
                        hash.update(response.data)
                        checksum = hash.digest('hex')
                    } catch (err) {
                        console.error("❌ | Error calculating checksum:", err)
                        return { status: 500, response: { success: false, message: "Error calculating checksum" } }
                    }

                    await this.collections.catalog.updateOne(
                        { _id: new ObjectId(modId), "releases.tag": tag },
                        {
                            $set: {
                                "releases.$.name": releaseInfo.name,
                                "releases.$.body": releaseInfo.body,
                                "releases.$.checksum": checksum,
                                "releases.$.reviewed": false,
                                "releases.$.approved": false
                            }
                        }
                    );

                    return { status: 200, response: { success: true, message: "Release updated successfully" } }
                } catch(err) {
                    console.error("❌ | Error in UpdateReleaseSettings method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.ArchiveMod = async (req: StrictRouteRequest, id: string) => {
                try {
                    const mod = await this.methods.GetMod(id)
                    if(!mod) {
                        return { status: 404, response: { success: false, message: "Mod not found" } }
                    }

                    const user = await this.methods.getUser(req.session.user)
                    if(!user || (mod.author !== user._id.toString() && user.level < 1)) {
                        return { status: 403, response: { success: false, message: "You do not have permission to archive this mod" } }
                    }

                    await this.collections.catalog.updateOne({ _id: new ObjectId(id) }, {$set: { archived: true }})
                    return { status: 200, response: { success: true, message: "Mod archived successfully"}}
                } catch(err) {
                    console.error("❌ | Error in ArchiveMod method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.ModDownload = async (id: string, tag: string) => {
                const mod = await this.methods.GetMod(id)
                if(!mod) return

                const release = await this.methods.GetRelease(id, tag)
                if(!release) return

                await this.collections.catalog.updateOne(
                    { _id: new ObjectId(id), "releases.tag": tag },
                    { $inc: { "releases.$.downloads": 1 }}
                );
            }

            // im far too lazy to do all this
            // thanks copilot
            // how the hell do you do search queries

            this.methods.GetSearch = async (page: number, query?: string, sorting?: "downloads" | "favorites") => {
                try {
                    const PAGE_SIZE = 20;
                    const filter: any = { archived: { $ne: true }, approved: true };
    
                    let mods;
                    switch(sorting) {
                        case "favorites":
                            mods = await this.collections.catalog.aggregate([
                                { $match: filter },
                                { $sort: { favorites: -1 } },
                                { $skip: (page - 1) * PAGE_SIZE },
                                { $limit: PAGE_SIZE }
                            ]).toArray();
                        default: {
                            mods = await this.collections.catalog.aggregate([
                                { $match: filter },
                                { $sort: { downloads: -1 } },
                                { $skip: (page - 1) * PAGE_SIZE },
                                { $limit: PAGE_SIZE }
                            ]).toArray();
                        }
                    }
    
                    return {
                        success: true,
                        mods
                    };
                } catch(err) {
                    console.error("❌ | Error in GetSearch method:", err);
                    return {
                        success: false
                    }
                }
            }

            this.methods.Comment = async(req: StrictRouteRequest, mod: string, comment: string) => {
                try {
                    const dbMod = await this.methods.GetMod(mod)
                    if(!dbMod) {
                        return { status: 404, response: { success: false, message: "Mod not found" } }
                    }

                    const user = await this.methods.getUser(req.session.user)
                    if(!user) {
                        return { status: 401, response: { success: false, message: "You must be logged in to submit a comment" } }
                    }

                    await this.collections.comments.insertOne({
                        author: user._id.toString(),
                        mod: dbMod._id.toString(),
                        content: comment,
                        created_at: Date.now()
                    })

                    return { status: 200, response: { success: true, message: "Comment posted successfully" } }
                } catch (err) {
                    console.error("❌ | Error in Comment method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
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
} as Database

export default data;