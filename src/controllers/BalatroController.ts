import * as fs from "fs";
import { Controller, ManagerConfiguration } from "../Types";
import Config from "../util/Config";
import Logging from "../util/Logging";
import Registry from "../util/Registry";
import DataController, { isWindows } from "./DataController";
import { ChildProcess, spawn } from "child_process";
import path from "path";
import { waitForFile } from "../util/Util";
import axios from "axios"
import os from "os"
import tmp from "tmp"
import * as tar from "tar"

function pathsEqual(a: string, b: string): boolean {
    const resolvedA = path.resolve(a);
    const resolvedB = path.resolve(b);
    if (process.platform === "win32") {
        return resolvedA.toLowerCase() === resolvedB.toLowerCase();
    }
    return resolvedA === resolvedB;
}

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
            LastPlayed: -1,
            Icon: "data:image/png;base64,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",
            Mods: []
        }, null, 4)
    }
]

export default class BalatroController implements Controller {
    public name: string = "BalatroController";
    public description: string = "Controller for interfacing with Balatro mod loaders.";
    public version: string = "1.0.0";
    private DC: DataController | null = null;
    private runningInstances: string[] = [];
    private instanceProcesses: { [profile: string]: ChildProcess } = {};
    private playtimeTrackers: { [profile: string] : NodeJS.Timeout } = {};

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

        this.DownloadLovely()

