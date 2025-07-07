# CodePair Setup Guide

This guide will help you set up the CodePair collaborative pair programming system.

## Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **VS Code** - [Download here](https://code.visualstudio.com/)
- **Git** (optional) - [Download here](https://git-scm.com/)

## Quick Start (Windows)

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

## Manual Setup

### Step 1: Install Server Dependencies

```bash
cd server
npm install
npm run build
```

### Step 2: Install Extension Dependencies

```bash
cd extension
npm install
npm run compile
```

### Step 3: Start the Server

```bash
cd server
npm run dev
```

The server will start on `http://localhost:3001`

### Step 4: Run the Extension

1. Open VS Code in the extension directory:
   ```bash
   cd extension
   code .
   ```

2. Press `F5` to run the extension in a new VS Code window

3. In the new window, open a text file (like `test-file.js`)

4. Press `Ctrl+Shift+P` and search for "CodePair"

5. Choose "CodePair: Start Collaboration"

6. Share the generated room ID with your partner

## Usage

### Starting a Collaboration Session

1. Open a file in VS Code
2. Press `Ctrl+Shift+P`
3. Type "CodePair: Start Collaboration"
4. Copy the room ID and share it with your partner

### Joining a Collaboration Session

1. Open a file in VS Code
2. Press `Ctrl+Shift+P`
3. Type "CodePair: Join Collaboration"
4. Enter the room ID provided by your partner

### Stopping Collaboration

1. Press `Ctrl+Shift+P`
2. Type "CodePair: Stop Collaboration"

## Features

- **Real-time collaborative editing** - See changes as they happen
- **Cursor and selection sharing** - See where your partner is working
- **Room-based collaboration** - Secure sessions with unique IDs
- **Status bar integration** - Visual indicator of collaboration state
- **WebSocket communication** - Low-latency real-time updates

## Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   VS Code       │ ◄─────────────► │   Yjs Server    │
│   Extension     │                 │   (Node.js)     │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│   Yjs Document  │                 │   Room Manager  │
│   (CRDT)        │                 │   (Express)     │
└─────────────────┘                 └─────────────────┘
```

## Configuration

### Server Configuration

The server runs on port 3001 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=3002 npm run dev
```

### Extension Configuration

You can configure the server URL in VS Code settings:

1. Press `Ctrl+,` to open settings
2. Search for "CodePair"
3. Change the "Server URL" setting

## Troubleshooting

### Server Won't Start

1. Check if Node.js is installed: `node --version`
2. Check if port 3001 is available
3. Try a different port: `PORT=3002 npm run dev`

### Extension Won't Load

1. Make sure the extension is compiled: `npm run compile`
2. Check the VS Code developer console for errors
3. Reload the VS Code window: `Ctrl+Shift+P` → "Developer: Reload Window"

### Connection Issues

1. Verify the server is running: `http://localhost:3001/health`
2. Check the server URL in extension settings
3. Ensure firewall isn't blocking the connection

### Collaboration Not Working

1. Check if both users are connected to the same room
2. Verify the room ID is correct
3. Check the browser console for WebSocket errors

## Development

### Server Development

```bash
cd server
npm run watch  # Auto-reload on changes
```

### Extension Development

```bash
cd extension
npm run watch  # Auto-compile on changes
```

### Testing

1. Start the server
2. Open two VS Code windows with the extension
3. Start collaboration in one window
4. Join with the room ID in the second window
5. Make changes in both windows to test synchronization

## API Endpoints

- `GET /health` - Server health check
- `GET /rooms` - List active rooms
- `POST /rooms` - Create a new room
- `WS /?room=<roomId>` - WebSocket connection for collaboration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details 