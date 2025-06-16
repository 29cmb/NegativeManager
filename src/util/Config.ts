import { BackendConfiguration } from "../Types";

export default {
    Debug: {
        // Autolaunching
        LaunchBalatroOnStart: false,
        AutolaunchProfile: "Default",

        // Default profile
        CreateDefaultProfile: true,
        DefaultProfileName: "Default",

        // Export testing
        DebugExportMode: true,
        ExportProfile: "Default",
        ExportPath: "C:\\Users\\devcm\\Downloads",

        // Client connection
        ClientPort: 11731
    },
    ControllerAwaitTimeout: 5 * 1000
} as BackendConfiguration