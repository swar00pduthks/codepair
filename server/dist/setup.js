"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupYjsServer = setupYjsServer;
exports.cleanupDocument = cleanupDocument;
const ws_1 = require("ws");
const Y = __importStar(require("yjs"));
const y_websocket_1 = require("y-websocket");
// Store Yjs documents by room ID
const documents = new Map();
function setupYjsServer(ws, roomId, participantId, participantName, githubUsername) {
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
    const provider = new y_websocket_1.WebsocketProvider('ws://localhost:3001', // This will be replaced with the actual server URL
    roomId, doc, {
        WebSocketPolyfill: ws_1.WebSocket,
        connect: false
    });
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
        }
        catch (error) {
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
function handleSync(ws, doc, data) {
    const ytext = doc.getText('content');
    // Send current document state
    ws.send(JSON.stringify({
        type: 'sync',
        content: ytext.toString(),
        version: doc.store.clients.size
    }));
}
function handleUpdate(ws, doc, data, participantId, participantName) {
    const ytext = doc.getText('content');
    try {
        // Apply the update to the Yjs document
        if (data.operation === 'insert') {
            ytext.insert(data.index, data.text);
        }
        else if (data.operation === 'delete') {
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
    }
    catch (error) {
        console.error('Error applying update:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to apply update'
        }));
    }
}
function handleAwareness(ws, data, participantId, participantName, githubUsername) {
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
function handleParticipantInfo(ws, data, participantId, participantName, githubUsername) {
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
function broadcastUpdate(sender, message) {
    // This would typically broadcast to all clients in the same room
    // For now, we'll just log the message
    console.log('Broadcasting update:', message);
}
// Clean up documents when rooms are closed
function cleanupDocument(roomId) {
    const doc = documents.get(roomId);
    if (doc) {
        doc.destroy();
        documents.delete(roomId);
        console.log(`Cleaned up document for room: ${roomId}`);
    }
}
//# sourceMappingURL=setup.js.map