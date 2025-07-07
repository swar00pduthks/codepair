# CodePair - Real-time Collaborative Pair Programming

A real-time collaborative pair programming system built with Yjs server and VS Code extension that enables direct collaborative editing in VS Code.

## Features

- **Real-time collaborative editing** directly in VS Code editor
- **Yjs server** for document synchronization using CRDTs
- **WebSocket connections** for live updates
- **Room-based collaboration** with unique session IDs
- **Cursor and selection sharing** between participants
- **Status bar integration** with visual collaboration indicators
- **Direct editor integration** - no webview needed

## Project Structure

```
codepair/
├── server/                 # Yjs WebSocket server
│   ├── package.json
│   ├── src/
│   │   ├── server.ts
│   │   └── setup.ts
│   └── dist/
├── extension/              # VS Code extension
│   ├── package.json
│   ├── src/
│   │   ├── extension.ts
│   │   └── collaboration.ts
│   └── out/
└── README.md
```

## How It Works

The system directly integrates with VS Code's editor using the VS Code Extension API:

1. **VS Code Extension** - Integrates Yjs with the actual VS Code editor
2. **Yjs CRDT** - Handles conflict-free real-time collaboration
3. **WebSocket Server** - Manages room creation and document synchronization
4. **Direct Editor Sync** - Changes are applied directly to the VS Code editor

## Installation

### Option 1: Install from VSIX File (Recommended)

1. **Build the extension:**
   ```powershell
   .\build-extension.ps1
   ```

2. **Install the generated .vsix file:**
   - Open VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Extensions: Install from VSIX..."
   - Select the generated `codepair-1.0.0.vsix` file
   - Restart VS Code

### Option 2: Development Setup

1. **Start the Yjs server:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Install the VS Code extension:**
   ```bash
   cd extension
   npm install
   npm run compile
   ```

3. **Load the extension in VS Code:**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Developer: Reload Window"
   - The extension will be available

### Option 3: Quick Start (Windows)

1. **Run the installation script:**
   ```powershell
   .\install.ps1
   ```

2. **Start the Yjs server:**
   ```powershell
   .\start-server.ps1
   ```

3. **Start the VS Code extension:**
   ```powershell
   .\start-extension.ps1
   ```

## Usage

1. Open a file in VS Code
2. Press `Ctrl+Shift+P` and run "CodePair: Start Collaboration"
3. Share the generated room ID with your pair programming partner
4. Your partner can join using "CodePair: Join Collaboration"

### Status Bar Integration

- **Inactive**: Shows "CodePair" - click to start collaboration
- **Active**: Shows "CodePair Active" with spinning icon - click to stop

## Distribution

### Creating a VSIX Package

To create an installable `.vsix` file for distribution:

```bash
cd extension
npm install
npm run compile
npm run package
```

This generates a `codepair-1.0.0.vsix` file that can be shared and installed by anyone.

### Installing from VSIX

1. Download the `.vsix` file
2. Open VS Code
3. Press `Ctrl+Shift+P`
4. Type "Extensions: Install from VSIX..."
5. Select the `.vsix` file
6. Restart VS Code

## Development

### Server Development
```bash
cd server
npm run dev    # Start development server
npm run build  # Build for production
```

### Extension Development
```bash
cd extension
npm run compile  # Compile TypeScript
npm run watch    # Watch for changes
npm run package  # Create .vsix file
```

## Commands

- **CodePair: Start Collaboration** - Create a new collaboration room
- **CodePair: Join Collaboration** - Join an existing room
- **CodePair: Stop Collaboration** - End the current session
- **CodePair: Show Status** - Display current collaboration status
- **CodePair: Copy Room ID** - Copy room ID to clipboard

## Technologies Used

- **Yjs**: CRDT-based real-time collaboration
- **WebSocket**: Real-time communication
- **VS Code Extension API**: Direct editor integration
- **TypeScript**: Type-safe development
- **Node.js**: Server runtime

## Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   VS Code       │ ◄─────────────► │   Yjs Server    │
│   Editor        │                 │   (Node.js)     │
│   (Direct)      │                 │                 │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│   Yjs Document  │                 │   Room Manager  │
│   (CRDT)        │                 │   (Express)     │
└─────────────────┘                 └─────────────────┘
```

## License

MIT