import * as vscode from 'vscode';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import WS from 'ws';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import * as path from 'path';

interface Participant {
    id: string;
    name: string;
    githubUsername?: string;
    avatar?: string;
    joinedAt: Date;
}

interface RemoteCursor {
    participantId: string;
    participantName: string;
    avatar?: string;
    position: vscode.Position;
    selections: vscode.Selection[];
    decoration: vscode.TextEditorDecorationType;
}

export class CollaborationManager {
    private context: vscode.ExtensionContext;
    private doc: Y.Doc | null = null;
    private provider: WebsocketProvider | null = null;
    private roomId: string | null = null;
    private participantId: string | null = null;
    private participantName: string = 'Anonymous';
    private githubUsername?: string;
    private isCollaborating = false;
    private stateChangeCallbacks: ((isCollaborating: boolean) => void)[] = [];
    private statusBarItem: vscode.StatusBarItem;
    private outputChannel: vscode.OutputChannel;
    private participants: Map<string, Participant> = new Map();
    private remoteCursors: Map<string, RemoteCursor> = new Map();
    private cursorDecorations: vscode.TextEditorDecorationType[] = [];

    constructor(context: vscode.ExtensionContext) {
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

    async startCollaboration(): Promise<string | null> {
        if (this.isCollaborating) {
            throw new Error('Already collaborating');
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No active text editor');
        }

        // Get participant information
        await this.getParticipantInfo();

        // Get repo URL and file path
        const repoUrl = await this.getGitRepoUrl();
        const filePath = vscode.workspace.asRelativePath(editor.document.uri.fsPath);

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

            // Get server URL from configuration
            const serverUrl = vscode.workspace.getConfiguration('codepair').get('serverUrl', 'ws://localhost:3001');

            // Set up WebSocket provider with participant info
            const wsUrl = `${serverUrl}?room=${roomId}&name=${encodeURIComponent(this.participantName)}${this.githubUsername ? `&github=${encodeURIComponent(String(this.githubUsername ?? ''))}` : ''}`;
            this.provider = new WebsocketProvider(serverUrl, roomId, this.doc, {
                WebSocketPolyfill: WS
            });
            this.roomId = roomId;

            // Broadcast repo URL and file path via awareness
            if (this.provider && this.provider.awareness) {
                this.provider.awareness.setLocalStateField('repoUrl', repoUrl);
                this.provider.awareness.setLocalStateField('filePath', filePath);
            }

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
            vscode.window.showInformationMessage(
                `Collaboration started! Room ID: ${roomId}`,
                'Copy Room ID',
                'Stop Collaboration'
            ).then(selection => {
                if (selection === 'Copy Room ID') {
                    vscode.env.clipboard.writeText(roomId);
                    vscode.window.showInformationMessage('Room ID copied to clipboard!');
                } else if (selection === 'Stop Collaboration') {
                    this.stopCollaboration();
                }
            });

            return roomId;
        } catch (error) {
            this.outputChannel.appendLine(`Error starting collaboration: ${error}`);
            await this.cleanup();
            throw error;
        }
    }

    async joinCollaboration(roomId: string): Promise<void> {
        if (this.isCollaborating) {
            throw new Error('Already collaborating');
        }

        // Listen for awareness updates before connecting
        let repoUrl: string | undefined;
        let filePath: string | undefined;
        let awarenessListener: any;

        const onAwarenessUpdate = (states: any) => {
            for (const key in states) {
                const state = states[key];
                if (state.repoUrl && state.filePath) {
                    repoUrl = state.repoUrl;
                    filePath = state.filePath;
                    break;
                }
            }
        };

        // Set up a temporary Yjs doc/provider to listen for awareness
        const tempDoc = new Y.Doc();
        const serverUrl = vscode.workspace.getConfiguration('codepair').get('serverUrl', 'ws://localhost:3001');
        const tempProvider = new WebsocketProvider(serverUrl, roomId, tempDoc, {
            WebSocketPolyfill: WS
        });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for awareness to sync
        if (tempProvider.awareness) {
            const states = tempProvider.awareness.getStates();
            onAwarenessUpdate(states);
        }
        tempProvider.destroy();
        tempDoc.destroy();

        // Prompt to clone repo if needed
        if (typeof repoUrl === 'string' && repoUrl.length > 0) {
            const shouldClone = await vscode.window.showInformationMessage(
                `This CodePair session uses the repository: ${repoUrl}. Would you like to clone it?`,
                'Clone Now', 'Cancel'
            );
            if (shouldClone === 'Clone Now') {
                const folderUris = await vscode.window.showOpenDialog({
                    canSelectFolders: true,
                    openLabel: 'Select folder to clone into'
                });
                if (folderUris && folderUris.length > 0) {
                    const folderPath = folderUris[0].fsPath;
                    await this.cloneRepo(repoUrl, folderPath);
                    // Open the cloned folder
                    const repoName = path.basename(repoUrl, '.git');
                    const repoFolder = path.join(folderPath, repoName);
                    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(repoFolder), true);
                    // Open the file after a short delay
                    if (filePath) {
                        setTimeout(() => {
                            vscode.workspace.openTextDocument(path.join(repoFolder, filePath)).then(doc => {
                                vscode.window.showTextDocument(doc);
                            });
                        }, 2000);
                    }
                    return; // Stop here, as the window will reload
                }
            }
        }

