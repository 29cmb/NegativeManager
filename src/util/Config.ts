import { BackendConfiguration } from "../Types";

export default {
    Debug: {
        // Autolaunching
        LaunchBalatroOnStart: true,
        AutolaunchProfile: undefined,

        // Default profile
        CreateDefaultProfile: true,
        DefaultProfileName: "Default",
    },
    ControllerAwaitTimeout: 5 * 1000
} as BackendConfiguration