        if(Config.Debug.LaunchBalatroOnStart) {
            this.LaunchBalatro(Config.Debug.AutolaunchProfile)
        }
    }

    private async DownloadLovely() {
        const config = (this.DC as DataController).GetAppdataFileContents("config.json")
        if (!config) {
            Logging.error("Config file not found. Cannot download lovely.")
            return
        }

        var parsedConfig: ManagerConfiguration

        try {
            parsedConfig = JSON.parse(config)
        } catch(err) {
            Logging.error("Invalid config file. Cannot download lovely")
            return
        }

        const apiUrl = "https://api.github.com/repos/ethangreen-dev/lovely-injector/releases/latest";
        const destinationDir = parsedConfig.balatro_steam_path

        if(isWindows) {
            if(fs.existsSync(path.join(parsedConfig.balatro_steam_path, "version.dll"))) {
                Logging.success("Lovely already installed, skipping installation")
                return
            }
        } else {
            if(fs.existsSync(path.join(parsedConfig.balatro_steam_path, "liblovely.dylib"))) {
                Logging.success("Lovely already installed, skipping installation")
                return
            }
        }

        try {
            Logging.info("Fetching the latest release of Lovely...");

            const releaseResponse = await axios.get(apiUrl, {
                headers: { "Accept": "application/vnd.github.v3+json" },
            });

            let asset;
            const arch = os.arch();
            if (isWindows) {
                asset = releaseResponse.data.assets.find((asst: any) =>
                    asst.browser_download_url.includes("lovely-x86_64-pc-windows-msvc")
                );
            } else {
                if (arch === "x64") {
                    asset = releaseResponse.data.assets.find((asst: any) =>
                        asst.browser_download_url.includes("lovely-x86_64-apple-darwin")
                    );
                } else if (arch === "arm64") {
                    asset = releaseResponse.data.assets.find((asst: any) =>
                        asst.browser_download_url.includes("lovely-aarch64-apple-darwin")
                    );
                }
            }

            if (!asset) {
                throw new Error("No suitable release found for the current architecture.");
            }

            Logging.info("Downloading Lovely...");

            const tempDir = tmp.dirSync({ unsafeCleanup: true });
            const tempFilePath = path.join(tempDir.name, "Lovely.tar.gz");

            const downloadResponse = await axios.get(asset.browser_download_url, { responseType: "stream" });
            const writer = fs.createWriteStream(tempFilePath);

            downloadResponse.data.pipe(writer);

            await new Promise<void>((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            Logging.info("Unzipping Lovely...")

            await tar.x({
                file: tempFilePath,
                cwd: destinationDir,
            });

            Logging.success("Successfully downloaded and extracted the Lovely Injector to: " + destinationDir);

            tempDir.removeCallback();
        } catch (err: any) {
            Logging.error("Failed to download and extract the Lovely Injector: " + err.message);
            throw err
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

        var parsedConfig: ManagerConfiguration

        try {
            parsedConfig = JSON.parse(config)
        } catch(err) {
            Logging.error("Invalid config file. Cannot launch Balatro")
            return
        }

        Logging.asyncTask("Attempting to launch Balatro with config: " + config)

        if(profileName){
            if (this.runningInstances.includes(profileName)) {
                Logging.error(`Balatro profile ${profileName} is already running.`)
                return
            }
        } else {
            if (this.runningInstances.includes("Vanilla")) {
                Logging.error(`Vanilla balatro is already running.`)
                return
            }
        }

        const launchPath = profileName ? path.join(parsedConfig.profiles_directory, profileName) : parsedConfig.balatro_steam_path
        if(!fs.existsSync(launchPath)) {
            Logging.error("Profile path does not exist: " + launchPath)
            return
        }

        if(isWindows) {
            if(!fs.existsSync(path.join(parsedConfig.balatro_steam_path, "Balatro.exe"))) {
                Logging.error("Balatro executable not found in steam path: " + launchPath)
                return
            }
        } else {
            if(!fs.existsSync(path.join(parsedConfig.balatro_steam_path, "run_lovely_macos.sh"))) {
                Logging.error("Lovely launcher not found in steam path: " + launchPath)
                return
            }
        }

        if(!fs.existsSync(parsedConfig.balatro_data_path)) {
            Logging.error("Balatro data path does not exist: " + parsedConfig.balatro_data_path)
            return
        }

        Logging.info("Launching Balatro.")

        const dataModPath = path.join(parsedConfig.balatro_data_path, "Mods")
        if(profileName) {
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

        if(isWindows) {
            const process = spawn(parsedConfig.balatro_steam_path + "\\Balatro.exe")
            this.runningInstances.push(profileName || "Vanilla")
            this.instanceProcesses[profileName || "Vanilla"] = process
            
            if(profileName) {
                this.TrackProfileTime(profileName, launchPath)
            }


            process.on("close", (code) => {
                this.runningInstances = this.runningInstances.filter(p => p !== (profileName || "Vanilla"))
                if(profileName) {
                    clearInterval(this.playtimeTrackers[profileName])
                }

                if (code !== null && code !== 0 && code !== 3221225786) {
                    Logging.error("Balatro process exited with code: " + code)
                } else {
                    Logging.success("Balatro process exited successfully.")
                }
            })
        } else {
            const scriptPath = path.join(parsedConfig.balatro_steam_path, "run_lovely_macos.sh");

            if (!fs.existsSync(scriptPath)) {
                Logging.error("Lovely launcher not found in steam path: " + scriptPath);
                return;
            }

            Logging.info("Launching Lovely using the macOS script...");

            const process = spawn("sh", [scriptPath], { stdio: "inherit" });
            this.runningInstances.push(profileName || "Vanilla")
            this.instanceProcesses[profileName || "Vanilla"] = process
            if(profileName) {
                this.TrackProfileTime(profileName, launchPath)
            }

            process.on("close", (code) => {
                this.runningInstances = this.runningInstances.filter(p => p !== (profileName || "Vanilla"))
                if(profileName) {
                    clearInterval(this.playtimeTrackers[profileName])
                }

                if (code !== null && code !== 0 && code !== 3221225786) { // the code that is given when the lovely console is closed
                    Logging.error("Lovely process exited with code: " + code);
                } else {
                    Logging.success("Lovely process exited successfully.");
                }
            });

            process.on("error", (err) => {
                Logging.error("Failed to start Lovely process: " + err.message);
            });
        }
    }

    public ExitBalatro(profileName: string): void {
        if(this.instanceProcesses[profileName]) {
            this.instanceProcesses[profileName].kill("SIGTERM")
        }
    }

    private TrackProfileTime(profileName: string, launchPath: string) : void {
        Logging.asyncTask(`Tracking profile time for ${profileName}`)
        this.playtimeTrackers[profileName] = setInterval(() => {
            const profileConfig = fs.readFileSync(path.join(launchPath, "profile.json"), { encoding: "utf8" })
            var parsedProfileConfig
            try {
                parsedProfileConfig = JSON.parse(profileConfig)
            } catch(err) {
                Logging.error("Profile configuration is not valid json.")
                return
            }

            parsedProfileConfig.TimePlayed += 1
            parsedProfileConfig.LastPlayed = Date.now()

            fs.writeFileSync(path.join(launchPath, "profile.json"), JSON.stringify(parsedProfileConfig, null, 4), { encoding: "utf-8" })
        }, 60 * 1000)
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

        var parsedConfig: ManagerConfiguration

        try {
            parsedConfig = JSON.parse(config)
        } catch(err) {
            Logging.error("Invalid config file. Cannot create new profile.")
            return
        }

        if(parsedConfig.profiles_directory === undefined || parsedConfig.profiles_directory === null || !fs.existsSync(parsedConfig.profiles_directory)) {
            Logging.error("Profiles directory not set in config or does not exist. Cannot create new profile.")
            return
        }

        const profilePath = path.join(parsedConfig.profiles_directory, profileName)
        if (fs.existsSync(profilePath)) {
            Logging.error("Profile already exists: " + profilePath)
            return
        }

        fs.mkdirSync(profilePath, { recursive: true })

        ProfileContents.forEach(file => {
            console.log(file)
            const filePath = path.join(profilePath, file.name)
            if (file.type === "directory") {
                console.log(`Creating directory ${file.name} (${profilePath})`)
                const newFile = file as { name: string, type: "directory" }
                fs.mkdirSync(path.join(profilePath, newFile.name), { recursive: true })
            } else if (file.type === "file") {
                console.log(`Creating file ${file.name} (${profilePath})`)
                const newFile = file as { name: string, type: "file", content: string }
                fs.writeFileSync(filePath, newFile.content)
            }
        })
    }

    public GetProfile(profileName: string): string | null {
        if(!this.DC) {
            Logging.error("DataController has not yet been initialized. Cannot get profile.")
            return null
        }

        var parsedConfig = this.DC.GetManagerConfig()
        if(parsedConfig == null){
            Logging.error("Manager config is invalid or not found.")
            return null
        }

        const profilePath = path.join(parsedConfig.profiles_directory, profileName)
        if (!fs.existsSync(profilePath)) {
            return null
        }

        return profilePath
    }

    public GetProfileInfo(profileName: string): any | null {
        const ProfilePath = this.GetProfile(profileName)
        if(ProfilePath == null) {
            Logging.error("GetProfile didn't return a valid profile path.")
            return
        }

       if(!fs.existsSync(path.join(ProfilePath, "profile.json"))){
            Logging.error("Profile does not have a valid configuration file.")
            return
        }

        const profileConfig = fs.readFileSync(path.join(ProfilePath, "profile.json"), { encoding: "utf8" })
        var parsedProfileConfig: { DateCreated: number, TimePlayed: number, Mods: { name: string, path: string }[] }
        try {
            parsedProfileConfig = JSON.parse(profileConfig)
        } catch(err) {
            Logging.error("Profile configuration is not valid json.")
            return
        }

        if(!parsedProfileConfig.Mods) {
            parsedProfileConfig.Mods = []
        }

        const modsDir = path.join(ProfilePath, "Mods")
        fs.readdirSync(modsDir, { encoding: "utf-8"}).forEach(file => {
            const stat = fs.statSync(path.join(modsDir, file))
            if(!stat.isDirectory()) return

            if(!parsedProfileConfig.Mods.some(mod => pathsEqual(mod.path, path.join(modsDir, file)))) {
                parsedProfileConfig.Mods.push({ name: file, path: path.join(modsDir, file) })
            }
        })

        parsedProfileConfig.Mods = parsedProfileConfig.Mods.filter(mod => fs.existsSync(mod.path));

        return {
            name: profileName,
            ...parsedProfileConfig
        }
    }

    public GetAllProfiles(): any | null {
        if (!this.DC) {
            Logging.error("DataController has not yet been initialized. Cannot get profiles.")
            return null
        }

        var parsedConfig = this.DC.GetManagerConfig()
        if(parsedConfig == null){
            Logging.error("Manager config is invalid or not found.")
            return null
        }

        if(!parsedConfig.profiles_directory) {
            Logging.error("Profiles directory not provided")
            return null
        }

        const profiles = fs.readdirSync(parsedConfig.profiles_directory)
        const profileInfo = []

        for(const directory of profiles) {
            const filePath = path.join(parsedConfig.profiles_directory, directory)
            const stat = fs.statSync(filePath)
            if(!stat.isDirectory()) continue;

            const info = this.GetProfileInfo(directory)
            if(!info) continue;

            profileInfo.push(info)
        }

        return profileInfo
    }

    public DeleteModOnInstance(profile: string, mod: string): void {
        if (!this.DC) {
            Logging.error("DataController has not yet been initialized. Cannot get profiles.")
            return
        }

        var parsedConfig = this.DC.GetManagerConfig()
        if(parsedConfig == null){
            Logging.error("Manager config is invalid or not found.")
            return
        }

        if(!parsedConfig.profiles_directory || !path.resolve(parsedConfig.profiles_directory)) {
            Logging.error("Profiles directory not provided")
            return
        }

        const profilePath = path.join(parsedConfig.profiles_directory, profile)
        if(!path.resolve(profilePath)) {
            Logging.error("Profile does not exist")
            return
        }

        
        const modsPath = path.join(profilePath, "Mods")
        if(!path.resolve(modsPath)) {
            Logging.error("Profile does not have a valid mods folder")
            return
        }

        const modFolder = path.join(modsPath, mod)
        if(!path.resolve(modFolder)) {
            Logging.error("Mod folder does not exist")
            return
        }
        
        const profileConfig = path.join(profilePath, "profile.json")
        if(!path.resolve(profileConfig)){
            Logging.error("Profile.json file not found")
            return
        }

        var parsedProfileConfig
        try {
            const data = fs.readFileSync(profileConfig, { encoding: "utf-8" })
            parsedProfileConfig = JSON.parse(data)
        } catch(err) {
            Logging.error("Invalid profile.json config.")
            return
        }

        if(parsedProfileConfig.Mods) {
            parsedProfileConfig.Mods = parsedProfileConfig.Mods.filter((mod: { path: string }) => pathsEqual(mod.path, modFolder))
        } else {
            parsedProfileConfig.Mods = []
        }

        fs.rm(modFolder, { recursive: true, force: true }, (err) => {
            if(err) {
                Logging.error(`Failed to delete mod folder: ${err.message}`)
            }
        })
        fs.writeFileSync(profileConfig, JSON.stringify(parsedProfileConfig, null, 4), { encoding: "utf-8" })
    }

    public IsRunning(profile: string): boolean {
        return this.runningInstances.includes(profile)
    }
}