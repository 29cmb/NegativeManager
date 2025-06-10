import { ipcMain } from "electron";
import { BackendConfiguration, Controller, ManagerConfiguration } from "../Types";
import BalatroController from "./BalatroController";
import Registry from "../util/Registry";
import Logging from "../util/Logging";
import DataController, { APPDATA_PATH, isWindows } from "./DataController";
import fs from "fs"
import path from "path";

export default class IPCController implements Controller {
    public name: string = "IPCController";
    public description: string = "Controller for interacting with the next.js frontend";
    public version: string = "1.0.0";
    private BC: BalatroController | null = null;
    private DC: DataController | null = null;

    public async init(): Promise<void> {
        this.BC = (await Registry.AwaitController("BalatroController")) as BalatroController
        this.DC = (await Registry.AwaitController("DataController")) as DataController
    }

    public SetupIPC() : void {
        ipcMain.handle("get-profile", (event, profile) => {
            return this.BC?.GetProfile(profile) || null;
        })

        ipcMain.handle("get-all-profiles", (event) => {
            if(!this.BC) return null;
            return this.BC.GetAllProfiles()
        })

        ipcMain.on("launch-instance", (event, profileID) => {
            this.BC?.LaunchBalatro(profileID)
        })

        ipcMain.handle("is-instance-running", (event, name) => {
            if(!this.BC) return false;
            return this.BC.IsRunning(name)
        })

        ipcMain.on("kill-instance", (event, name) => {
            this.BC?.ExitBalatro(name)
        })

        ipcMain.on("delete-mod", (event, instance, mod) => {
            this.BC?.DeleteModOnInstance(instance, mod)
        })

        ipcMain.handle("get-profile-info", (event, profileName) => {
            if(!this.BC) return null;
            return this.BC.GetProfileInfo(profileName)
        })

        ipcMain.handle("get-conf-text-placeholder", (event, field) => {
            switch (field) {
                case "steam":
                    if (isWindows) {
                        return `C:\\Program Files (x86)\\Steam\\steamapps\\common\\Balatro`
                    } else {
                        return `${process.env.HOME}/Library/Application Support/Steam/steamapps/common/Balatro`
                    }
                case "data":
                    if (isWindows) {
                        return `${process.env.USERPROFILE}\\AppData\\Roaming\\Balatro`
                    } else {
                        return `${process.env.HOME}/Library/Application Support/Balatro`
                    }
            }
        })

        ipcMain.handle("validate-path-type", (event, _path, type) => {
            switch (type) {
                case "steam":
                    const validatedPath = path.resolve(_path)
                    if(!validatedPath) {
                        return "Steam path is invalid."
                    }

                    if(!fs.existsSync(validatedPath)) {
                        return "Steam path does not exist."
                    }

                    const app = path.join(validatedPath, isWindows ? "Balatro.exe" : "Balatro.app")
                    if(fs.existsSync(app)) {
                        return true
                    } else {
                        return `Steam path does not contain a ${isWindows ? "Balatro.exe" : "Balatro.app"}.`
                    }
                case "data":
                    const validatedDataPath = path.resolve(_path)
                    if(!validatedDataPath) {
                        return "Data path is invalid."
                    }

                    if(!fs.existsSync(validatedDataPath)) {
                        return "Data path does not exist."
                    }

                    if(!fs.existsSync(path.join(validatedDataPath, "settings.jkr"))) {
                        return "Data path does not contain a settings.jkr"
                    }

                    return true
            }
        })

        ipcMain.handle("validate-config-paths", () => {
            const configPath = path.join(APPDATA_PATH, "config.json")
            if(!fs.existsSync(configPath)) return;

            const config = fs.readFileSync(configPath, { encoding: "utf-8" })

            var parsedConfig
            try {
                parsedConfig = JSON.parse(config) as ManagerConfiguration
            } catch(err) {
                Logging.error("Could not parse config.json")
                return false;
            }

            return fs.existsSync(path.resolve(parsedConfig.balatro_steam_path))
                && fs.existsSync(path.resolve(parsedConfig.balatro_data_path))
        })

        ipcMain.on("update-config-field", (event, key, value) => {
            const allowedKeys = [
                {
                    name: "balatro_data_path",
                    validate: (value: string) => {
                        const p = path.resolve(value)
                        return fs.existsSync(p) && fs.existsSync(path.join(p, "settings.jkr"))
                    }
                },
                {
                    name: "balatro_steam_path",
                    validate: (value: string) => {
                        const p = path.resolve(value)
                        return fs.existsSync(p) && fs.existsSync(path.join(p, isWindows ? "Balatro.exe" : "Balatro.app"))
                    },
                    onUpdate: () => this.BC?.DownloadLovely()
                },
                {
                    name: "profiles_directory",
                    validate: (value: string) => {
                        return fs.existsSync(path.resolve(value))
                    }
                }
            ] as {name: string, validate: (value: string) => boolean, onUpdate?: () => void}[]

            const keyDict = allowedKeys.find(k => k.name === key)
            if(!keyDict) return

            const config = this.DC?.GetAppdataFileContents("config.json")
            if(!config) return;

            if(keyDict.validate(value)) {
                var parsedConfig
                try {
                    parsedConfig = JSON.parse(config)
                } catch(err) {
                    return
                }

                parsedConfig[key] = value
                fs.writeFileSync(path.join(APPDATA_PATH, "config.json"), JSON.stringify(parsedConfig, null, 4), {encoding: "utf-8"})
                if(keyDict.onUpdate) keyDict.onUpdate()
            }
        })

        Logging.success("IPC Handlers connected successfully.")
    }
}