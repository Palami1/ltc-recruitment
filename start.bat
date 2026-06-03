@echo off
REM Re-open in a window that stays open (fixes "terminal closes immediately")
if /i not "%~1"=="_keepopen" (
    cmd /k "%~f0" _keepopen
    exit /b
)

setlocal EnableExtensions
cd /d "%~dp0"
title LTC Recruitment - Launcher

echo =========================================
echo   LTC Recruitment App - Starting...
echo =========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    echo.
    goto :launcher_done
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found. Reinstall Node.js from https://nodejs.org/
    echo.
    goto :launcher_done
)

if not exist "%~dp0server\index.js" (
    echo [ERROR] Missing file: server\index.js
    goto :launcher_done
)

if not exist "%~dp0client\package.json" (
    echo [ERROR] Missing file: client\package.json
    goto :launcher_done
)

if not exist "%~dp0server\node_modules\" (
    echo Installing server packages - first time only...
    pushd "%~dp0server"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] npm install failed in server folder.
        goto :launcher_done
    )
    popd
    echo.
)

if not exist "%~dp0client\node_modules\" (
    echo Installing client packages - first time only...
    pushd "%~dp0client"
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] npm install failed in client folder.
        goto :launcher_done
    )
    popd
    echo.
)

echo Opening Backend window...
start "LTC Backend" cmd /k call "%~dp0run-backend.bat"

timeout /t 2 /nobreak >nul

echo Opening Frontend window...
start "LTC Frontend" cmd /k call "%~dp0run-frontend.bat"

echo.
echo =========================================
echo   Started
echo =========================================
echo   Backend  - check window "LTC Backend"
echo   Frontend - check window "LTC Frontend"
echo            open URL shown there, usually http://localhost:5173
echo.
echo   This launcher window will stay open.
echo.

:launcher_done
echo Press any key...
pause >nul
endlocal
