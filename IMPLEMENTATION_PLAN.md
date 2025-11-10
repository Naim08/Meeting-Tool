# Electron App Full Development Setup Plan

## Project Context

**App:** InterviewSolver (Electron app with React + TypeScript)
**Current State:** We have extracted source files from source maps but missing build configuration
**Goal:** Set up full TypeScript/React development environment to edit source code instead of minified output

## What We Have

### Directory Structure
```
/Users/Naim/CustomSolverBuilds/original-proper/
├── src/
│   ├── main/              # ✅ Electron main process (TypeScript) - NOW PRESENT
│   │   ├── index.ts
│   │   ├── hotkeyHandlers.ts
│   │   ├── audioRecorder.ts
│   │   ├── config/
│   │   │   └── audio.ts
│   │   └── services/
│   │       ├── AudioProcessor.ts
│   │       ├── AudioWriter.ts
│   │       └── TranscriptionService.ts
│   └── renderer/          # ✅ React UI (TypeScript/JSX) - PRESENT
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/    # 47 files
│       ├── hooks/
│       ├── config/
│       └── lib/
├── out/                   # Compiled output (currently minified)
│   ├── main/index.js
│   └── renderer/assets/index-4ACUvPeB.js
├── node_modules/          # All dependencies installed
├── package.json           # Complete with all dependencies
└── resources/
```

### Existing Dependencies
- React + React DOM (already in package.json)
- TypeScript types (already in devDependencies)
- Electron (already in devDependencies)
- All UI libraries (@radix-ui, lucide-react, etc.)
- All required packages (ai, @deepgram/sdk, etc.)

## What We Need

### Build Configuration Files (MISSING)

1. **electron.vite.config.ts** or **vite.config.ts**
   - Configure Vite to build main + renderer processes
   - Set up TypeScript compilation
   - Configure externals (node_modules)
   - Set entry points

2. **tsconfig.json**
   - TypeScript compiler options
   - Path aliases (@/ mappings)
   - Include/exclude patterns
   - Target ES version

3. **tsconfig.node.json** (optional)
   - Separate config for build scripts

4. **tailwind.config.js** (if not present)
   - TailwindCSS configuration
   - Theme customization

5. **postcss.config.js** (if not present)
   - PostCSS plugins for CSS processing

### Updated Build Scripts

Need to modify `package.json` scripts to:
- Compile TypeScript → JavaScript
- Bundle renderer with Vite
- Copy assets and resources
- Generate source maps
- Pack into asar

## Implementation Plan

### Phase 1: Discover Original Build System

**Check for existing config files:**
```bash
# Look in the extracted asar or app
ls -la /tmp/app-extract/*.config.{js,ts}
ls -la /tmp/app-extract/tsconfig*.json
```

**Check package.json for build hints:**
- Look at dependencies for: electron-vite, electron-builder, vite
- Check if there are any build-related scripts

### Phase 2: Create Configuration Files

#### Option A: If using electron-vite (recommended for Electron)

**Install electron-vite:**
```json
"devDependencies": {
  "electron-vite": "^2.0.0",
  "vite": "^5.0.0"
}
```

**Create `electron.vite.config.ts`:**
```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      }
    },
    plugins: [react()]
  }
})
```

#### Option B: If using standard Vite

**Create separate configs for main and renderer**

**Create `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/renderer/*"]
    }
  },
  "include": ["src"]
}
```

### Phase 3: Update Package.json Scripts

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build && yarn build:app",
    "build:vite": "electron-vite build",
    "build:asar": "npx @electron/asar pack . ../builds/FixedApp.asar --unpack '*.{node,dylib}'",
    "build:app": "cd ../builds && rm -rf FixedApp.app && cp -R /Applications/InterviewSolver.app FixedApp.app && cp FixedApp.asar FixedApp.app/Contents/Resources/app.asar && cp -R FixedApp.asar.unpacked FixedApp.app/Contents/Resources/ && sudo xattr -cr FixedApp.app && sudo codesign --force --deep --sign - FixedApp.app",
    "preview": "electron-vite preview",
    "open": "open ../builds/FixedApp.app",
    "kill": "pkill -f 'electron' || true"
  }
}
```

### Phase 4: Handle Special Cases

**Check for:**
1. **PostCSS/TailwindCSS** - Likely used based on class names
2. **Environment variables** - .env files or electron-store
3. **Native modules** - sharp, screenshot-desktop need special handling
4. **Asset copying** - resources folder, icons, etc.

### Phase 5: Test Build Pipeline

```bash
# 1. Install any new dev dependencies
yarn install

# 2. Try building
yarn build:vite

# 3. Verify output
ls -la out/

# 4. Test running
yarn dev

# 5. Full build and deploy
yarn build
yarn open
```

## Specific Features to Preserve

### System Audio Recording Fix
- Located in: `src/renderer/hooks/useTranscriptionManager.ts`
- Current issue: Auto-submits instead of populating input field
- Need to find where `recorder.toggle` IPC message is handled
- Modify to call `setInput()` instead of `append()`

### Keyboard Shortcut (Already Working)
- Located in: `src/main/hotkeyHandlers.ts` or `src/main/index.ts`
- Command+Shift+O to submit chat
- Should be preserved in source

## Validation Checklist

After setup, verify:
- [ ] `yarn dev` compiles and runs the app
- [ ] TypeScript errors show up in IDE
- [ ] Hot reload works for renderer changes
- [ ] Main process restarts on changes
- [ ] `yarn build` creates proper output in `out/`
- [ ] Built app works: `yarn build && yarn open`
- [ ] All features work (system audio, shortcuts, UI)
- [ ] Source maps are generated for debugging

## Troubleshooting Guide

### Common Issues

1. **Module resolution errors**
   - Check `tsconfig.json` paths
   - Verify `@/` alias is configured
   - Check vite resolve.alias config

2. **Native modules fail**
   - Use `externalizeDepsPlugin()` in electron-vite
   - Add to `external` in rollup config
   - Don't bundle: sharp, screenshot-desktop

3. **React/JSX errors**
   - Ensure `@vitejs/plugin-react` is installed
   - Check `jsx: "react-jsx"` in tsconfig
   - Verify React is in dependencies

4. **CSS not loading**
   - Check postcss.config.js exists
   - Verify tailwind.config.js
   - Import CSS in main.tsx

## Alternative Approach: Continue with Minified Editing

If build setup is too complex, can continue with current approach:
- Edit minified files in `out/` using sed
- Use source files in `src/` as reference only
- Faster for small changes
- No build complexity

## Next Steps

**Provide this information when requesting implementation:**

1. Check if electron-vite or standard vite was used
2. Extract any existing config files from the original app
3. Create the missing configuration files
4. Update package.json scripts
5. Test the build pipeline
6. Fix the system audio recording issue in source code

**Files to create:**
- electron.vite.config.ts (or vite.config.ts)
- tsconfig.json
- tailwind.config.js (if missing)
- postcss.config.js (if missing)

**Commands to run:**
```bash
cd /Users/Naim/CustomSolverBuilds/original-proper
yarn install  # Install any new dev dependencies
yarn dev      # Test development mode
yarn build    # Test full build
```

## Summary

This plan sets up a proper TypeScript/React development environment where you can:
- Edit clean source files in `src/`
- Get IDE support with autocomplete and type checking
- Use hot reload for fast iteration
- Build production-ready output in `out/`
- Deploy the modified app

The key is recreating the build configuration that was used to originally compile the app.
