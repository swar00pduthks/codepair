import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { setupYjsServer } from './setup';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Store active collaboration rooms with participant details
const activeRooms = new Map<string, {
  roomId: string;
  participants: Map<string, {
    id: string;
    name: string;
    githubUsername?: string;
    avatar?: string;
    joinedAt: Date;
    lastSeen: Date;
  }>;
  createdAt: Date;
}>();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeRooms: activeRooms.size,
    timestamp: new Date().toISOString()
  });
});

// Get active rooms with participant details
app.get('/rooms', (req, res) => {
  const rooms = Array.from(activeRooms.entries()).map(([roomId, room]) => ({
    roomId,
    participants: Array.from(room.participants.values()).map(p => ({
      id: p.id,
      name: p.name,
      githubUsername: p.githubUsername,
      avatar: p.avatar,
      joinedAt: p.joinedAt,
      lastSeen: p.lastSeen
    })),
    createdAt: room.createdAt
  }));
  res.json(rooms);
});

// Create a new collaboration room
app.post('/rooms', (req, res) => {
  const roomId = uuidv4();
  activeRooms.set(roomId, {
    roomId,
    participants: new Map(),
    createdAt: new Date()
  });
  
  console.log(`Created new room: ${roomId}`);
  res.json({ roomId, message: 'Room created successfully' });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('room');
  const participantName = url.searchParams.get('name') || 'Anonymous';
  const githubUsername = url.searchParams.get('github') || undefined;
  
  if (!roomId) {
    ws.close(1008, 'Room ID required');
    return;
  }

  const room = activeRooms.get(roomId);
  if (!room) {
    ws.close(1008, 'Room not found');
    return;
  }

  // Generate participant ID
  const participantId = uuidv4();
  
  // Add participant to room
  room.participants.set(participantId, {
    id: participantId,
    name: participantName,
    githubUsername,
    avatar: githubUsername ? `https://github.com/${githubUsername}.png` : undefined,
    joinedAt: new Date(),
    lastSeen: new Date()
  });

  console.log(`Client ${participantName} connected to room ${roomId}. Total participants: ${room.participants.size}`);

  // Set up Yjs collaboration with participant info
  setupYjsServer(ws, roomId, participantId, participantName, githubUsername);

  // Send participant list to all clients in the room
  broadcastParticipantList(roomId);

  ws.on('close', () => {
    // Remove participant from room
    room.participants.delete(participantId);
    console.log(`Client ${participantName} disconnected from room ${roomId}. Total participants: ${room.participants.size}`);
    
    // Remove room if no participants
    if (room.participants.size === 0) {
      activeRooms.delete(roomId);
      console.log(`Room ${roomId} closed - no participants remaining`);
    } else {
      // Update participant list for remaining participants
      broadcastParticipantList(roomId);
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error in room ${roomId}:`, error);
    room.participants.delete(participantId);
    broadcastParticipantList(roomId);
  });

  // Handle ping/pong for keeping track of last seen
  ws.on('pong', () => {
    const participant = room.participants.get(participantId);
    if (participant) {
      participant.lastSeen = new Date();
    }
  });
});

function broadcastParticipantList(roomId: string): void {
  const room = activeRooms.get(roomId);
  if (!room) return;

  const participants = Array.from(room.participants.values()).map(p => ({
    id: p.id,
    name: p.name,
    githubUsername: p.githubUsername,
    avatar: p.avatar,
    joinedAt: p.joinedAt
  }));

  const message = JSON.stringify({
    type: 'participants',
    participants
  });

  // Broadcast to all clients in the room
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      const clientUrl = new URL((client as any).url, 'http://localhost');
      if (clientUrl.searchParams.get('room') === roomId) {
        client.send(message);
      }
    }
  });
}

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 CodePair Yjs Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Active rooms: http://localhost:${PORT}/rooms`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 