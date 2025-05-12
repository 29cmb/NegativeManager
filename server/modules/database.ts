import { Collection, Db, MongoClient, ServerApiVersion } from "mongodb";
import { argon2encrypt, argon2verify } from "./encryption";
import { Request } from "express"

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

            this.methods.getUser = async (username: string) => {
                return data.collections.users.findOne({ username });
            }

            this.methods.login = async (req: Request & {session: {user: string}}, username: string, password: string) : Promise<{status: number, response: {success: boolean, message: string}}> => {
                const user = await data.methods.getUser(username);
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

            this.methods.submit = async (req: Request & {session: {user: string}}, name: string, description: string, icon: string, dependancies: string[], github_release_link: string) : Promise<{status: number, response: {success: boolean, message: string}}> => {
                const existingMod = await this.collections.catalog.findOne({ name, author: req.session.user })
                if(existingMod) {
                    return { status: 409, response: { success: false, message: "You already have a mod of the same name" } };
                }

                const user = await this.methods.getUser(req.session.user);
                if(!user || user.submission_ban) {
                    return { status: 401, response: { success: false, message: "You are banned from submitting mods" } };
                }

                return { status: 200, response: { success: true, message: "Mod submitted successfully" } }
            }

            await this.databases.accounts.command({ ping: 1 });
            console.log("🏓 | Pinged accounts database")
            console.log("🚀 | Connected to MongoDB");
        } catch (error) {
            console.error("❌ | Error connecting to MongoDB:", error);
            throw error;
        }
    }
}

export default data;