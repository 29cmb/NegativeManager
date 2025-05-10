import { LogLevel } from '../Types';

const messages = {
    [LogLevel.INFO]: '💼 | %s',
    [LogLevel.SUCCESS]: '✅ | %s',
    [LogLevel.PACKAGE_REGISTRATION]: '📦 | %s',
    [LogLevel.WARNING]: '⚠️ | %s',
    [LogLevel.ERROR]: '❌ | %s',
    [LogLevel.DEBUG]: '🛠️  | %s', // requires an extra space for whatever reason
    [LogLevel.BOOTING]: '🚀 | %s',
    [LogLevel.ASYNC_TASK]: '⏳ | %s',
    [LogLevel.OTHER]: '%s',
}

const log = (message: string, level: LogLevel) => {
    if(message === undefined || message === null) {
        error('Message is undefined or null'); // i used the logging to destroy the logging. recursion 🤑
        return;
    }

    const template = messages[level] || messages[LogLevel.OTHER];
    const formattedMessage = template.replace('%s', message);

    console.log(formattedMessage)
}

const info = (message: string) => log(message, LogLevel.INFO);
const success = (message: string) => log(message, LogLevel.SUCCESS);
const packageRegistration = (message: string) => log(message, LogLevel.PACKAGE_REGISTRATION);
const warning = (message: string) => log(message, LogLevel.WARNING);
const error = (message: string) => log(message, LogLevel.ERROR);
const debug = (message: string) => log(message, LogLevel.DEBUG);
const booting = (message: string) => log(message, LogLevel.BOOTING);
const asyncTask = (message: string) => log(message, LogLevel.ASYNC_TASK);
const other = (message: string) => log(message, LogLevel.OTHER);

export default {
    log,
    info,
    success,
    packageRegistration,
    warning,
    error,
    debug,
    booting,
    asyncTask,
    other
}