import { PlayerInfo } from './player.js';

export interface Room {
    roomId: string;
    roomUsers: PlayerInfo[];
}