export enum LogLevel {
    INFO,
    SUCCESS,
    PACKAGE_REGISTRATION,
    WARNING,
    ERROR,
    DEBUG,
    BOOTING,
    OTHER
}

export interface Controller {
    name: string;
    description: string;
    version: string;
    init(): void;
}