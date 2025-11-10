# Development Workflow

## Setup

Install dependencies:
```bash
yarn install
```

## Development

Run in development mode with hot reload:
```bash
yarn dev
```

This will:
- Compile TypeScript to JavaScript
- Start Electron with the compiled code
- Watch for changes and hot-reload

## Building

Build the source code:
```bash
yarn build:vite
```

Build and package the complete app:
```bash
yarn build
```

This will:
1. Compile TypeScript → JavaScript in `out/`
2. Pack into `builds/FixedApp.asar`
3. Copy to `builds/FixedApp.app`
4. Sign the app

## Running the Built App

```bash
yarn open
```

## Useful Commands

Kill any running Electron processes:
```bash
yarn kill
```

## Project Structure

```
original-proper/
├── src/
│   ├── main/              # Electron main process (Node.js)
│   │   ├── index.ts       # Main entry point
│   │   ├── hotkeyHandlers.ts
│   │   ├── audioRecorder.ts
│   │   └── services/
│   └── renderer/          # React UI
│       ├── main.tsx       # React entry point
│       ├── App.tsx
│       ├── components/
│       ├── hooks/
│       └── lib/
├── out/                   # Compiled output (gitignored)
├── resources/             # App resources (icons, etc)
└── builds/                # Built apps (outside this dir)
```

## Making Changes

1. Edit source files in `src/`
2. Changes will hot-reload in dev mode
3. Build to test production version
4. The compiled output goes to `out/`

## Configuration Files

- `electron.vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `components.json` - shadcn/ui configuration
