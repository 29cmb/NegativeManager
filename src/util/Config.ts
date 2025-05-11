import { BackendConfiguration } from "../Types";

export default {
    Debug: {
        // Autolaunching
        LaunchBalatroOnStart: true,
        AutolaunchProfile: "Cryptid",

        // Default profile
        CreateDefaultProfile: false,
        DefaultProfileName: "Default",

        // Client connection
        ClientPort: 11731
    },
    ControllerAwaitTimeout: 5 * 1000
} as BackendConfiguration