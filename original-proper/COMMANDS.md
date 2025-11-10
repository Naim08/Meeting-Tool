# Development Commands

## Setup (First Time Only)
```bash
cd /Users/Naim/CustomSolverBuilds/original-proper
yarn install
```

## Development Commands

### Run the app in development mode
```bash
yarn dev
# or
yarn start
```

### Kill any running Electron processes
```bash
yarn kill
```

### Build the modified app
```bash
yarn build
```
This will:
1. Pack the app into an asar file
2. Copy the original app
3. Replace with modified asar
4. Sign the app

### Open the built app
```bash
yarn open
```

## Individual Steps

### Just pack the asar
```bash
yarn build:asar
```

### Just build the app (after asar is packed)
```bash
yarn build:app
```

## Quick Workflow

1. Make your changes in `src/` or `out/`
2. Test with: `yarn dev`
3. Build: `yarn build`
4. Open: `yarn open`

## Notes

- The app runs from the `out/` directory which contains the compiled JavaScript
- Source files in `src/` are reference only (extracted from source maps)
- To make changes, edit the minified files in `out/renderer/assets/` or `out/main/`
- Use `sed` commands for safe minified file editing as we've been doing
