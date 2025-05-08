import { BackendConfiguration, Controller } from "../Types";
import * as fs from "fs";
import * as path from "path";
import Logging from "../util/Logging";

const defaultFiles = [
    {
        name: 'config.json',
        type: 'file',
        content: JSON.stringify({
            "balatro_data_path": "%APPDATA%\\Balatro",
            "balatro_steam_path": "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Balatro",
            "profiles_directory": "%APPDATA%\\Balatro Instance Manager\\Profiles"
        })
    },
    {
        name: "profiles",
        type: "directory"
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

            switch (file.type) {
                case 'file':
                    file = file as { name: string, type: 'file', content: string };
                    file.content = file.content.replace(/%APPDATA%/g, process.env.APPDATA || '');

                    if (!fs.existsSync(filePath)) {
                        fs.writeFileSync(filePath, file.content, { encoding: 'utf8' });
                    }
                    break;
                case 'directory':
                    file = file as { name: string, type: 'directory' };
                    if (!fs.existsSync(filePath)) {
                        fs.mkdirSync(filePath, { recursive: true });
                    }
                    break;
                default:
                    Logging.error(`Unknown file type: ${file.type}`);

            }
        });
    }

    public GetAppdataFileContents(filePath: string): string|null {
        const joinedPath = path.join(APPDATA_PATH, filePath);
        if (fs.existsSync(joinedPath)) {
            return fs.readFileSync(joinedPath, { encoding: 'utf8' });
        }

        return null;
    }
}