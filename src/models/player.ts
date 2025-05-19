import WebSocket from 'ws';

export interface Player {
    name: string;
    password: string;
    index: string;
    ws: WebSocket;
    wins: number;
}

export interface PlayerInfo {
    name: string;
    index: string;
}

export interface WinnerInfo {
    name: string;
    wins: number;
}