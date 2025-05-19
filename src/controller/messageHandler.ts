import WebSocket from 'ws';
import {
    WebSocketMessage,
    RegistrationData,
    RoomData,
    ShipsData,
    AttackData,
    RandomAttackData
} from '../models/message.js';
import {
    getPlayer,
    addPlayer,
    getPlayerByWs,
    broadcastWinners
} from '../services/playerService.js';
import {
    getRoom,
    addRoom,
    deleteRoom,
    broadcastRooms
} from '../services/roomService.js';
import {
    getGame,
    addGame,
    createEmptyBoard,
    placeShipsOnBoard,
    startGame,
    makeAttack,
    isGameOver,
    endGame,
    getRandomAttackCoordinates
} from '../services/gameService.js';
import {
    generateRandomShips,
    botTurn
} from '../services/botService.js';
import { generateId, sendMessage } from '../utils/helper.js';

export function handleMessage(ws: WebSocket, message: WebSocketMessage): void {
    const { type, data, id } = message;

    switch (type) {
        case 'reg':
            handleRegistration(ws, JSON.parse(data) as RegistrationData);
            break;
        case 'create_room':
            handleCreateRoom(ws);
            break;
        case 'add_user_to_room':
            handleAddUserToRoom(ws, JSON.parse(data) as RoomData);
            break;
        case 'add_ships':
            handleAddShips(ws, JSON.parse(data) as ShipsData);
            break;
        case 'attack':
            handleAttack(ws, JSON.parse(data) as AttackData);
            break;
        case 'randomAttack':
            handleRandomAttack(ws, JSON.parse(data) as RandomAttackData);
            break;
        case 'single_play':
            handleSinglePlay(ws);
            break;
        default:
            console.log(`Unknown message type: ${type}`);
    }
}

export function handleDisconnect(ws: WebSocket): void {
    const player = getPlayerByWs(ws);
    if (player) {
    }
}

function handleRegistration(ws: WebSocket, data: RegistrationData): void {
    const { name, password } = data;

    if (getPlayer(name)) {
        const player = getPlayer(name)!;

        if (player.password !== password) {
            sendMessage(ws, 'reg', JSON.stringify({
                name,
                error: true,
                errorText: 'Wrong password'
            }));
            return;
        }

        player.ws = ws;
        ws.on('close', () => {
            console.log(`Player ${name} disconnected`);
        });

        sendMessage(ws, 'reg', JSON.stringify({
            name,
            index: player.index,
            error: false,
            errorText: ''
        }));
    } else {
        const playerIndex = generateId();
        const player = {
            name,
            password,
            index: playerIndex,
            ws,
            wins: 0
        };

        addPlayer(player);
        ws.on('close', () => {
            console.log(`Player ${name} disconnected`);
        });

        sendMessage(ws, 'reg', JSON.stringify({
            name,
            index: playerIndex,
            error: false,
            errorText: ''
        }));
    }

    broadcastWinners();
    broadcastRooms();
}

function handleCreateRoom(ws: WebSocket): void {
    const player = getPlayerByWs(ws);
    if (!player) {
        return;
    }

    const roomId = generateId();

    const room = {
        roomId,
        roomUsers: [{ name: player.name, index: player.index }]
    };

    addRoom(room);
    broadcastRooms();
}

function handleAddUserToRoom(ws: WebSocket, data: RoomData): void {
    const { indexRoom } = data;

    const player = getPlayerByWs(ws);
    const room = getRoom(indexRoom);

    if (!player || !room) {
        return;
    }

    room.roomUsers.push({ name: player.name, index: player.index });

    const gameId = generateId();
    const game = {
        idGame: gameId,
        players: room.roomUsers.map(user => ({
            name: user.name,
            idPlayer: user.index,
            ships: null,
            board: createEmptyBoard(),
            ready: false
        })),
        currentPlayer: null,
        status: 'waiting' as const,
    };

    addGame(game);

    room.roomUsers.forEach(user => {
        const playerObj = getPlayer(user.name);
        if (playerObj && playerObj.ws) {
            sendMessage(playerObj.ws, 'create_game', JSON.stringify({
                idGame: gameId,
                idPlayer: user.index
            }));
        }
    });

    deleteRoom(indexRoom);

    broadcastRooms();
}

function handleAddShips(ws: WebSocket, data: ShipsData): void {
    const { gameId, ships, indexPlayer } = data;

    const game = getGame(gameId);
    if (!game) {
        return;
    }

    const player = game.players.find(p => p.idPlayer === indexPlayer);
    if (!player) {
        return;
    }

    player.ships = ships;
    player.ready = true;

    placeShipsOnBoard(player);

    if (game.players.every(p => p.ready)) {
        startGame(gameId);
    }

    if (game.isBot && game.status === 'playing') {
        const bot = game.players.find(p => p.name === 'Bot');
        if (bot && game.currentPlayer === bot.idPlayer) {
            botTurn(game);
        }
    }
}

