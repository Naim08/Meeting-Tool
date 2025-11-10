# Project Structure Explained

## Current Situation

You now have **BOTH** the source code AND the compiled output:

### ✅ What We Have

1. **Source Code** (from source maps):
   - `src/renderer/` - React/TypeScript UI source (47 files)
   - `src/main/` - Electron main process source (7 files)
   
2. **Compiled Output** (what actually runs):
   - `out/main/index.js` - Compiled main process (minified)
   - `out/renderer/assets/index-4ACUvPeB.js` - Compiled renderer (minified)

3. **Dependencies**:
   - `node_modules/` - Already installed
   - `package.json` - All dependencies listed

### ❌ What We're Missing

To build from source, we need:
- `vite.config.ts` or `vite.config.js` - Build configuration
- `tsconfig.json` - TypeScript configuration  
- `electron.vite.config.ts` - Electron-vite configuration
- Build scripts and tooling setup

## Two Approaches

### Option 1: Continue Editing Minified Code (Current Approach)
**Pros:**
- Works right now
- No build setup needed
- Fast iteration

**Cons:**
- Editing minified code is hard
- Must use `sed` commands
- Can't use TypeScript/React syntax

**How:**
```bash
# Edit minified files in out/
# Use sed or manual editing
yarn build  # Packs and deploys
yarn open   # Opens app
```

### Option 2: Set Up Full Development Environment (Recommended)
**Pros:**
- Edit clean TypeScript/React source
- Proper IDE support
- Type checking
- Easier debugging

**Cons:**
- Need to recreate build configuration
- Takes time to set up initially

**What's needed:**
1. Create `vite.config.ts`
2. Create `tsconfig.json`
3. Add build scripts
4. Test compilation

## Recommendation

Since you want to work with `src/renderer`, I recommend **Option 2**. 

Would you like me to:
1. Create the missing build configuration files?
2. Set up proper TypeScript compilation?
3. Add proper dev/build scripts that compile from `src/` to `out/`?

This way you can edit the source files in `src/renderer/` and `src/main/`, and the build process will compile them to `out/`.

## Quick Reference

**Source Files (Edit these):**
- Main process: `src/main/index.ts`, `src/main/hotkeyHandlers.ts`
- Renderer: `src/renderer/components/chat.tsx`, etc.
- System audio: `src/renderer/hooks/useTranscriptionManager.ts`

**Compiled Output (Auto-generated):**
- `out/main/index.js`
- `out/renderer/assets/index-4ACUvPeB.js`
