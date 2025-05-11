import { Collection, Db, MongoClient, ServerApiVersion } from "mongodb";

const uri = `mongodb+srv://${process.env.DATABASEUSER}:${process.env.DATABASEPASS}@${process.env.DATABASEURI}/?retryWrites=true&w=majority&appName=${process.env.DATABASEAPPNAME}`;

const client = new MongoClient(uri as string, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

export default {
    uri,
    client,
    databases: {} as {[key: string]: Db},
    collections: {} as {[key: string]: Collection},
    methods: {},
    async init() {
        try {
            await client.connect();

            // database setup
            this.databases.accounts = client.db(process.env.ACCOUNTS_DATABASE || "Accounts");

            // collections setup
            this.collections.users = this.databases.accounts.collection(process.env.USERS_DATABASE || "Users");
            this.collections.sessions = this.databases.accounts.collection("sessions");

            await this.databases.accounts.command({ ping: 1 });
            console.log("🏓 | Pinged accounts database")
            console.log("🚀 | Connected to MongoDB");
        } catch (error) {
            console.error("❌ | Error connecting to MongoDB:", error);
            throw error;
        }
    }
}