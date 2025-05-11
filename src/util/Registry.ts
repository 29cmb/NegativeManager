import Logging from "./Logging"
import * as fs from "fs"
import * as path from "path"
import { Controller } from "../Types"
import Config from "./Config"

const controllers: {[name: string]: Controller} = {}

const registerControllers = () => {
    Logging.booting("Registering controllers...")
    fs.readdirSync(path.join(__dirname, "../controllers")).forEach(async (file) => {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
            const controller: Controller = new ((await import(`../controllers/${file}`)).default)
            Logging.packageRegistration(`Registering controller ${controller.name} (v${controller.version})`)
            if (controllers[controller.name]) {
                Logging.warning(`Controller ${controller.name} is already registered.`)
                return
            }

            controller.init()
            controllers[controller.name] = controller
        } else {
            Logging.warning(`File ${file} is not a controller`)
        }
    })
}

const AwaitController = (name: string): Promise<Controller> => {
    return new Promise((resolve, reject) => {
        var failed = false
        var completed = false

        const interval = setInterval(() => {
            if (controllers[name] && !failed) {
                clearInterval(interval)
                completed = true
                resolve(controllers[name])
            }
        }, 1000)

        setTimeout(() => {
            if(!completed) {
                clearInterval(interval)
                failed = true
                Logging.error(`Controller ${name} search timed out.`)
                reject(false)
            }
        }, Config.ControllerAwaitTimeout)
    });
}

export default {
    controllers,
    registerControllers,
    AwaitController
}