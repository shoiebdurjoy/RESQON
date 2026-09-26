import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const socket = io(BACKEND_URL, {
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
