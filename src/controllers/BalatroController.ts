import * as fs from "fs";
import { Controller, ManagerConfiguration } from "../Types";
import Config from "../util/Config";
import Logging from "../util/Logging";
import Registry from "../util/Registry";
import DataController from "./DataController";
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
    }

    public LaunchBalatro(profilePath?: string): void {
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

        const launchPath = profilePath ? profilePath : parsedConfig.balatro_steam_path
        if(!fs.existsSync(launchPath)) {
            Logging.error("Profile path does not exist: " + launchPath)
            return
        }

        if(!fs.existsSync(path.join(launchPath, "Balatro.exe"))) {
            Logging.error("Balatro executable not found in profile path: " + launchPath)
            return
        }

        Logging.info("Launching Balatro.")

        const process = spawn(parsedConfig.balatro_steam_path + "\\Balatro.exe")
        process.on("close", (code) => {
            if (code !== 0) {
                Logging.error("Balatro process exited with code: " + code)
            } else {
                Logging.success("Balatro process exited successfully.")
            }
        })
    }
}