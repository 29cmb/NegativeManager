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
        ipcMain.handle("get-all-profiles", (event, arg) => {
            if(!this.BC) return null;
            return this.BC.GetAllProfiles()
        })

        Logging.success("IPC Handlers connected successfully.")
    }
}