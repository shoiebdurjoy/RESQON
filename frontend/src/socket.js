import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['polling', 'websocket'],
});

export function joinRoom(requestId) {
  socket.emit('join_room', { request_id: requestId });
}

export function leaveRoom(requestId) {
  socket.emit('leave_room', { request_id: requestId });
}

export function sendMessage(requestId, senderId, content) {
  socket.emit('send_message', {
    request_id: requestId,
    sender_id: senderId,
    content,
  });
}
