import WebSocket from 'ws';
import { Player, PlayerInfo, WinnerInfo } from '../models/player.js';
import { sendMessage } from '../utils/helper.js';

const players = new Map<string, Player>();
const winners: WinnerInfo[] = [];

export function getPlayer(name: string): Player | undefined {
    return players.get(name);
}

export function addPlayer(player: Player): void {
    players.set(player.name, player);
}

export function getPlayers(): Map<string, Player> {
    return players;
}


export function getPlayerByWs(ws: WebSocket): Player | undefined {
    for (const player of players.values()) {
        if (player.ws === ws) {
            return player;
        }
    }
    return undefined;
}

export function addWin(playerName: string): void {
    const winnerIndex = winners.findIndex(w => w.name === playerName);

    if (winnerIndex !== -1) {
        winners[winnerIndex].wins++;
    } else {
        winners.push({ name: playerName, wins: 1 });
    }

    winners.sort((a, b) => b.wins - a.wins);
}

export function getWinners(): WinnerInfo[] {
    return [...winners];
}

export function broadcastWinners(): void {
    for (const player of players.values()) {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
            sendMessage(player.ws, 'update_winners', JSON.stringify(winners));
        }
    }
}