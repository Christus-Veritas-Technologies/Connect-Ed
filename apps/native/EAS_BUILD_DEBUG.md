# EAS Build Archive Size Debug Report

## Problem
- EAS Build archive was **95.2 MB** instead of the expected **~1 MB**
- Root cause: `node_modules/` directory was being included in the archive

## Root Cause Analysis
EAS Build **does not automatically respect `.gitignore`** files. Even though `.gitignore` included `node_modules/`, the EAS CLI was still archiving them because:
1. No `.easignore` file existed
2. EAS Build uses its own ignore patterns separate from git

## Solution Implemented
Created `.easignore` file at `apps/native/.easignore` with the following patterns:

```
node_modules/          # Will be reinstalled on EAS servers
.expo/                 # EAS Build cache
dist/                  # Build artifacts
.metro-health-check*   # Metro bundler cache
web-build/             # Web build artifacts
ios/                   # Native builds
android/               # Native builds
*.jks                  # Keystore files
.env.local             # Local environment files
```

## Expected Outcome
After `.easignore` is committed and the next build runs:
- Archive size should drop from **95.2 MB** to **~1-2 MB**
- Only source code, config, and assets will be uploaded
- Dependencies will be installed fresh on EAS Build servers
- Build time may be slightly longer but archive is much smaller

## Next Steps
1. Commit `.easignore` to the repository
2. Run the next build: `bunx eas build --platform android --profile development`
3. Verify the "Compressed project files" line shows a much smaller size (target: <2 MB)

## Notes
- This is best practice for EAS builds with monorepos
- The `.env` files in `.easignore` prevent accidentally exposing secrets
- EAS Build will automatically run `bun install` (or npm/yarn) on their servers
- No changes needed to `eas.json` or `app.json`
