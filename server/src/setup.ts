import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Store Yjs documents by room ID
const documents = new Map<string, Y.Doc>();

export function setupYjsServer(
  ws: WebSocket, 
  roomId: string, 
  participantId: string,
  participantName: string,
  githubUsername?: string
): void {
  // Get or create Yjs document for this room
  let doc = documents.get(roomId);
  if (!doc) {
    doc = new Y.Doc();
    documents.set(roomId, doc);
    console.log(`Created new Yjs document for room: ${roomId}`);
  }

  // Create a text type for collaborative editing
  const ytext = doc.getText('content');

  // Set up WebSocket provider for this connection
  const provider = new WebsocketProvider(
    'ws://localhost:3001', // This will be replaced with the actual server URL
    roomId,
    doc,
    {
      WebSocketPolyfill: WebSocket,
      connect: false
    }
  );

  // Handle WebSocket messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'sync':
          // Handle document synchronization
          handleSync(ws, doc, data);
          break;
        case 'update':
          // Handle document updates
          handleUpdate(ws, doc, data, participantId, participantName);
          break;
        case 'awareness':
          // Handle cursor positions and selections with participant info
          handleAwareness(ws, data, participantId, participantName, githubUsername);
          break;
        case 'participant_info':
          // Handle participant information updates
          handleParticipantInfo(ws, data, participantId, participantName, githubUsername);
          break;
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    provider.destroy();
    console.log(`Client ${participantName} disconnected from room ${roomId}`);
  });

  // Send initial document state with participant info
  const initialContent = ytext.toString();
  ws.send(JSON.stringify({
    type: 'init',
    content: initialContent,
    roomId: roomId,
    participantId: participantId,
    participantName: participantName,
    githubUsername: githubUsername,
    avatar: githubUsername ? `https://github.com/${githubUsername}.png` : undefined
  }));
}

function handleSync(ws: WebSocket, doc: Y.Doc, data: any): void {
  const ytext = doc.getText('content');
  
  // Send current document state
  ws.send(JSON.stringify({
    type: 'sync',
    content: ytext.toString(),
    version: doc.store.clients.size
  }));
}

function handleUpdate(
  ws: WebSocket, 
  doc: Y.Doc, 
  data: any, 
  participantId: string,
  participantName: string
): void {
  const ytext = doc.getText('content');
  
  try {
    // Apply the update to the Yjs document
    if (data.operation === 'insert') {
      ytext.insert(data.index, data.text);
    } else if (data.operation === 'delete') {
      ytext.delete(data.index, data.length);
    }
    
    // Broadcast the update to all connected clients with participant info
    broadcastUpdate(ws, {
      type: 'update',
      operation: data.operation,
      index: data.index,
      text: data.text,
      length: data.length,
      participantId: participantId,
      participantName: participantName,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error applying update:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to apply update'
    }));
  }
}

function handleAwareness(
  ws: WebSocket, 
  data: any, 
  participantId: string,
  participantName: string,
  githubUsername?: string
): void {
  // Broadcast cursor positions and selections to other clients with participant info
  broadcastUpdate(ws, {
    type: 'awareness',
    participantId: participantId,
    participantName: participantName,
    githubUsername: githubUsername,
    avatar: githubUsername ? `https://github.com/${githubUsername}.png` : undefined,
    cursor: data.cursor,
    selection: data.selection,
    timestamp: Date.now()
  });
}

function handleParticipantInfo(
  ws: WebSocket,
  data: any,
  participantId: string,
  participantName: string,
  githubUsername?: string
): void {
  // Handle participant information updates
  broadcastUpdate(ws, {
    type: 'participant_info',
    participantId: participantId,
    participantName: participantName,
    githubUsername: githubUsername,
    avatar: githubUsername ? `https://github.com/${githubUsername}.png` : undefined,
    action: data.action, // 'join', 'leave', 'update'
    timestamp: Date.now()
  });
}

function broadcastUpdate(sender: WebSocket, message: any): void {
  // This would typically broadcast to all clients in the same room
  // For now, we'll just log the message
  console.log('Broadcasting update:', message);
}

// Clean up documents when rooms are closed
export function cleanupDocument(roomId: string): void {
  const doc = documents.get(roomId);
  if (doc) {
    doc.destroy();
    documents.delete(roomId);
    console.log(`Cleaned up document for room: ${roomId}`);
  }
} 