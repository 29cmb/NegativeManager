import express, { Express } from 'express';
import * as bodyParser from 'body-parser';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config();

const app: Express = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const apiPath = path.join(__dirname, "api")
const apiFiles = fs.readdirSync(apiPath).filter(file => file.endsWith('.ts'))

for (const file of apiFiles) {
    const filePath = path.join(apiPath, file);
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

app.listen(process.env.PORT || 3001, () => {
    console.log(`✅ | Server is running on port ${process.env.PORT || 3001}`);
});