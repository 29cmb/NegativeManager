import "dotenv/config"

import express, { Express } from 'express';
import * as bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import session from 'express-session';
import database from './modules/database';
import sessionSave from 'connect-mongodb-session';

const MongoDBStore = sessionSave(session);

const app: Express = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("trust proxy", 1);

app.use(session({
    secret: process.env.COOKIE_SIGNING_SECRET || "",
    resave: false,
    saveUninitialized: false,
    store: new MongoDBStore({
        uri: database.uri,
        databaseName: process.env.ACCOUNTS_DATABASE || "Accounts",
        collection: process.env.SESSIONS_COLLECTION || "Sessions",
    })
}))

database.init()

const apiPath = path.join(__dirname, "api")
let apiFiles: string[] = []

const walk = [apiPath]
while (walk.length) {
    const dir = walk.pop()!
    const files = fs.readdirSync(dir)
    for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)

        if (stat.isDirectory()) {
            walk.push(filePath)
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
            apiFiles.push(filePath)
        }
    }
}

for (const filePath of apiFiles) {
    import(filePath).then((module) => {
        const data = module.default(app);
        if (data?.method && data.route) {
            console.log(`✅ | API route ${data.method} '${data.route}' has been setup successfully!`);
        } else {
            console.log(`❌ | API route '${filePath}' did not return data.method or did not return data.route.`);
        }
    }).catch((err) => {
        console.error(`❌ | Failed to load API route '${filePath}':`, err);
    });
}