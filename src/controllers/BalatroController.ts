import * as fs from "fs";
import { Controller, ManagerConfiguration, ProfileCreationOptions } from "../Types";
import Config from "../util/Config";
import Logging from "../util/Logging";
import Registry from "../util/Registry";
import DataController, { APPDATA_PATH } from "./DataController";
import { spawn } from "child_process";
import path from "path";

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

        if(Config.Debug.LaunchBalatroOnStart) {
            this.LaunchBalatro(Config.Debug.AutolaunchProfile)
        }

        setTimeout(() => {
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
        }, 1000)
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

        const waitForFile = (filePath: string, timeout: number = 5000): Promise<void> => {
            return new Promise((resolve, reject) => {
                const start = Date.now();
                const interval = setInterval(() => {
                    if (fs.existsSync(filePath)) {
                        clearInterval(interval);
                        resolve();
                    } else if (Date.now() - start > timeout) {
                        clearInterval(interval);
                        reject(new Error(`Timeout waiting for file: ${filePath}`));
                    }
                }, 100);
            });
        };

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

        const clonePath = parsedConfig.balatro_steam_path
        if (!fs.existsSync(clonePath)) {
            Logging.error("Vanilla path to copy does not exist, cannot create new profile: " + clonePath)
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
        fs.readdirSync(clonePath).forEach(file => {
            fs.copyFileSync(path.join(clonePath, file), path.join(profilePath, file))
        })

        fs.mkdirSync(path.join(profilePath, "Mods"))
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