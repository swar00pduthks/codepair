# CodePair VS Code Extension

Real-time collaborative pair programming extension for VS Code.

## Installation

### From VSIX File

1. Download the latest `.vsix` file from the releases
2. Open VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
4. Type "Extensions: Install from VSIX..."
5. Select the downloaded `.vsix` file
6. Restart VS Code

### From Source

```bash
cd extension
npm install
npm run compile
npm run package
```

This will generate a `codepair-1.0.0.vsix` file in the extension directory.

## Usage

1. **Start Collaboration:**
   - Open a file in VS Code
   - Press `Ctrl+Shift+P`
   - Type "CodePair: Start Collaboration"
   - Share the room ID with your partner

2. **Join Collaboration:**
   - Press `Ctrl+Shift+P`
   - Type "CodePair: Join Collaboration"
   - Enter the room ID from your partner

3. **Stop Collaboration:**
   - Click the status bar item or
   - Use "CodePair: Stop Collaboration" command

## Features

- Real-time collaborative editing
- Cursor and selection sharing
- Room-based collaboration
- Status bar integration
- Direct VS Code editor integration

## Requirements

- VS Code 1.74.0 or higher
- CodePair server running (default: ws://localhost:3001)

## Configuration

You can configure the server URL in VS Code settings:

1. Press `Ctrl+,` to open settings
2. Search for "CodePair"
3. Change the "Server URL" setting

## Commands

- `CodePair: Start Collaboration` - Create a new collaboration room
- `CodePair: Join Collaboration` - Join an existing room
- `CodePair: Stop Collaboration` - End the current session
- `CodePair: Show Status` - Display current collaboration status
- `CodePair: Copy Room ID` - Copy room ID to clipboard

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package extension
npm run package

# Publish to marketplace (requires publisher account)
npm run publish
```

## License

MIT 