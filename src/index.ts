import Logging from "./util/Logging";
import Registry from "./util/Registry";

Logging.booting("Starting application...");
Registry.registerControllers();