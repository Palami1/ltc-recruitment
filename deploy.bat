@echo off
setlocal enabledelayedexpansion
title LTC Recruitment Portal — Production Deploy

echo.
echo ============================================================
echo   LTC Recruitment Portal — Automated Production Deployer
echo ============================================================
echo.

:: ── 1. Build Verification ──────────────────────────────────────
echo [1/6] Running production build verification...
cd /d "%~dp0client"
call npm run build >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Client build FAILED. Fix errors before deploying.
    pause
    exit /b 1
)
echo [OK] Client build passed (Exit code 0).
cd /d "%~dp0"

:: ── 2. Initialize Git if Needed ────────────────────────────────
echo.
echo [2/6] Checking git repository...
if not exist ".git" (
    echo [INFO] No git repository detected. Initializing...
    git init
    git branch -M main
)
echo [OK] Git repository ready.

:: ── 3. Secret Leakage Guard ────────────────────────────────────
echo.
echo [3/6] Checking for secret leakage before staging...

git check-ignore server/.env >nul 2>&1
if errorlevel 1 (
    echo [ABORT] CRITICAL: server/.env is NOT excluded by .gitignore!
    echo         Fix .gitignore before deploying to prevent secret leakage.
    pause
    exit /b 1
)

git ls-files --error-unmatch server/.env >nul 2>&1
if not errorlevel 1 (
    echo [ABORT] CRITICAL: server/.env is tracked by git!
    echo         Run: git rm --cached server/.env
    pause
    exit /b 1
)
echo [OK] No secrets exposed. .env files are properly excluded.

:: ── 4. Stage & Commit ──────────────────────────────────────────
echo.
echo [4/6] Staging all changes...
git add .

for /f "tokens=*" %%i in ('git status --short') do (
    set HAS_CHANGES=1
)

if not defined HAS_CHANGES (
    echo [INFO] Nothing to commit — working tree is clean.
) else (
    set /p COMMIT_MSG="Enter commit message (or press Enter for default): "
    if "!COMMIT_MSG!"=="" set COMMIT_MSG=chore: production-ready deployment
    git commit -m "!COMMIT_MSG!"
    echo [OK] Committed: !COMMIT_MSG!
)

:: ── 5. Check / Set GitHub Remote ───────────────────────────────
echo.
echo [5/6] Checking GitHub remote...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [INFO] No remote origin configured.
    set /p REMOTE_URL="Enter your GitHub repository URL (e.g. https://github.com/user/repo.git): "
    if "!REMOTE_URL!"=="" (
        echo [SKIP] No remote URL provided. Skipping push.
        goto :done
    )
    git remote add origin !REMOTE_URL!
    echo [OK] Remote origin set to: !REMOTE_URL!
) else (
    echo [OK] Remote origin already configured.
)

:: ── 6. Push to Main Branch ─────────────────────────────────────
echo.
echo [6/6] Pushing to origin/main...
git push -u origin main
if errorlevel 1 (
    echo [WARN] Push failed. Try: git push --force-with-lease origin main
) else (
    echo [OK] Successfully pushed to origin/main.
)

:done
echo.
echo ============================================================
echo   Deploy Complete! Check Vercel for auto-deployment status.
echo ============================================================
echo.
pause
endlocal
