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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborationManager = void 0;
const vscode = __importStar(require("vscode"));
const Y = __importStar(require("yjs"));
const y_websocket_1 = require("y-websocket");
const ws_1 = __importDefault(require("ws"));
const node_fetch_1 = __importDefault(require("node-fetch"));
class CollaborationManager {
    constructor(context) {
        this.doc = null;
        this.provider = null;
        this.roomId = null;
        this.participantId = null;
        this.participantName = 'Anonymous';
        this.isCollaborating = false;
        this.stateChangeCallbacks = [];
        this.participants = new Map();
        this.remoteCursors = new Map();
        this.cursorDecorations = [];
        this.context = context;
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.text = '$(sync) CodePair';
        this.statusBarItem.tooltip = 'Click to start collaboration';
        this.statusBarItem.command = 'codepair.startCollaboration';
        this.statusBarItem.show();
        // Create output channel for logging
        this.outputChannel = vscode.window.createOutputChannel('CodePair');
    }
    async startCollaboration() {
        if (this.isCollaborating) {
            throw new Error('Already collaborating');
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No active text editor');
        }
        // Get participant information
        await this.getParticipantInfo();
        try {
            this.outputChannel.appendLine('Starting collaboration...');
            // Create a new room
            const roomId = await this.createRoom();
            if (!roomId) {
                throw new Error('Failed to create room');
            }
            // Initialize Yjs document
            this.doc = new Y.Doc();
            const ytext = this.doc.getText('content');
            // Get server URL from configuration with error handling
            let serverUrl = 'ws://localhost:3001';
            try {
                serverUrl = vscode.workspace.getConfiguration('codepair').get('serverUrl', 'ws://localhost:3001');
            }
            catch (error) {
                this.outputChannel.appendLine(`Warning: Could not read workspace configuration, using default server URL: ${error}`);
            }
            const httpUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
            // Set up WebSocket provider with participant info
            const wsUrl = `${serverUrl}?room=${roomId}&name=${encodeURIComponent(this.participantName)}${this.githubUsername ? `&github=${encodeURIComponent(this.githubUsername)}` : ''}`;
            this.provider = new y_websocket_1.WebsocketProvider(serverUrl, roomId, this.doc, {
                WebSocketPolyfill: ws_1.default
            });
            this.roomId = roomId;
            // Set up document synchronization
            this.setupDocumentSync(editor, ytext);
            // Set up awareness (cursor positions, selections)
            this.setupAwareness();
            // Set up participant management
            this.setupParticipantManagement();
            this.isCollaborating = true;
            this.updateStatusBar();
            this.notifyStateChange();
            this.outputChannel.appendLine(`Collaboration started! Room ID: ${roomId}`);
            // Show room ID in a notification
            vscode.window.showInformationMessage(`Collaboration started! Room ID: ${roomId}`, 'Copy Room ID', 'Stop Collaboration').then(selection => {
                if (selection === 'Copy Room ID') {
                    vscode.env.clipboard.writeText(roomId);
                    vscode.window.showInformationMessage('Room ID copied to clipboard!');
                }
                else if (selection === 'Stop Collaboration') {
                    this.stopCollaboration();
                }
            });
            return roomId;
        }
        catch (error) {
            this.outputChannel.appendLine(`Error starting collaboration: ${error}`);
            await this.cleanup();
            throw error;
        }
    }
    async joinCollaboration(roomId) {
        if (this.isCollaborating) {
            throw new Error('Already collaborating');
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No active text editor');
        }
        // Get participant information
        await this.getParticipantInfo();
        try {
            this.outputChannel.appendLine(`Joining collaboration room: ${roomId}`);
            // Initialize Yjs document
            this.doc = new Y.Doc();
            const ytext = this.doc.getText('content');
            // Get server URL from configuration with error handling
            let serverUrl = 'ws://localhost:3001';
            try {
                serverUrl = vscode.workspace.getConfiguration('codepair').get('serverUrl', 'ws://localhost:3001');
            }
            catch (error) {
                this.outputChannel.appendLine(`Warning: Could not read workspace configuration, using default server URL: ${error}`);
            }
            const httpUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
            // Set up WebSocket provider with participant info
            const wsUrl = `${serverUrl}?room=${roomId}&name=${encodeURIComponent(this.participantName)}${this.githubUsername ? `&github=${encodeURIComponent(this.githubUsername)}` : ''}`;
            this.provider = new y_websocket_1.WebsocketProvider(serverUrl, roomId, this.doc, {
                WebSocketPolyfill: ws_1.default
            });
            this.roomId = roomId;
            // Set up document synchronization
            this.setupDocumentSync(editor, ytext);
            // Set up awareness (cursor positions, selections)
            this.setupAwareness();
            // Set up participant management
            this.setupParticipantManagement();
            this.isCollaborating = true;
            this.updateStatusBar();
            this.notifyStateChange();
            this.outputChannel.appendLine(`Successfully joined room: ${roomId}`);
            vscode.window.showInformationMessage(`Joined collaboration room: ${roomId}`);
        }
        catch (error) {
            this.outputChannel.appendLine(`Error joining collaboration: ${error}`);
            await this.cleanup();
            throw error;
        }
    }
    async getParticipantInfo() {
        // Get participant name
        const name = await vscode.window.showInputBox({
            prompt: 'Enter your name',
            placeHolder: 'Your name',
            value: this.participantName,
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return 'Name is required';
                }
                return null;
            }
        });
        if (name) {
            this.participantName = name.trim();
        }
        // Get GitHub username (optional)
        const github = await vscode.window.showInputBox({
            prompt: 'Enter your GitHub username (optional)',
            placeHolder: 'github-username',
            value: this.githubUsername || ''
        });
        if (github && github.trim()) {
            this.githubUsername = github.trim();
        }
    }
    async stopCollaboration() {
        if (!this.isCollaborating) {
            return;
        }
        this.outputChannel.appendLine('Stopping collaboration...');
        await this.cleanup();
        this.isCollaborating = false;
        this.updateStatusBar();
        this.notifyStateChange();
        vscode.window.showInformationMessage('Collaboration stopped.');
    }
    async createRoom() {
        let serverUrl = 'ws://localhost:3001';
        try {
            serverUrl = vscode.workspace.getConfiguration('codepair').get('serverUrl', 'ws://localhost:3001');
        }
        catch (error) {
            this.outputChannel.appendLine(`Warning: Could not read workspace configuration, using default server URL: ${error}`);
        }
        const httpUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');
        try {
            // Use fetch instead of Node.js http module
            const response = await (0, node_fetch_1.default)(`${httpUrl}/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data.roomId;
        }
        catch (error) {
            this.outputChannel.appendLine(`Error creating room: ${error}`);
            return null;
        }
    }
    setupDocumentSync(editor, ytext) {
        if (!this.doc)
            return;
        // Sync initial content
        const currentContent = editor.document.getText();
        ytext.delete(0, ytext.length);
        ytext.insert(0, currentContent);
        // Listen for Yjs changes and apply to VS Code
        ytext.observe((event) => {
            event.changes.delta.forEach((delta) => {
                if (delta.insert) {
                    // Handle insertions
                    const position = this.getPositionFromIndex(editor.document, delta.retain || 0);
                    editor.edit((editBuilder) => {
                        editBuilder.insert(position, delta.insert);
                    });
                }
                else if (delta.delete) {
                    // Handle deletions
                    const position = this.getPositionFromIndex(editor.document, delta.retain || 0);
                    const endPosition = this.getPositionFromIndex(editor.document, (delta.retain || 0) + delta.delete);
                    editor.edit((editBuilder) => {
                        editBuilder.delete(new vscode.Range(position, endPosition));
                    });
                }
            });
        });
        // Listen for VS Code changes and apply to Yjs
        const changeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document === editor.document) {
                event.contentChanges.forEach((change) => {
                    if (change.rangeLength > 0) {
                        // Deletion
                        const index = this.getIndexFromPosition(editor.document, change.range.start);
                        ytext.delete(index, change.rangeLength);
                    }
                    if (change.text) {
                        // Insertion
                        const index = this.getIndexFromPosition(editor.document, change.range.start);
                        ytext.insert(index, change.text);
                    }
                });
            }
        });
        this.context.subscriptions.push(changeDisposable);
    }
    setupAwareness() {
        if (!this.provider)
            return;
        // Set up awareness for cursor positions and selections
        const awareness = this.provider.awareness;
        // Update awareness when cursor/selection changes
        const selectionChangeDisposable = vscode.window.onDidChangeTextEditorSelection((event) => {
            if (awareness) {
                const selections = event.selections.map(selection => ({
                    anchor: selection.anchor,
                    active: selection.active
                }));
                awareness.setLocalStateField('selections', selections);
                awareness.setLocalStateField('participantName', this.participantName);
                awareness.setLocalStateField('githubUsername', this.githubUsername);
            }
        });
        // Listen for remote awareness updates
        awareness.on('change', (changes) => {
            // Handle remote cursor/selection updates
            this.handleRemoteCursors(changes);
        });
        this.context.subscriptions.push(selectionChangeDisposable);
    }
    setupParticipantManagement() {
        if (!this.provider)
            return;
        // Listen for participant updates
        this.provider.on('sync', (isSynced) => {
            if (isSynced) {
                this.outputChannel.appendLine('Connected to collaboration server');
            }
        });
        // Handle participant messages
        this.provider.on('message', (message) => {
            if (message.type === 'participants') {
                this.updateParticipants(message.participants);
            }
        });
    }
    handleRemoteCursors(changes) {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        // Clear existing remote cursor decorations
        this.clearRemoteCursors();
        // Only process if changes is an array
        if (Array.isArray(changes)) {
            changes.forEach((change) => {
                if (change.added) {
                    const participantId = change.added[0];
                    const state = change.added[1];
                    if (state.selections && state.participantName) {
                        this.addRemoteCursor(editor, participantId, state);
                    }
                }
            });
        }
    }
    addRemoteCursor(editor, participantId, state) {
        const selections = state.selections.map((sel) => new vscode.Selection(new vscode.Position(sel.anchor.line, sel.anchor.character), new vscode.Position(sel.active.line, sel.active.character)));
        // Create decoration for this participant
        const decoration = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: ` ${state.participantName}`,
                backgroundColor: new vscode.ThemeColor('editorCursor.foreground'),
                color: new vscode.ThemeColor('editor.background'),
                margin: '0 0 0 10px',
                border: '1px solid',
                borderColor: new vscode.ThemeColor('editorCursor.foreground')
            }
        });
        const remoteCursor = {
            participantId,
            participantName: state.participantName,
            avatar: state.githubUsername ? `https://github.com/${state.githubUsername}.png` : undefined,
            position: selections[0]?.active || new vscode.Position(0, 0),
            selections,
            decoration
        };
        this.remoteCursors.set(participantId, remoteCursor);
        this.cursorDecorations.push(decoration);
        // Apply decoration
        editor.setDecorations(decoration, selections.map((sel) => sel.active));
    }
    clearRemoteCursors() {
        // Clear all remote cursor decorations
        this.cursorDecorations.forEach(decoration => {
            decoration.dispose();
        });
        this.cursorDecorations = [];
        this.remoteCursors.clear();
    }
    updateParticipants(participants) {
        this.participants.clear();
        participants.forEach(p => {
            this.participants.set(p.id, p);
        });
        // Update status bar with participant count
        this.updateStatusBar();
    }
    getPositionFromIndex(document, index) {
        return document.positionAt(index);
    }
    getIndexFromPosition(document, position) {
        return document.offsetAt(position);
    }
    updateStatusBar() {
        if (this.isCollaborating) {
            const participantCount = this.participants.size;
            this.statusBarItem.text = `$(sync~spin) CodePair (${participantCount})`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
            this.statusBarItem.command = 'codepair.stopCollaboration';
            this.statusBarItem.tooltip = `Active collaboration - Room: ${this.roomId} - ${participantCount} participants`;
        }
        else {
            this.statusBarItem.text = '$(sync) CodePair';
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.command = 'codepair.startCollaboration';
            this.statusBarItem.tooltip = 'Click to start collaboration';
        }
    }
    async cleanup() {
        // Clear remote cursors
        this.clearRemoteCursors();
        if (this.provider) {
            this.provider.destroy();
            this.provider = null;
        }
        if (this.doc) {
            this.doc.destroy();
            this.doc = null;
        }
        this.roomId = null;
        this.participantId = null;
        this.participants.clear();
    }
    onStateChange(callback) {
        this.stateChangeCallbacks.push(callback);
    }
    notifyStateChange() {
        this.stateChangeCallbacks.forEach(callback => callback(this.isCollaborating));
    }
    getRoomId() {
        return this.roomId;
    }
    isActive() {
        return this.isCollaborating;
    }
    getParticipants() {
        return Array.from(this.participants.values());
    }
    dispose() {
        this.cleanup();
        this.stateChangeCallbacks = [];
        this.statusBarItem.dispose();
        this.outputChannel.dispose();
    }
}
exports.CollaborationManager = CollaborationManager;
//# sourceMappingURL=collaboration.js.map