function handleRandomAttack(ws: WebSocket, data: RandomAttackData): void {
    const { gameId, indexPlayer } = data;

    const game = getGame(gameId);
    if (!game) {
        return;
    }

    if (game.currentPlayer !== indexPlayer) {
        return;
    }

    const attacker = game.players.find(p => p.idPlayer === indexPlayer);
    const opponent = game.players.find(p => p.idPlayer !== indexPlayer);

    if (!attacker || !opponent) {
        return;
    }

    const { x, y } = getRandomAttackCoordinates(opponent.board);

    const result = makeAttack(opponent.board, x, y);

    game.players.forEach(p => {
        const player = getPlayer(p.name);
        if (player && player.ws) {
            sendMessage(player.ws, 'attack', JSON.stringify({
                position: { x, y },
                currentPlayer: indexPlayer,
                status: result.status
            }));

            if (result.killedCells && result.killedCells.length > 0) {
                for (const cell of result.killedCells) {
                    sendMessage(player.ws, 'attack', JSON.stringify({
                        position: cell,
                        currentPlayer: indexPlayer,
                        status: 'miss'
                    }));
                }
            }
        }
    });

    if (isGameOver(opponent.board)) {
        endGame(gameId, indexPlayer);
        return;
    }

    game.currentPlayer = result.status === 'miss' ? opponent.idPlayer : attacker.idPlayer;

    game.players.forEach(p => {
        const player = getPlayer(p.name);
        if (player && player.ws) {
            sendMessage(player.ws, 'turn', JSON.stringify({
                currentPlayer: game.currentPlayer
            }));
        }
    });

    if (game.isBot && game.currentPlayer === opponent.idPlayer && opponent.name === 'Bot') {
        botTurn(game);
    }
}

function handleSinglePlay(ws: WebSocket): void {
    const player = getPlayerByWs(ws);
    if (!player) {
        return;
    }

    const botName = 'Bot';
    const botIndex = generateId();

    const gameId = generateId();
    const game = {
        idGame: gameId,
        players: [
            {
                name: player.name,
                idPlayer: player.index,
                ships: null,
                board: createEmptyBoard(),
                ready: false
            },
            {
                name: botName,
                idPlayer: botIndex,
                ships: generateRandomShips(),
                board: createEmptyBoard(),
                ready: true
            }
        ],
        currentPlayer: null,
        status: 'waiting' as const,
        isBot: true
    };

    placeShipsOnBoard(game.players[1]);

    addGame(game);

    sendMessage(ws, 'create_game', JSON.stringify({
        idGame: gameId,
        idPlayer: player.index
    }));
}

function handleAttack(ws: WebSocket, data: AttackData): void {
    const { gameId, x, y, indexPlayer } = data;

    const game = getGame(gameId);
    if (!game) {
        return;
    }

    if (game.currentPlayer !== indexPlayer) {
        return;
    }

    const attacker = game.players.find(p => p.idPlayer === indexPlayer);
    const opponent = game.players.find(p => p.idPlayer !== indexPlayer);

    if (!attacker || !opponent) {
        return;
    }

    const result = makeAttack(opponent.board, x, y);

    game.players.forEach(p => {
        const player = getPlayer(p.name);
        if (player && player.ws) {
            sendMessage(player.ws, 'attack', JSON.stringify({
                position: { x, y },
                currentPlayer: indexPlayer,
                status: result.status
            }));

            if (result.killedCells && result.killedCells.length > 0) {
                for (const cell of result.killedCells) {
                    sendMessage(player.ws, 'attack', JSON.stringify({
                        position: cell,
                        currentPlayer: indexPlayer,
                        status: 'miss'
                    }));
                }
            }
        }
    });

    if (isGameOver(opponent.board)) {
        endGame(gameId, indexPlayer);
        return;
    }

    game.currentPlayer = result.status === 'miss' ? opponent.idPlayer : attacker.idPlayer;

    game.players.forEach(p => {
        const player = getPlayer(p.name);
        if (player && player.ws) {
            sendMessage(player.ws, 'turn', JSON.stringify({
                currentPlayer: game.currentPlayer
            }));
        }
    });

    if (game.isBot && game.currentPlayer === opponent.idPlayer && opponent.name === 'Bot') {
        botTurn(game);
    }
}