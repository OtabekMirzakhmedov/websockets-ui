import {Ship} from "./ship.js";

export interface WebSocketMessage {
    type: string;
    data: string;
    id: number;
}

export interface RegistrationData {
    name: string;
    password: string;
}

export interface RoomData {
    indexRoom: string;
}

export interface ShipsData {
    gameId: string;
    ships: Ship[];
    indexPlayer: string;
}

export interface AttackData {
    gameId: string;
    x: number;
    y: number;
    indexPlayer: string;
}

export interface RandomAttackData {
    gameId: string;
    indexPlayer: string;
}