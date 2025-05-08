import { Controller } from "../Types";
import Config from "../util/Config";
import Logging from "../util/Logging";
import Registry from "../util/Registry";
import DataController from "./DataController";


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
            this.LaunchBalatro()
        }
    }

    public LaunchBalatro(profilePath?: string): void {
        Logging.info("Launching Balatro...")

        if (!this.DC) {
            Logging.error("DataController has not yet been initialized. Cannot launch Balatro.");
            return;
        }

        const config = this.DC.GetAppdataFileContents("config.json")
        if (!config) {
            Logging.error("Config file not found. Cannot launch Balatro.");
            return;
        }

        Logging.info("Launching Balatro with config: " + config)
    }
}