export enum LogLevel {
    INFO,
    SUCCESS,
    PACKAGE_REGISTRATION,
    WARNING,
    ERROR,
    DEBUG,
    BOOTING,
    ASYNC_TASK,
    OTHER
}

export interface Controller {
    name: string;
    description: string;
    version: string;
    init(): void;
}

export type BackendConfiguration = {
    Debug: {
        LaunchBalatroOnStart: boolean,
        AutolaunchProfile: string | undefined
    },
    ControllerAwaitTimeout: number
}

export type ManagerConfiguration = {
    balatro_data_path: string;
    balatro_steam_path: string;
    profiles_directory: string;
}