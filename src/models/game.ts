import { Board } from './board.js';
import { Ship } from './ship.js';

export interface GamePlayer {
    name: string;
    idPlayer: string;
    ships: Ship[] | null;
    board: Board;
    ready: boolean;
}

export interface Game {
    idGame: string;
    players: GamePlayer[];
    currentPlayer: string | null;
    status: 'waiting' | 'playing' | 'finished';
    isBot?: boolean;
}