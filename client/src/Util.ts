export function formatTimePlayed(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 100) {
        return `${hours}h ${mins}m`;
    }
    return `${hours}h`;
}