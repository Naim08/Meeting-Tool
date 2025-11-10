
### Application Features

Based on the asset files, InterviewSolver includes:

1. **AI Chat Interface** - React-based conversational UI
2. **System Audio Recording** - CaptureKit integration for recording system audio
3. **Rich Diagram Support** - 20+ diagram types via Mermaid.js
4. **Math Equations** - LaTeX/KaTeX rendering
5. **Data Visualization** - D3.js charting capabilities
6. **Code Syntax Highlighting** - For code blocks in chat
7. **Export/Download** - Save conversations and diagrams

npx --yes @electron/asar pack original-proper builds/FixedApp.asar --unpack '*.{node,dylib}'
cd /Users/Naim/CustomSolverBuilds/builds && rm -rf FixedApp.app && cp -R /Applications/InterviewSolver.app FixedApp.app && cp FixedApp.asar FixedApp.app/Contents/Resources/app.asar && cp -R FixedApp.asar.unpacked FixedApp.app/Contents/Resources/
sudo xattr -cr /Users/Naim/CustomSolverBuilds/builds/FixedApp.app && sudo codesign --force --deep --sign - /Users/Naim/CustomSolverBuilds/builds/FixedApp.app && open /Users/Naim/CustomSolverBuilds/builds/FixedApp.app