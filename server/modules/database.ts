import { AggregateOptions, MongoClient, ObjectId, ServerApiVersion, WithId } from "mongodb";
import { argon2encrypt, argon2verify } from "./encryption";
import axios from "axios"
import crypto from "crypto"
import { CommentData, Database, ModData, ModpackData, PublicModData, PublicModpackData, PublicReleaseData, ReleaseData, StrictRouteRequest, UserData } from "../Types";

const uri = `mongodb+srv://${process.env.DATABASEUSER}:${process.env.DATABASEPASS}@${process.env.DATABASEURI}/?retryWrites=true&w=majority&appName=${process.env.DATABASEAPPNAME}`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1
    }
});

const modDownloads = {} as {[mod: string]: string[]}
const modpackDownloads = {} as {[mod: string]: string[]}

const data = {
    uri,
    client,
    databases: {},
    collections: { accounts: {}, mods: {}, modpacks: {} },
    methods: {},
    async init() {
        try {
            await client.connect();

            // database setup
            this.databases.accounts = client.db(process.env.ACCOUNTS_DATABASE || "Accounts");
            this.databases.mods = client.db(process.env.MODS_DATABASE || "Mods");
            this.databases.modpacks = client.db(process.env.MODPACKS_DATABASE || "Modpacks")

            // collections setup
            this.collections.accounts.users = this.databases.accounts.collection<UserData>(process.env.USERS_COLLECTION || "Users");
            this.collections.accounts.sessions = this.databases.accounts.collection(process.env.SESSIONS_COLLECTION || "Sessions");

            this.collections.mods.catalog = this.databases.mods.collection<ModData>(process.env.MODS_CATALOG_COLLECTION || "Catalog");
            this.collections.mods.comments = this.databases.mods.collection<CommentData>(process.env.MODS_COMMENTS_COLLECTION || "Comments")

            this.collections.modpacks.catalog = this.databases.modpacks.collection<ModpackData>(process.env.MODPACKS_CATALOG_COLLECTION || "Catalog")
            this.collections.modpacks.comments = this.databases.modpacks.collection(process.env.MODPACKS_COMMENTS_COLLECTION || "Comments")

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

                await this.collections.accounts.users.insertOne({
                    email,
                    username,
                    password: pw,
                    createdAt: Date.now(),
                    verified: false,
                    submission_ban: false,
                    level: 0,
                    likedMods: [],
                    likedModpacks: []
                }).catch((err) => {
                    console.error("❌ | Error inserting user into database:", err);
                    return { status: 500, response: { success: false, message: "Error inserting user into database" } };
                })

                return { status: 200, response: { success: true, message: "User created successfully" } };
            }

            this.methods.GetUserFromUsername = async (username) => {
                return this.collections.accounts.users.findOne({ username });
            }

            this.methods.getUser = async (id) => {
                try {
                    var oid
                    try {
                        // don't error if the id isn't in the right format
                        oid = new ObjectId(id)
                    } catch(_) {
                        return null
                    } 
        
                    return this.collections.accounts.users.findOne({ _id: oid });
                } catch(err) {
                    console.log(`❌ | An error occured in the GetMod method: ${err}`)
                    return null
                }
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

                    return this.collections.mods.catalog.findOne({ _id: oid })
                } catch(err) {
                    console.log(`❌ | An error occured in the GetMod method: ${err}`)
                    return null
                }
            }

            this.methods.GetPublicMod = async (id) => {
                try {
                    const mod = await this.methods.GetMod(id) as WithId<Document & PublicModData> | null
                    if(mod == null) {
                        return null
                    }
            
                    delete mod.approved;
                    delete mod.reviewed;
                    delete mod.moderationReason;
                    delete mod.updateApprovalPending;

                    if (Array.isArray(mod.releases)) {
                        for (const release of mod.releases) {
                            delete release.approved;
                            delete release.reviewed;
                            delete release.moderationReason;
                        }
                    }

                    const author = await this.methods.getUser(mod.author)
                    if(author == null) {
                        (mod.author as unknown as { id: string | null, name: string }) = { id: null, name: "Unknown user" }
                    } else {
                        (mod.author as unknown as { id: string | null, name: string }) = {id: author?._id.toString(), name: author?.username }
                    }
            
                    return mod;
            
                } catch(err) {
                    console.log(`❌ | An error occured in the GetPublicMod method: ${err}`)
                    return null
                }
            }

            this.methods.GetRelease = async (modId, tag) => {
                const mod = await this.methods.GetMod(modId)
                if (!mod || !Array.isArray(mod.releases)) return null;
                return mod.releases.find((release: any) => release.tag === tag) || null;
            }

            this.methods.GetPublicRelease = async (modId, tag) => {
                const mod = await this.methods.GetMod(modId)
                if (!mod || !Array.isArray(mod.releases)) return null;
                const release: PublicReleaseData = mod.releases.find((release: any) => release.tag === tag) as unknown as PublicReleaseData
                if(release == null) return null

                delete release.approved;
                delete release.reviewed;
                delete release.moderationReason;

                return release;
            }

            this.methods.GetModpack = async(modpackId: string) => {
                try {
                    var oid
                    try {
                        oid = new ObjectId(modpackId)
                    } catch(_) {
                        return null
                    } 

                    return this.collections.modpacks.catalog.findOne({ _id: oid })
                } catch(err) {
                    console.log(`❌ | An error occured in the GetModpack method: ${err}`)
                    return null
                }
            }

            this.methods.GetPublicModpack = async (id) => {
                try {
                    var modpack = await this.methods.GetModpack(id) as WithId<Document & PublicModpackData> | null
                    if(modpack == null) {
                        return null
                    }
            
                    delete modpack.approved;
                    delete modpack.reviewed;
                    delete modpack.moderationReason;

                    const author = await this.methods.getUser(modpack.author)
                    if(author == null) {
                        (modpack.author as unknown as { id: string | null, name: string }) = { id: null, name: "Unknown user" }
                    } else {
                        (modpack.author as unknown as { id: string | null, name: string }) = {id: author?._id.toString(), name: author?.username }
                    }

                    for (var mod of modpack.mods) {
                        const dbMod = await this.methods.GetPublicMod(mod.id) as unknown as Omit<PublicModData, 'releases'> & {releases?: [PublicReleaseData]}
                        if(!dbMod) continue;

                        delete dbMod.releases;

                        const release = await this.methods.GetPublicRelease(mod.id, mod.tag)
                        if(release == null) continue;
                        dbMod.releases = [release]
                    }

                    return modpack;
            
                } catch(err) {
                    console.log(`❌ | An error occured in the GetPublicModpack method: ${err}`)
                    return null
                }
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
                    const existingMod = await this.collections.mods.catalog.findOne({ name, author: req.session.user })
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
                    await this.collections.mods.catalog.insertOne({
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
                        likes: 0,
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
                                message: "You do not have permission to change the approval status of mods",
                            }
                        };
                    }

                    const mod = await this.methods.GetMod(id)
                    if(!mod) {
                        return { status: 404, response: { success: false, message: "Mod not found" } };
                    }

                    // Hey guys! Quick tip! When you rework functions, add the funtionality to the rework!!!
                    await this.collections.mods.catalog.updateOne({ _id: new ObjectId(id) }, {
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

                    // await this.collections.mods.catalog.updateOne({ $id: id }, { $set: { approved: status } }).catch((err) => {
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

                    await this.collections.mods.catalog.findOneAndUpdate(
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

                    await this.collections.mods.catalog.updateOne(
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
    
                    const mods = await this.collections.mods.catalog.find({ updateApprovalPending: true, $or: [{ modApproved: false }] }).toArray();
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

                return await this.collections.accounts.users.updateOne({ _id: new ObjectId(id) }, { $set: { submission_ban: status } }).then(() => {
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
    
                    await this.collections.mods.catalog.updateOne({ _id: new ObjectId(modId) }, {
                        $set: {
                            ...(Object.fromEntries(
                                Object.entries(settings).filter(([key]) => allowedFields.includes(key))
                            )),
                            approved: false,
                            reviewed: false,
                            moderationReason: null
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

                    await this.collections.mods.catalog.updateOne(
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

                    await this.collections.mods.catalog.updateOne({ _id: new ObjectId(id) }, {$set: { archived: true }})
                    return { status: 200, response: { success: true, message: "Mod archived successfully"}}
                } catch(err) {
                    console.error("❌ | Error in ArchiveMod method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.ModDownload = async (ip: string, id: string, tag: string) => {
                const mod = await this.methods.GetMod(id)
                if(!mod) return
                
                const release = await this.methods.GetRelease(id, tag)
                if(!release) return

                if (!modDownloads[id]) modDownloads[id] = [];
                if(!modDownloads[mod._id.toString()].some(value => value === ip) && ip !== undefined) {
                    modDownloads[mod._id.toString()].push(ip)
                    setTimeout(() => {
                        modDownloads[mod._id.toString()].filter(v => v !== ip)
                    }, 1000 * 60 * 30)

                    await this.collections.mods.catalog.updateOne(
                        { _id: new ObjectId(id), "releases.tag": tag },
                        { $inc: { "releases.$.downloads": 1 }}
                    );
                }
            }

            // im far too lazy to do all this
            // thanks copilot
            // how the hell do you do search queries

            this.methods.GetSearch = async (page: number, query?: string, sorting?: "downloads" | "likes") => {
                try {
                    const PAGE_SIZE = 20; 
                    const search = [
                        { $match: { approved: true } },
                        { $sort: { [sorting || "downloads"]: -1 } },
                        { $skip: (page - 1) * PAGE_SIZE },
                        { $limit: PAGE_SIZE }
                    ] as any
                    
                    if (query && query.trim().length > 0) {
                        search.splice(0, 0, { $search: {
                            index: "default",
                            autocomplete: {
                                query,
                                path: "name"
                            }
                        }})
                    }

                    const mods = await this.collections.mods.catalog.aggregate(search).toArray()
                    for (const mod of mods) {
                        // thanks copilot! I have absolutely no idea what a delete statement is or does! :D
                        delete mod.approved;
                        delete mod.reviewed;
                        delete mod.moderationReason;
                        delete mod.updateApprovalPending;

                        if (Array.isArray(mod.releases)) {
                            for (const release of mod.releases) {
                                delete release.approved;
                                delete release.reviewed;
                                delete release.moderationReason;
                            }
                        }
                    }

                    return {
                        success: true,
                        mods
                    }
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

                    await this.collections.mods.comments.insertOne({
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

            this.methods.GetModComments = async(mod: string) => {
                try {
                    const comments = await this.collections.mods.comments.find({ mod }).toArray()
                    return { status: 200, response: { success: true, comments }}
                } catch (err) {
                    console.error("❌ | Error in GetModComments method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.ChangeModLikeStatus = async(req: StrictRouteRequest, mod: string, status: boolean) => {
                try {
                    const dbMod = await this.methods.GetMod(mod)
                    if(!dbMod) {
                        return { status: 404, response: { success: false, message: "Mod not found" } }
                    }

                    const user = await this.methods.getUser(req.session.user)
                    if(!user) {
                        return { status: 401, response: { success: false, message: "You must be logged in to change mod like status" } }
                    }

                    const modIdStr = dbMod._id.toString();
                    const alreadyLiked = user.likedMods.includes(modIdStr);

                    if (
                        (status === true && alreadyLiked) ||
                        (status === false && !alreadyLiked)
                    ) {
                        return { status: 409, response: { success: false, message: `Like status is already ${status}` } }
                    }

                    await this.collections.accounts.users.updateOne(
                        { _id: user._id },
                        status ? { $push: { likedMods: modIdStr } } : { $pull: { likedMods: modIdStr } }
                    );

                    await this.collections.mods.catalog.updateOne(
                        { _id: dbMod._id },
                        { $inc: { likes: (status ? 1 : -1) } }
                    );

                    return { status: 200, response: { success: true, message: `Mod like status changed successfully` }}
                } catch (err) {
                    console.error("❌ | Error in ChangeModLikeStatus method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.GetDependencies = async (mod: string, tag: string) => {
                try {
                    const dbMod = await this.methods.GetMod(mod)
                    if(!dbMod) {
                        return { status: 404, response: { success: false, message: "Mod not found" } }
                    }

                    const release = await this.methods.GetRelease(mod, tag)
                    if(!release) {
                        return { status: 404, response: { success: false, message: "Release not found" } }
                    }
                    
                    const dependencies: any[] = []
                    release.dependencies.forEach(async (dependency) => {
                        const depMod = await this.methods.GetMod(dependency.id) as any
                        if(!depMod) return // just ignore them
                        
                        const release = await this.methods.GetRelease(dependency.id, dependency.tag)
                        if(!release) return // hmm I wonder what we're doing here

                        depMod.releases = undefined
                        depMod.releaseInfo = release

                        dependencies.push(depMod)
                    })

                    return { status: 200, response: { success: true, dependencies } }
                } catch(err) {
                    console.error("❌ | Error in GetDependencies method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.CreateModpack = async(req: StrictRouteRequest, name: string, description: string, icon: string, mods: [{ id: string, tag: string }]) => {
                try {
                    const existingModpack = await this.collections.modpacks.catalog.findOne({ author: req.session.user, name })
                    if(existingModpack) {
                        return { status: 409, response: { success: false, message: "You already have a modpack with this name" } }
                    }

                    for(const mod of mods) {
                        const dbMod = await this.methods.GetMod(mod.id)
                        if(!dbMod) {
                            return { status: 404, response: { success: false, message: `Mod with id ${mod.id} does not exist` } }
                        }

                        const release = await this.methods.GetRelease(mod.id, mod.tag)
                        if(!release) {
                            return { status: 404, response: { success: false, message: `Mod with id ${mod.id} does not have a release with a tag ${mod.tag}` } }
                        }
                    }

                    await this.collections.modpacks.catalog.insertOne({ 
                        name,
                        description,
                        author: req.session.user,
                        icon,
                        mods,
                        downloads: 0,
                        likes: 0,
                        approved: false,
                        reviewed: false,
                        moderationReason: null
                    })

                    return { status: 200, response: { success: true, message: "Modpack submitted successfully" } }
                } catch(err) {
                    console.error("❌ | Error in CreateModpack method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.ChangeModpackApprovalStatus = async (req, id, status, reason) => {
                try {
                    const user = await this.methods.getUser(req.session.user);
                    if(!user || user.level < 1) {
                        return { 
                            status: 403, 
                            response: {
                                success: false,
                                message: "You do not have permission to change the approval status of modpacks",
                            }
                        };
                    }

                    const modpack = await this.methods.GetModpack(id)
                    if(!modpack) {
                        return { status: 404, response: { success: false, message: "Modpack not found" } };
                    }

                    await this.collections.modpacks.catalog.updateOne({ _id: new ObjectId(id) }, {
                        $set: { approved: status, reviewed: true, moderationReason: reason || null }
                    })

                    return { status: 200, response: { success: true, message: "Modpack approval status changed" } }
                } catch (err) {
                    console.error("❌ | Error in ChangeModApprovalStatus method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.ModpackDownload = async(ip: string | undefined, id: string) => {
                const modpack = await this.methods.GetMod(id)
                if(!modpack) return

                if(!modpackDownloads[id]) modpackDownloads[id] = [];
                if(!modpackDownloads[id].some(value => value === ip) && ip !== undefined) {
                    modpackDownloads[id].push(ip)
                    setTimeout(() => {
                        modpackDownloads[id] = modpackDownloads[id].filter(v => v !== ip)
                    }, 1000 * 60 * 30)
                    
                    await this.collections.modpacks.catalog.updateOne({ $id: new ObjectId(id) }, {$inc: { downloads: 1 }})
                }
            }

            this.methods.GetModpackSearch = async (page: number, query?: string, sorting?: "downloads" | "likes") => {
                try {
                    const PAGE_SIZE = 20; 
                    const search = [
                        { $match: { approved: true } },
                        { $sort: { [sorting || "downloads"]: -1 } },
                        { $skip: (page - 1) * PAGE_SIZE },
                        { $limit: PAGE_SIZE },
                        { $project: { approved: 0, reviewed: 0, moderationReason: 0 } }
                    ] as any
                    
                    if (query && query.trim().length > 0) {
                        search.splice(0, 0, { $search: {
                            index: "default",
                            autocomplete: {
                                query,
                                path: "name"
                            }
                        }})
                    }

                    const modpacks = await this.collections.modpacks.catalog.aggregate(search).toArray()

                    return {
                        success: true,
                        modpacks
                    }
                } catch(err) {
                    console.error("❌ | Error in GetSearch method:", err);
                    return {
                        success: false
                    }
                }
            }

            this.methods.ModpackComment = async(req: StrictRouteRequest, modpack: string, comment: string) => {
                try {
                    const dbModpack = await this.methods.GetMod(modpack)
                    if(!dbModpack) {
                        return { status: 404, response: { success: false, message: "Mod not found" } }
                    }

                    const user = await this.methods.getUser(req.session.user)
                    if(!user) {
                        return { status: 401, response: { success: false, message: "You must be logged in to submit a comment" } }
                    } 

                    await this.collections.modpacks.comments.insertOne({
                        author: user._id.toString(),
                        modpack: dbModpack._id.toString(),
                        content: comment,
                        created_at: Date.now()
                    })

                    return { status: 200, response: { success: true, message: "Comment posted successfully" } }
                } catch (err) {
                    console.error("❌ | Error in Comment method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.GetModpackComments = async (modpack: string) => {
                try {
                    const comments = await this.collections.modpacks.comments.find({ modpack }).toArray()
                    return { status: 200, response: { success: true, comments }}
                } catch (err) {
                    console.error("❌ | Error in GetModpackComments method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.ChangeModpackLikeStatus = async(req: StrictRouteRequest, mod: string, status: boolean) => {
                try {
                    const dbModpack = await this.methods.GetModpack(mod)
                    if(!dbModpack) {
                        return { status: 404, response: { success: false, message: "Mod not found" } }
                    }

                    const user = await this.methods.getUser(req.session.user)
                    if(!user) {
                        return { status: 401, response: { success: false, message: "You must be logged in to change mod like status" } }
                    }

                    const modpackIdStr = dbModpack._id.toString();
                    const alreadyLiked = user.likedModpacks.includes(modpackIdStr);

                    if (
                        (status === true && alreadyLiked) ||
                        (status === false && !alreadyLiked)
                    ) {
                        return { status: 409, response: { success: false, message: `Like status is already ${status}` } }
                    }

                    await this.collections.accounts.users.updateOne(
                        { _id: user._id },
                        status ? { $push: { likedModpacks: modpackIdStr } } : { $pull: { likedModpacks: modpackIdStr } }
                    );

                    await this.collections.modpacks.catalog.updateOne(
                        { _id: dbModpack._id },
                        { $inc: { likes: (status ? 1 : -1) } }
                    );

                    return { status: 200, response: { success: true, message: `Mod like status changed successfully` }}
                } catch (err) {
                    console.error("❌ | Error in ChangeModLikeStatus method:", err);
                    return { status: 500, response: { success: false, message: "Internal server error" } };
                }
            }

            this.methods.ChangeModpackSettings = async (
                req: StrictRouteRequest,
                modpackId: string, 
                settings: { name?: string, description?: string, icon?: string, mods?: [{id: string, tag: string}] }
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
    
                    const modpack = await this.methods.GetModpack(modpackId)
                    if(!modpack) {
                        return {
                            status: 404,
                            response: {
                                success: false,
                                message: "Mod not found"       
                            }
                        }
                    }
    
                    // Maybe add collaborators in the future, idk
                    if(modpack.author !== req.session.user && user.level < 1) {
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
                        "icon",
                        "mods"
                    ]
    
                    await this.collections.mods.catalog.updateOne({ _id: new ObjectId(modpackId) }, {
                        $set: {
                            ...(Object.fromEntries(
                                Object.entries(settings).filter(([key]) => allowedFields.includes(key))
                            )),
                            approved: false,
                            reviewed: false,
                            moderationReason: null
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

            await this.databases.accounts.command({ ping: 1 })
            console.log("🏓 | Pinged accounts database")
            await this.databases.mods.command({ ping: 1 })
            console.log("🏓 | Pinged mods database")
            await this.databases.modpacks.command({ ping: 1 })
            console.log("🏓 | Pinged modpacks database")
            console.log("🚀 | Connected to MongoDB")
        } catch (error) {
            console.error("❌ | Error connecting to MongoDB:", error);
            throw error;
        }
    }
} as Database

export default data;