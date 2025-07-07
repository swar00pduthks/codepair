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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const collaboration_1 = require("./collaboration");
let collaborationManager;
function activate(context) {
    console.log('CodePair extension is now active!');
    // Initialize collaboration manager
    collaborationManager = new collaboration_1.CollaborationManager(context);
    // Register commands
    let startCommand = vscode.commands.registerCommand('codepair.startCollaboration', async () => {
        try {
            const roomId = await collaborationManager.startCollaboration();
            if (roomId) {
                // Room ID is already shown in the notification from CollaborationManager
                // Additional info can be shown here if needed
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to start collaboration: ${error}`);
        }
    });
    let joinCommand = vscode.commands.registerCommand('codepair.joinCollaboration', async () => {
        try {
            const roomId = await vscode.window.showInputBox({
                prompt: 'Enter the room ID to join',
                placeHolder: 'e.g., 12345678-1234-1234-1234-123456789012',
                validateInput: (value) => {
                    if (!value || value.trim() === '') {
                        return 'Room ID is required';
                    }
                    return null;
                }
            });
            if (roomId) {
                await collaborationManager.joinCollaboration(roomId.trim());
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to join collaboration: ${error}`);
        }
    });
    let stopCommand = vscode.commands.registerCommand('codepair.stopCollaboration', async () => {
        try {
            await collaborationManager.stopCollaboration();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to stop collaboration: ${error}`);
        }
    });
    // Add command to show collaboration status
    let statusCommand = vscode.commands.registerCommand('codepair.showStatus', () => {
        if (collaborationManager.isActive()) {
            const roomId = collaborationManager.getRoomId();
            const participants = collaborationManager.getParticipants();
            const participantList = participants.map(p => `${p.name}${p.githubUsername ? ` (@${p.githubUsername})` : ''}`).join('\n');
            vscode.window.showInformationMessage(`Active collaboration in room: ${roomId}\n\nParticipants:\n${participantList}`, 'Copy Room ID', 'Stop Collaboration').then(selection => {
                if (selection === 'Copy Room ID' && roomId) {
                    vscode.env.clipboard.writeText(roomId);
                    vscode.window.showInformationMessage('Room ID copied to clipboard!');
                }
                else if (selection === 'Stop Collaboration') {
                    collaborationManager.stopCollaboration();
                }
            });
        }
        else {
            vscode.window.showInformationMessage('No active collaboration. Use "CodePair: Start Collaboration" to begin.');
        }
    });
    // Add command to show participants
    let participantsCommand = vscode.commands.registerCommand('codepair.showParticipants', () => {
        if (collaborationManager.isActive()) {
            const participants = collaborationManager.getParticipants();
            if (participants.length === 0) {
                vscode.window.showInformationMessage('No participants in the room yet.');
                return;
            }
            const participantDetails = participants.map(p => {
                const avatar = p.avatar ? `![${p.name}](${p.avatar})` : '';
                const github = p.githubUsername ? `@${p.githubUsername}` : '';
                return `${avatar} **${p.name}** ${github}\nJoined: ${p.joinedAt.toLocaleTimeString()}`;
            }).join('\n\n');
            // Create a webview to show participant details
            const panel = vscode.window.createWebviewPanel('codepairParticipants', 'CodePair Participants', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            panel.webview.html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>CodePair Participants</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            padding: 20px;
                            background-color: var(--vscode-editor-background);
                            color: var(--vscode-editor-foreground);
                        }
                        .participant {
                            display: flex;
                            align-items: center;
                            padding: 10px;
                            margin: 10px 0;
                            border: 1px solid var(--vscode-panel-border);
                            border-radius: 8px;
                            background-color: var(--vscode-editor-inactiveSelectionBackground);
                        }
                        .avatar {
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            margin-right: 15px;
                        }
                        .info {
                            flex: 1;
                        }
                        .name {
                            font-weight: bold;
                            font-size: 16px;
                        }
                        .github {
                            color: var(--vscode-descriptionForeground);
                            font-size: 14px;
                        }
                        .joined {
                            color: var(--vscode-descriptionForeground);
                            font-size: 12px;
                        }
                        .count {
                            background-color: var(--vscode-activityBarBadge-background);
                            color: var(--vscode-activityBarBadge-foreground);
                            padding: 2px 8px;
                            border-radius: 10px;
                            font-size: 12px;
                            font-weight: bold;
                        }
                    </style>
                </head>
                <body>
                    <h2>🤝 CodePair Participants <span class="count">${participants.length}</span></h2>
                    ${participants.map(p => `
                        <div class="participant">
                            <img class="avatar" src="${p.avatar || 'https://github.com/github.png'}" alt="${p.name}">
                            <div class="info">
                                <div class="name">${p.name}</div>
                                ${p.githubUsername ? `<div class="github">@${p.githubUsername}</div>` : ''}
                                <div class="joined">Joined: ${p.joinedAt.toLocaleTimeString()}</div>
                            </div>
                        </div>
                    `).join('')}
                </body>
                </html>
            `;
        }
        else {
            vscode.window.showInformationMessage('No active collaboration to show participants.');
        }
    });
    context.subscriptions.push(startCommand, joinCommand, stopCommand, statusCommand, participantsCommand);
    // Add context menu items
    context.subscriptions.push(vscode.commands.registerCommand('codepair.copyRoomId', () => {
        const roomId = collaborationManager.getRoomId();
        if (roomId) {
            vscode.env.clipboard.writeText(roomId);
            vscode.window.showInformationMessage('Room ID copied to clipboard!');
        }
    }));
    // Show welcome message
    vscode.window.showInformationMessage('CodePair extension activated! Use Ctrl+Shift+P and search for "CodePair" to start collaborating.', 'Start Collaboration', 'Learn More').then(selection => {
        if (selection === 'Start Collaboration') {
            vscode.commands.executeCommand('codepair.startCollaboration');
        }
        else if (selection === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/your-repo/codepair'));
        }
    });
}
exports.activate = activate;
function deactivate() {
    if (collaborationManager) {
        collaborationManager.dispose();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map