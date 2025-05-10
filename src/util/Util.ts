import * as fs from 'fs'
export const waitForFile = (filePath: string, timeout: number = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            if (fs.existsSync(filePath)) {
                clearInterval(interval);
                resolve();
            } else if (Date.now() - start > timeout) {
                clearInterval(interval);
                reject(new Error(`Timeout waiting for file: ${filePath}`));
            }
        }, 100);
    });
};