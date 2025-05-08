import { Controller } from "../Types";
import Logging from "../util/Logging";

export default class BalatroController implements Controller {
    public name: string = "BalatroController";
    public description: string = "Controller for interfacing with Balatro mod loaders.";
    public version: string = "1.0.0";

    public init(): void {
        
    }
}