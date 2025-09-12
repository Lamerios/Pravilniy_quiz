/**
 * Socket.IO service for real-time communication
 * Handles game updates and scoreboard synchronization
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { SocketEvents } from '../types/shared';

/**
 * Setup Socket.IO event handlers
 * @param io - Socket.IO server instance
 */
export function setupSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    logger.info('Client connected', { socketId: socket.id });

    // Handle joining a game room
    socket.on('join-game', (gameId: number) => {
      const roomName = `game-${gameId}`;
      socket.join(roomName);
      logger.info('Client joined game room', { 
        socketId: socket.id, 
        gameId, 
        room: roomName 
      });
    });

    // Handle leaving a game room
    socket.on('leave-game', (gameId: number) => {
      const roomName = `game-${gameId}`;
      socket.leave(roomName);
      logger.info('Client left game room', { 
        socketId: socket.id, 
        gameId, 
        room: roomName 
      });
    });

    // Handle client disconnection
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', { 
        socketId: socket.id, 
        reason 
      });
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error('Socket error', { 
        socketId: socket.id, 
        error: error.message 
      });
    });
  });
}

/**
 * Broadcast game update to all clients in game room
 * @param io - Socket.IO server instance
 * @param gameId - Game ID
 * @param game - Updated game data
 */
export function broadcastGameUpdate(io: SocketIOServer, gameId: number, game: any): void {
  const roomName = `game-${gameId}`;
  io.to(roomName).emit('game-updated', game);
  logger.debug('Game update broadcasted', { gameId, room: roomName });
}

/**
 * Broadcast score update to all clients in game room
 * @param io - Socket.IO server instance
 * @param gameId - Game ID
 * @param scores - Updated scores data
 */
export function broadcastScoresUpdate(io: SocketIOServer, gameId: number, scores: any[]): void {
  const roomName = `game-${gameId}`;
  io.to(roomName).emit('scores-updated', scores);
  logger.debug('Scores update broadcasted', { gameId, room: roomName, scoresCount: scores.length });
}

/**
 * Broadcast round change to all clients in game room
 * @param io - Socket.IO server instance
 * @param gameId - Game ID
 * @param roundNumber - New round number
 */
export function broadcastRoundChange(io: SocketIOServer, gameId: number, roundNumber: number): void {
  const roomName = `game-${gameId}`;
  io.to(roomName).emit('round-changed', gameId, roundNumber);
  logger.debug('Round change broadcasted', { gameId, roundNumber, room: roomName });
}

/**
 * Broadcast game status change to all clients in game room
 * @param io - Socket.IO server instance
 * @param gameId - Game ID
 * @param status - New game status
 */
export function broadcastGameStatusChange(io: SocketIOServer, gameId: number, status: string): void {
  const roomName = `game-${gameId}`;
  io.to(roomName).emit('game-status-changed', gameId, status);
  logger.debug('Game status change broadcasted', { gameId, status, room: roomName });
}

