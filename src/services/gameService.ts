import WebSocket from 'ws';
import { Game, GamePlayer } from '../models/game.js';
import { Board, CellState, AttackResult, Position } from '../models/board.js';
import { getPlayer, addWin, broadcastWinners } from './playerService.js';
import { sendMessage } from '../utils/helper.js';

const games = new Map<string, Game>();

export function getGame(gameId: string): Game | undefined {
    return games.get(gameId);
}

export function addGame(game: Game): void {
    games.set(game.idGame, game);
}

export function deleteGame(gameId: string): void {
    games.delete(gameId);
}

export function createEmptyBoard(): Board {
    const board: Board = [];
    for (let i = 0; i < 10; i++) {
        board[i] = [];
        for (let j = 0; j < 10; j++) {
            board[i][j] = CellState.Empty;
        }
    }
    return board;
}

export function placeShipsOnBoard(player: GamePlayer): void {
    if (!player.ships) return;

    player.ships.forEach(ship => {
        const { position, direction, length } = ship;
        const { x, y } = position;

        for (let i = 0; i < length; i++) {
            if (direction) {
                player.board[y + i][x] = CellState.Ship;
            } else {
                player.board[y][x + i] = CellState.Ship;
            }
        }
    });
}

export function startGame(gameId: string): void {
    const game = games.get(gameId);
    if (!game) return;

    const firstPlayerIndex = Math.floor(Math.random() * 2);
    game.currentPlayer = game.players[firstPlayerIndex].idPlayer;

    game.players.forEach(p => {
        const player = getPlayer(p.name);
        if (player && player.ws && player.ws.readyState === WebSocket.OPEN) {
            sendMessage(player.ws, 'start_game', JSON.stringify({
                ships: p.ships,
                currentPlayerIndex: p.idPlayer
            }));

            sendMessage(player.ws, 'turn', JSON.stringify({
                currentPlayer: game.currentPlayer
            }));
        }
    });

    game.status = 'playing';
}

export function makeAttack(board: Board, x: number, y: number): AttackResult {
    if (x < 0 || x >= 10 || y < 0 || y >= 10) {
        return { status: 'miss' };
    }

    if (board[y][x] === CellState.Empty) {
        board[y][x] = CellState.Miss;
        return { status: 'miss' };
    } else if (board[y][x] === CellState.Ship) {
        board[y][x] = CellState.Hit;

        if (isShipKilled(board, x, y)) {
            const killedCells = markAroundKilledShip(board, x, y);
            return { status: 'killed', killedCells };
        }

        return { status: 'shot' };
    }

    return { status: 'miss' };
}

export function isShipKilled(board: Board, x: number, y: number): boolean {
    const shipCells: Position[] = [];
    const visited: boolean[][] = Array(10).fill(0).map(() => Array(10).fill(false));

    function dfs(x: number, y: number): void {
        if (x < 0 || x >= 10 || y < 0 || y >= 10 || visited[y][x]) {
            return;
        }

        visited[y][x] = true;

        if (board[y][x] === CellState.Hit) {
            shipCells.push({ x, y });
            dfs(x + 1, y);
            dfs(x - 1, y);
            dfs(x, y + 1);
            dfs(x, y - 1);
        }
    }

    dfs(x, y);

    for (const cell of shipCells) {
        const { x, y } = cell;

        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 &&
                board[ny][nx] === CellState.Ship) {
                return false;
            }
        }
    }

    return true;
}

export function markAroundKilledShip(board: Board, x: number, y: number): Position[] {
    const shipCells: Position[] = [];
    const visited: boolean[][] = Array(10).fill(0).map(() => Array(10).fill(false));

    function dfs(x: number, y: number): void {
        if (x < 0 || x >= 10 || y < 0 || y >= 10 || visited[y][x]) {
            return;
        }

        visited[y][x] = true;

        if (board[y][x] === CellState.Hit) {
            shipCells.push({ x, y });
            dfs(x + 1, y);
            dfs(x - 1, y);
            dfs(x, y + 1);
            dfs(x, y - 1);
        }
    }

    dfs(x, y);

    const markedCells: Position[] = [];

    for (const cell of shipCells) {
        const { x, y } = cell;

        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 &&
                    board[ny][nx] === CellState.Empty) {
                    board[ny][nx] = CellState.Miss;
                    markedCells.push({ x: nx, y: ny });
                }
            }
        }
    }

    return markedCells;
}

export function isGameOver(board: Board): boolean {
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            if (board[i][j] === CellState.Ship) {
                return false;
            }
        }
    }
    return true;
}

export function getRandomAttackCoordinates(board: Board): Position {
    let x: number, y: number;

    do {
        x = Math.floor(Math.random() * 10);
        y = Math.floor(Math.random() * 10);
    } while (board[y][x] === CellState.Miss || board[y][x] === CellState.Hit);

    return { x, y };
}

export function endGame(gameId: string, winnerId: string): void {
    const game = games.get(gameId);
    if (!game) return;

    const winner = game.players.find(p => p.idPlayer === winnerId);
    if (winner) {
        addWin(winner.name);
    }

    game.players.forEach(p => {
        const player = getPlayer(p.name);
        if (player && player.ws && player.ws.readyState === WebSocket.OPEN) {
            sendMessage(player.ws, 'finish', JSON.stringify({
                winPlayer: winnerId
            }));
        }
    });

    broadcastWinners();

    games.delete(gameId);
}