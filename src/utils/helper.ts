import WebSocket from 'ws';

export function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function sendMessage(ws: WebSocket, type: string, data: string, id: number = 0): void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type,
            data,
            id
        }));
    }
}

export function broadcastMessage(connections: WebSocket[], type: string, data: string, id: number = 0): void {
    connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            sendMessage(ws, type, data, id);
        }
    });
}

export function positionsEqual(pos1: { x: number, y: number }, pos2: { x: number, y: number }): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y;
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function create2DArray<T>(rows: number, cols: number, value: T): T[][] {
    return Array(rows).fill(null).map(() => Array(cols).fill(value));
}

export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function formatDate(date: Date): string {
    return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

export function logWithTime(message: string): void {
    console.log(`[${formatDate(new Date())}] ${message}`);
}