import * as fs from "fs";
import { Controller, ManagerConfiguration } from "../Types";
import Config from "../util/Config";
import Logging from "../util/Logging";
import Registry from "../util/Registry";
import DataController, { APPDATA_PATH } from "./DataController";
import { spawn } from "child_process";
import path from "path";
import { waitForFile } from "../util/Util";

const ProfileContents = [
    {
        name: "Mods",
        type: "directory",
    },
    {
        name: "profile.json",
        type: "file",
        content: JSON.stringify({
            get DateCreated() {
                return Date.now()
            },
            TimePlayed: 0,
            Icon: "data:image/png;base64,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"
        }, null, 4)
    }
]

export default class BalatroController implements Controller {
    public name: string = "BalatroController";
    public description: string = "Controller for interfacing with Balatro mod loaders.";
    public version: string = "1.0.0";
    private DC: DataController | null = null;

    public async init(): Promise<void> {
        this.DC = (await Registry.AwaitController("DataController")) as DataController
        if (!this.DC) {
            Logging.error("DataController not found. Cannot initialize BalatroController.");
            return;
        }

        if(Config.Debug.CreateDefaultProfile){
            const defaultProfileName = Config.Debug.DefaultProfileName
            const profilePath = this.GetProfile(defaultProfileName)
    
            if (!profilePath) {
                this.NewProfile(defaultProfileName)
                Logging.debug("Created default profile: " + defaultProfileName)
            } else {
                Logging.debug("Default profile already exists: " + defaultProfileName)
            }
        }

        if(Config.Debug.LaunchBalatroOnStart) {
            this.LaunchBalatro(Config.Debug.AutolaunchProfile)
        }
    }
    
    public async LaunchBalatro(profileName?: string): Promise<void> {
        if (!this.DC) {
            Logging.error("DataController has not yet been initialized. Cannot launch Balatro.")
            return
        }

        const config = this.DC.GetAppdataFileContents("config.json")
        if (!config) {
            Logging.error("Config file not found. Cannot launch Balatro.")
            return
        }

        const parsedConfig: ManagerConfiguration = JSON.parse(config);
        if (!parsedConfig) {
            Logging.error("Failed to parse config file. Cannot launch Balatro.")
            return
        }

        Logging.asyncTask("Attempting to launch Balatro with config: " + config)

        const launchPath = profileName ? path.join(parsedConfig.profiles_directory, profileName) : parsedConfig.balatro_steam_path
        if(!fs.existsSync(launchPath)) {
            Logging.error("Profile path does not exist: " + launchPath)
            return
        }

        if(!fs.existsSync(path.join(parsedConfig.balatro_steam_path, "Balatro.exe"))) {
            Logging.error("Balatro executable not found in steam path: " + launchPath)
            return
        }

        if(!fs.existsSync(parsedConfig.balatro_data_path)) {
            Logging.error("Balatro data path does not exist: " + parsedConfig.balatro_data_path)
            return
        }

        Logging.info("Launching Balatro.")

        const dataModPath = path.join(parsedConfig.balatro_data_path, "Mods")
        if(profileName) {
            // Load mods into the data path
            // I might fork lovely to use the Balatro.exe path instead of the data path in the future.
            
            if(fs.existsSync(dataModPath)) {
                if(!fs.existsSync(path.join(dataModPath, ".instance_modpack"))) {
                    const oldModsPath = path.join(parsedConfig.balatro_data_path, "OldMods" + Date.now());
                    fs.renameSync(dataModPath, oldModsPath) // Preserves mods that aren't made by the instance manager
                    fs.mkdirSync(dataModPath, { recursive: true })
                } else {
                    fs.readdirSync(dataModPath).forEach(file => {
                        const filePath = path.join(dataModPath, file);
                        if (fs.lstatSync(filePath).isDirectory()) {
                            fs.rmSync(filePath, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(filePath);
                        }
                    });
                }
            }

            const profileModsPath = path.join(launchPath, "Mods")
            if(fs.existsSync(profileModsPath)) {
                fs.readdirSync(profileModsPath).forEach(file => {
                    const filePath = path.join(profileModsPath, file);
                    if (fs.lstatSync(filePath).isDirectory()) {
                        fs.cpSync(filePath, path.join(dataModPath, file), { recursive: true });
                    } else {
                        fs.copyFileSync(filePath, path.join(dataModPath, file));
                    }
                });
            }

            const instanceModpackPath = path.join(dataModPath, ".instance_modpack")
            fs.writeFileSync(instanceModpackPath, "") // doesn't need content
        }

        await waitForFile(path.join(parsedConfig.balatro_data_path, "Mods", ".instance_modpack"), 2000)

        const process = spawn(parsedConfig.balatro_steam_path + "\\Balatro.exe")
        process.on("close", (code) => {
            if (code !== 0) {
                Logging.error("Balatro process exited with code: " + code)
            } else {
                Logging.success("Balatro process exited successfully.")
            }
        })
    }

    public NewProfile(profileName: string): void {
        if (!this.DC) {
            Logging.error("DataController has not yet been initialized. Cannot create new profile.")
            return
        }
        
        const config = this.DC.GetAppdataFileContents("config.json")
        if (!config) {
            Logging.error("Config file not found. Cannot create new profile.")
            return
        }

        const parsedConfig: ManagerConfiguration = JSON.parse(config);
        if(!parsedConfig) {
            Logging.error("Failed to parse config file. Cannot create new profile.")
            return
        }

        if(parsedConfig.profiles_directory === undefined || parsedConfig.profiles_directory === null || !fs.existsSync(parsedConfig.profiles_directory)) {
            Logging.error("Profiles directory not set in config or does not exist. Cannot create new profile.")
            return
        }

        const profilePath = `${parsedConfig.profiles_directory}\\${profileName}`
        if (fs.existsSync(profilePath)) {
            Logging.error("Profile already exists: " + profilePath)
            return
        }

        fs.mkdirSync(profilePath, { recursive: true })

        ProfileContents.forEach(file => {
            const filePath = path.join(profilePath, file.name)
            if (file.type === "directory") {
                const newFile = file as { name: string, type: "directory" }
                fs.mkdirSync(newFile.name, { recursive: true })
            } else if (file.type === "file") {
                const newFile = file as { name: string, type: "file", content: string }
                fs.writeFileSync(filePath, newFile.content)
            }
        })
    }

    public GetProfile(profileName: string): string | null {
        if (!this.DC) {
            Logging.error("DataController has not yet been initialized. Cannot get profile.")
            return null
        }

        const config = this.DC.GetAppdataFileContents("config.json")
        if (!config) {
            Logging.error("Config file not found. Cannot get profile.")
            return null
        }

        const parsedConfig: ManagerConfiguration = JSON.parse(config);
        if (!parsedConfig) {
            Logging.error("Failed to parse config file. Cannot get profile.")
            return null
        }

        const profilePath = `${parsedConfig.profiles_directory}\\${profileName}`
        if (!fs.existsSync(profilePath)) {
            return null
        }

        return profilePath
    }
}