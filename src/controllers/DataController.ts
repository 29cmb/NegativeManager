import { Controller, ManagerConfiguration } from "../Types";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import Logging from "../util/Logging";

export const isWindows = os.platform() === "win32";
export const APPDATA_PATH = path.join((isWindows ? process.env.APPDATA : `${process.env.HOME}/Library/Application Support`) || '', 'Balatro Instance Manager');

const defaultFiles = [
    {
        name: 'config.json',
        type: 'file',
        get content() {
            const balatro_data_path = isWindows ? `${process.env.APPDATA}\\Balatro` : `${process.env.HOME}/Library/Application Support/Balatro`
            const balatro_steam_path = isWindows ? "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Balatro" : `${process.env.HOME}/Library/Application Support/Steam/steamapps/common/Balatro`
            const profiles_directory = isWindows ? `${APPDATA_PATH}\\Profiles` :`${APPDATA_PATH}/Profiles`
            
            return JSON.stringify({
                balatro_data_path,
                balatro_steam_path,
                profiles_directory
            }, null, 4);
        },
        validate: (defaultContent: string, content: string) => {
            const defaultJson = JSON.parse(defaultContent);
            var parsedJson;
            try {
                parsedJson = JSON.parse(content);
            } catch(err) {
                Logging.error("Invalid profile json file, resetting to default.")
                parsedJson = defaultJson
            }

            if(!parsedJson.balatro_data_path || typeof(parsedJson.balatro_data_path) !== 'string' || !fs.existsSync(parsedJson.balatro_data_path)) {
                Logging.error("Invalid balatro_data_path in config.json, resetting to default.")
                parsedJson.balatro_data_path = defaultJson.balatro_data_path
            }

            if(!parsedJson.balatro_steam_path || typeof(parsedJson.balatro_steam_path) !== 'string' || !fs.existsSync(parsedJson.balatro_steam_path)) {
                Logging.error("Invalid balatro_steam_path in config.json, resetting to default.")
                parsedJson.balatro_steam_path = defaultJson.balatro_steam_path
            }

            if(!parsedJson.profiles_directory || typeof(parsedJson.profiles_directory) !== 'string' || !fs.existsSync(parsedJson.profiles_directory)) {
                Logging.error("Invalid profiles_directory in config.json, resetting to default.")
                parsedJson.profiles_directory = defaultJson.profiles_directory
            }

            fs.writeFileSync(path.join(APPDATA_PATH, 'config.json'), JSON.stringify(parsedJson, null, 4), { encoding: 'utf8' });
        }
    },
    {
        name: "profiles",
        type: "directory"
    }
]

export default class DataController implements Controller {
    public name: string = "DataController";
    public description: string = "Controller for managing data such as settings.";
    public version: string = "1.0.0";

    public async init(): Promise<void> {
        if (!fs.existsSync(APPDATA_PATH)) {
            fs.mkdirSync(APPDATA_PATH, { recursive: true });
        }

        Logging.debug("Appdata path: " + APPDATA_PATH);
    
        defaultFiles.forEach(file => {
            const filePath = path.join(APPDATA_PATH, file.name);

            switch (file.type) {
                case 'file':
                    file = file as { name: string, type: 'file', content: string, validate: (defaultContent: string, content: string) => any };
                    const replacedContext = file.content.replace(/\\/g, '\\\\')

                    if (!fs.existsSync(filePath)) {
                        fs.writeFileSync(filePath, replacedContext, { encoding: 'utf8' });
                    } else {
                        file.validate(replacedContext, fs.readFileSync(filePath, { encoding: 'utf8' }));
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

    public GetAppdataFileContents(filePath: string): string | null {
        const joinedPath = path.join(APPDATA_PATH, filePath);
        if (fs.existsSync(joinedPath)) {
            return fs.readFileSync(joinedPath, { encoding: 'utf8' });
        }

        return null;
    }

    public GetManagerConfig() : ManagerConfiguration | null {
        const config = this.GetAppdataFileContents("config.json")
        if (!config) return null

        var parsedConfig: ManagerConfiguration

        try {
            parsedConfig = JSON.parse(config)
        } catch(err) {
            return null
        }

        return parsedConfig
    }
}