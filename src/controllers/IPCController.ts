import { ipcMain } from "electron";
import { Controller } from "../Types";
import BalatroController from "./BalatroController";
import Registry from "../util/Registry";
import Logging from "../util/Logging";

export default class IPCController implements Controller {
    public name: string = "IPCController";
    public description: string = "Controller for interacting with the next.js frontend";
    public version: string = "1.0.0";
    private BC: BalatroController | null = null;

    public async init(): Promise<void> {
        this.BC = (await Registry.AwaitController("BalatroController")) as BalatroController
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

        Logging.success("IPC Handlers connected successfully.")
    }
}