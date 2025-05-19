import { Ship } from '../models/ship.js';
import { Board, CellState, Position } from '../models/board.js';
import { createEmptyBoard, makeAttack, isGameOver, getRandomAttackCoordinates } from './gameService.js';
import { getPlayer } from './playerService.js';
import {Game} from "../models/game.js";
import {sendMessage} from "../utils/helper.js";

// Ship configuration
const shipConfig = [
    { type: 'huge' as const, length: 4, count: 1 },
    { type: 'large' as const, length: 3, count: 2 },
    { type: 'medium' as const, length: 2, count: 3 },
    { type: 'small' as const, length: 1, count: 4 }
];

export function generateRandomShips(): Ship[] {
    const ships: Ship[] = [];

    // Create temporary board for ship placement
    const tempBoard = createEmptyBoard();

    for (const shipType of shipConfig) {
        for (let i = 0; i < shipType.count; i++) {
            let ship: Ship | null = null;
            let placed = false;

            // Try to place the ship until successful
            while (!placed) {
                const direction = Math.random() > 0.5; // random direction
                const x = Math.floor(Math.random() * (direction ? 10 : (10 - shipType.length + 1)));
                const y = Math.floor(Math.random() * (direction ? (10 - shipType.length + 1) : 10));

                // Check if ship can be placed
                let canPlace = true;
                for (let j = 0; j < shipType.length; j++) {
                    const checkX = direction ? x : x + j;
                    const checkY = direction ? y + j : y;

                    // Check ship and surrounding cells
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const cx = checkX + dx;
                            const cy = checkY + dy;

                            if (cx >= 0 && cx < 10 && cy >= 0 && cy < 10 && tempBoard[cy][cx] === CellState.Ship) {
                                canPlace = false;
                                break;
                            }
                        }
                        if (!canPlace) break;
                    }
                    if (!canPlace) break;
                }

                if (canPlace) {
                    // Place ship on temporary board
                    for (let j = 0; j < shipType.length; j++) {
                        const shipX = direction ? x : x + j;
                        const shipY = direction ? y + j : y;
                        tempBoard[shipY][shipX] = CellState.Ship;
                    }

                    ship = {
                        position: { x, y },
                        direction,
                        length: shipType.length,
                        type: shipType.type
                    };

                    ships.push(ship);
                    placed = true;
                }
            }
        }
    }

    return ships;
}

export function botTurn(game: Game): void {
    if (!game || !game.isBot || game.status !== 'playing') {
        return;
    }

    // Find human player and bot
    const humanPlayer = game.players.find(p => p.name !== 'Bot');
    const bot = game.players.find(p => p.name === 'Bot');

    if (!humanPlayer || !bot) return;

    // Check if it's bot's turn
    if (game.currentPlayer !== bot.idPlayer) {
        return;
    }

    // Add delay to make it seem like the bot is thinking
    setTimeout(() => {
        // Get smart attack coordinates
        const { x, y } = getSmartAttackCoordinates(humanPlayer.board);

        // Make attack
        const result = makeAttack(humanPlayer.board, x, y);

        const human = getPlayer(humanPlayer.name);
        if (human && human.ws) {
            sendMessage(human.ws, 'attack', JSON.stringify({
                position: { x, y },
                currentPlayer: bot.idPlayer,
                status: result.status
            }));

            if (result.killedCells && result.killedCells.length > 0) {
                for (const cell of result.killedCells) {
                    sendMessage(human.ws, 'attack', JSON.stringify({
                        position: cell,
                        currentPlayer: bot.idPlayer,
                        status: 'miss'
                    }));
                }
            }
        }

        if (isGameOver(humanPlayer.board)) {
            game.status = 'finished';
            if (human && human.ws) {
                sendMessage(human.ws, 'finish', JSON.stringify({
                    winPlayer: bot.idPlayer
                }));
            }
            return;
        }

        game.currentPlayer = result.status === 'miss' ? humanPlayer.idPlayer : bot.idPlayer;

        if (human && human.ws) {
            sendMessage(human.ws, 'turn', JSON.stringify({
                currentPlayer: game.currentPlayer
            }));
        }

        if (game.currentPlayer === bot.idPlayer) {
            botTurn(game);
        }
    }, 1000);
}

export function getSmartAttackCoordinates(board: Board): Position {
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            if (board[y][x] === CellState.Hit) {
                const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];

                for (const [dx, dy] of directions) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 &&
                        (board[ny][nx] === CellState.Empty || board[ny][nx] === CellState.Ship)) {
                        return { x: nx, y: ny };
                    }
                }
            }
        }
    }

    return getRandomAttackCoordinates(board);
}