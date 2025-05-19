import WebSocket from 'ws';
import { Room } from '../models/room.js';
import { PlayerInfo } from '../models/player.js';
import { getPlayers } from './playerService.js';
import { sendMessage } from '../utils/helper.js';

const rooms = new Map<string, Room>();

export function getRoom(roomId: string): Room | undefined {
    return rooms.get(roomId);
}

export function addRoom(room: Room): void {
    rooms.set(room.roomId, room);
}

export function deleteRoom(roomId: string): void {
    rooms.delete(roomId);
}

export function getRooms(): Map<string, Room> {
    return rooms;
}

export function addUserToRoom(roomId: string, user: PlayerInfo): void {
    const room = rooms.get(roomId);
    if (room) {
        room.roomUsers.push(user);
    }
}

export function broadcastRooms(): void {
    const roomsData: Room[] = [];

    for (const [roomId, room] of rooms) {
        if (room.roomUsers.length < 2) {
            roomsData.push({
                roomId,
                roomUsers: room.roomUsers
            });
        }
    }

    for (const player of getPlayers().values()) {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
            sendMessage(player.ws, 'update_room', JSON.stringify(roomsData));
        }
    }
}