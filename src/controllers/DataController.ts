import { Controller } from "../Types";
import * as fs from "fs";
import * as path from "path";
import Logging from "../util/Logging";

const defaultFiles = [
    {
        name: 'config.json',
        content: JSON.stringify({
            "balatro_data_path": "C:\\Users\\User\\AppData\\Roaming\\Balatro",
            "balatro_steam_path": "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Balatro",
        })
    }
]

export const APPDATA_PATH = path.join(process.env.APPDATA || '', 'Balatro Instance Manager');

export default class DataController implements Controller {
    public name: string = "DataController";
    public description: string = "Controller for managing data such as settings.";
    public version: string = "1.0.0";

    public init(): void {
        if (!fs.existsSync(APPDATA_PATH)) {
            fs.mkdirSync(APPDATA_PATH, { recursive: true });
        }

        Logging.debug("Appdata path: " + APPDATA_PATH);
    
        defaultFiles.forEach(file => {
            const filePath = path.join(APPDATA_PATH, file.name);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, file.content, { encoding: 'utf8' });
            }
        });
    }
}