import path from "path";
import { Controller, ProfileConfig } from "../Types";
import Config from "../util/Config";
import Logging from "../util/Logging";
import Registry from "../util/Registry";
import BalatroController from "./BalatroController";
import fs from "fs"
import crypto from "crypto"

/*
 * Hi, here I'm going to document the entirety of how the .negative file format works
 * Wish me luck
 * 
 * First 8 bytes are just a file type signature `NEGATIVE`
 * The next 2 bytes is the length of the name, with a max of 65535 characters (should probably fix that).
 * After those bytes is the actual name, ending with a 0x00
 * Next is the icon length. The icon can be any image URL, so it can store up to 4 bytes of data for the length, with a max of 4294967295 characters (around 4.29 GB)
 * Then comes the actual icon data, ending, once again, with a 0x00
 * Last 32 bytes are a sha256 checksum of the file (excluding the checksum of course)
*/

const defaultExportOptions = {
    fileNameOverride: null
}

export default class ExportController implements Controller {
    public name: string = "ExportController";
    public description: string = "Controller for exporting to a proprietary file format.";
    public version: string = "1.0.0";
    private BC: BalatroController | null = null;

    public async init(): Promise<void> {
        this.BC = (await Registry.AwaitController("BalatroController")) as BalatroController
        if (!this.BC) {
            Logging.error("BalatroController not found. Cannot initialize ExportController.");
            return;
        }

        if(Config.Debug.DebugExportMode == true) {
            this.ExportInstance(Config.Debug.ExportProfile, Config.Debug.ExportPath)
        }
    }

    public async ExportInstance(instanceName: string, outputPath: string, options?: {
        fileNameOverride?: string | null,
    }) {
        if(!options) options = defaultExportOptions;
        
        const instance = this.BC?.GetProfile(instanceName);
        if(!instance) {
            Logging.error(`Could not find instance with name ${instanceName}, can not export.`)
            return
        }

        if(!fs.existsSync(outputPath)) {
            Logging.error("Output path does not resolve to a valid folder, can not export.")
            return
        }

        if(!fs.existsSync(path.join(instance, "profile.json"))){
            Logging.error("Profile does not contain a valid profile.json, can not export.")
            return
        };

        var parsedProfileConfig: ProfileConfig

        try {
            const fileContents = fs.readFileSync(path.join(instance, "profile.json"), { encoding: "utf8" })
            parsedProfileConfig = JSON.parse(fileContents)
        } catch(e) {
            Logging.error("Profile does not contain a valid profile.json, can not export.")
            return
        }

        const file = []

        if(instanceName.length > 65535) instanceName = instanceName.slice(0, 65534);

        file.push(Buffer.from("NEGATIVE", "ascii"))
        const nameBuffer = Buffer.from(instanceName)
        const nameLength = Buffer.alloc(2);
        nameLength.writeUint16BE(nameBuffer.length, 0);
        file.push(nameLength)
        file.push(nameBuffer)
        file.push(Buffer.from([0x00]))

        if(parsedProfileConfig.Icon) {
            if(parsedProfileConfig.Icon.length > 4294967295) {
                Logging.warning("Icon can not be saved because the URL is longer than 4294967295 characters.")
                file.push(Buffer.from([0x00, 0x00, 0x00, 0x00]));
            } else {
                const iconBuffer = Buffer.from(parsedProfileConfig.Icon, "ascii");
                const iconLength = Buffer.alloc(4);
                iconLength.writeUInt32BE(iconBuffer.length, 0);
                file.push(iconLength);
                file.push(iconBuffer);
            }
        } else {
            file.push(Buffer.from([0x00, 0x00, 0x00, 0x00]));
        }

        file.push(Buffer.from([0x00]))

        if(parsedProfileConfig.Mods && Array.isArray(parsedProfileConfig.Mods)) {
            for(const mod of parsedProfileConfig.Mods) {
                // TODO: write the mod data
            }
        }

        // TODO: write the non-registry mod saving

        const fileBuffer = Buffer.concat(file)
        var checksum = crypto.createHash('sha256').update(fileBuffer).digest();
        file.push(checksum)

        var fileName = options.fileNameOverride
        fileName = fileName || `${instanceName}-export.negative`
        if(!fileName.endsWith(".negative")) fileName = fileName + ".negative"

        fs.writeFileSync(path.join(path.resolve(outputPath), fileName), Buffer.concat(file))
        Logging.success(`Successfully wrote negative instance data to ${fileName}!`)
    }
}