        // If repo is not present, just connect as usual
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

            // Set up WebSocket provider with participant info
            const wsUrl = `${serverUrl}?room=${roomId}&name=${encodeURIComponent(this.participantName)}${this.githubUsername ? `&github=${encodeURIComponent(String(this.githubUsername ?? ''))}` : ''}`;
            this.provider = new WebsocketProvider(serverUrl, roomId, this.doc, {
                WebSocketPolyfill: WS
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

        } catch (error) {
            this.outputChannel.appendLine(`Error joining collaboration: ${error}`);
            await this.cleanup();
            throw error;
        }
    }

    private async getParticipantInfo(): Promise<void> {
        // Get participant name
        const name = await vscode.window.showInputBox({
            prompt: 'Enter your name',
            placeHolder: 'Your name',
            value: this.participantName,
            validateInput: (value: string) => {
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

    async stopCollaboration(): Promise<void> {
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

    private async createRoom(): Promise<string | null> {
        let serverUrl = 'ws://localhost:3001';
        try {
            serverUrl = vscode.workspace.getConfiguration('codepair').get('serverUrl', 'ws://localhost:3001') as string;
        } catch (error) {
            this.outputChannel.appendLine(`Warning: Could not read workspace configuration, using default server URL: ${error}`);
        }
        const httpUrl = serverUrl.replace('ws://', 'http://').replace('wss://', 'https://');

        try {
            // Use fetch instead of Node.js http module
            const response = await fetch(`${httpUrl}/rooms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data: any = await response.json();
            return data.roomId;
        } catch (error) {
            this.outputChannel.appendLine(`Error creating room: ${error}`);
            return null;
        }
    }

    private setupDocumentSync(editor: vscode.TextEditor, ytext: Y.Text): void {
        if (!this.doc) return;
        const participantId = this.participantId || '';

        // Sync initial content (use applyDelta for initial sync)
        const currentContent = editor.document.getText();
        ytext.delete(0, ytext.length);
        ytext.insert(0, currentContent);

        // Listen for Yjs changes and apply to VS Code
        ytext.observe((event: Y.YTextEvent) => {
            // Ignore changes that originated from this client
            if ((event as any).origin === participantId) {
                return;
            }
            event.changes.delta.forEach((delta: any) => {
                if (delta.insert) {
                    // Handle insertions
                    const position = this.getPositionFromIndex(editor.document, delta.retain || 0);
                    editor.edit((editBuilder: vscode.TextEditorEdit) => {
                        editBuilder.insert(position, delta.insert);
                    });
                } else if (delta.delete) {
                    // Handle deletions
                    const position = this.getPositionFromIndex(editor.document, delta.retain || 0);
                    const endPosition = this.getPositionFromIndex(editor.document, (delta.retain || 0) + delta.delete);
                    editor.edit((editBuilder: vscode.TextEditorEdit) => {
                        editBuilder.delete(new vscode.Range(position, endPosition));
                    });
                }
            });
        });

        // Listen for VS Code changes and apply to Yjs
        const changeDisposable = vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
            if (event.document === editor.document) {
                const origin: string = (this.participantId !== null && this.participantId !== undefined) ? this.participantId : '';
                event.contentChanges.forEach((change: vscode.TextDocumentContentChangeEvent) => {
                    if (change.rangeLength > 0) {
                        // Deletion
                        const index = this.getIndexFromPosition(editor.document, change.range.start);
                        this.doc?.transact(() => {
                            ytext.delete(index, change.rangeLength);
                        }, origin as any);
                    }
                    if (change.text) {
                        // Insertion
                        const index = this.getIndexFromPosition(editor.document, change.range.start);
                        this.doc?.transact(() => {
                            ytext.insert(index, change.text);
                        }, origin as any);
                    }
                });
            }
        });

        this.context.subscriptions.push(changeDisposable);
    }

    private setupAwareness(): void {
        if (!this.provider) return;

        // Set up awareness for cursor positions and selections
        const awareness = this.provider.awareness;
        
        // Update awareness when cursor/selection changes
        const selectionChangeDisposable = vscode.window.onDidChangeTextEditorSelection((event: vscode.TextEditorSelectionChangeEvent) => {
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
        awareness.on('change', (changes: any) => {
            // Handle remote cursor/selection updates
            this.handleRemoteCursors(changes);
        });

        this.context.subscriptions.push(selectionChangeDisposable);
    }

    private setupParticipantManagement(): void {
        if (!this.provider) return;

        // Listen for participant updates
        this.provider.on('sync', (isSynced: boolean) => {
            if (isSynced) {
                this.outputChannel.appendLine('Connected to collaboration server');
            }
        });

        // Handle participant messages
        this.provider.on('message', (message: any) => {
            if (message.type === 'participants') {
                this.updateParticipants(message.participants);
            }
        });
    }

    private handleRemoteCursors(changes: any): void {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        // Clear existing remote cursor decorations
        this.clearRemoteCursors();

        // Only process if changes is an array
        if (Array.isArray(changes)) {
            changes.forEach((change: any) => {
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

    private addRemoteCursor(editor: vscode.TextEditor, participantId: string, state: any): void {
        const selections = state.selections.map((sel: any) => 
            new vscode.Selection(
                new vscode.Position(sel.anchor.line, sel.anchor.character),
                new vscode.Position(sel.active.line, sel.active.character)
            )
        );

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

        const remoteCursor: RemoteCursor = {
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
        editor.setDecorations(decoration, selections.map((sel: vscode.Selection) => sel.active));
    }

    private clearRemoteCursors(): void {
        // Clear all remote cursor decorations
        this.cursorDecorations.forEach(decoration => {
            decoration.dispose();
        });
        this.cursorDecorations = [];
        this.remoteCursors.clear();
    }

    private updateParticipants(participants: Participant[]): void {
        this.participants.clear();
        participants.forEach(p => {
            this.participants.set(p.id, p);
        });

        // Update status bar with participant count
        this.updateStatusBar();
    }

    private getPositionFromIndex(document: vscode.TextDocument, index: number): vscode.Position {
        return document.positionAt(index);
    }

    private getIndexFromPosition(document: vscode.TextDocument, position: vscode.Position): number {
        return document.offsetAt(position);
    }

    private updateStatusBar(): void {
        if (this.isCollaborating) {
            const participantCount = this.participants.size;
            this.statusBarItem.text = `$(sync~spin) CodePair (${participantCount})`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
            this.statusBarItem.command = 'codepair.stopCollaboration';
            this.statusBarItem.tooltip = `Active collaboration - Room: ${this.roomId} - ${participantCount} participants`;
        } else {
            this.statusBarItem.text = '$(sync) CodePair';
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.command = 'codepair.startCollaboration';
            this.statusBarItem.tooltip = 'Click to start collaboration';
        }
    }

    private async cleanup(): Promise<void> {
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

    onStateChange(callback: (isCollaborating: boolean) => void): void {
        this.stateChangeCallbacks.push(callback);
    }

    private notifyStateChange(): void {
        this.stateChangeCallbacks.forEach(callback => callback(this.isCollaborating));
    }

    getRoomId(): string | null {
        return this.roomId;
    }

    isActive(): boolean {
        return this.isCollaborating;
    }

    getParticipants(): Participant[] {
        return Array.from(this.participants.values());
    }

    dispose(): void {
        this.cleanup();
        this.stateChangeCallbacks = [];
        this.statusBarItem.dispose();
        this.outputChannel.dispose();
    }

    private async getGitRepoUrl(): Promise<string | undefined> {
        return new Promise((resolve) => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                resolve(undefined);
                return;
            }
            const cwd = workspaceFolders[0].uri.fsPath;
            exec('git remote get-url origin', { cwd }, (err, stdout) => {
                if (err) {
                    resolve(undefined);
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }

    private async cloneRepo(repoUrl: string, folderPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(`git clone ${repoUrl}`, { cwd: folderPath }, (err, stdout, stderr) => {
                if (err) {
                    vscode.window.showErrorMessage(`Failed to clone repo: ${stderr}`);
                    reject(err);
                } else {
                    vscode.window.showInformationMessage(`Cloned repo to ${folderPath}`);
                    resolve();
                }
            });
        });
    }
} 