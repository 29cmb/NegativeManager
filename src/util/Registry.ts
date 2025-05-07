import Logging from "./Logging"
import * as fs from "fs"
import * as path from "path"
import { Controller } from "../Types"

const controllers: {[name: string]: Controller} = {}

const registerControllers = () => {
    Logging.booting("Registering controllers...")
    fs.readdirSync(path.join(__dirname, "../controllers")).forEach(async (file) => {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
            const controller: Controller = new ((await import(`../controllers/${file}`)).default)
            Logging.packageRegistration(`Registering controller ${controller.name} (v${controller.version})`)
            try {
                if (controllers[controller.name]) {
                    Logging.warning(`Controller ${controller.name} is already registered.`)
                    return
                }

                controller.init()
                controllers[controller.name] = controller
            } catch(e) {
                Logging.error(`Error registering controller ${controller.name}: ${e}`)
            }
        } else {
            Logging.warning(`File ${file} is not a controller`)
        }
    })
}

export default {
    controllers,
    registerControllers
}