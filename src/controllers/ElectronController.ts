import { Controller } from "../Types";
import { app, BrowserWindow } from "electron";
import * as path from "path";
import Logging from "../util/Logging";

export default class ElectronController implements Controller {
    public name: string = "ElectronController";
    public description: string = "Controller for Electron specific functionality.";
    public version: string = "1.0.0";

    private mainWindow: BrowserWindow | null = null;

    public async init(): Promise<void> {
        app.whenReady().then(() => {
            this.createWindow()
        
            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow()
                }
            })
        })
        
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit()
            }
        })
    }

    protected createWindow(): void {
        Logging.info("Creating main window...")
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 600,
            title: "Balatro Instance Manager",
        })

        if (!app.isPackaged) {
            this.mainWindow.loadURL('http://localhost:11731');
        } else {
            this.mainWindow.setMenu(null)
            this.mainWindow.loadFile(path.join(__dirname, '../../', 'client', 'out', 'index.html'));
        }
    }
}