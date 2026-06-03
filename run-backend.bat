@echo off
setlocal EnableExtensions
cd /d "%~dp0server"
if errorlevel 1 (
    echo [ERROR] Cannot open folder: %~dp0server
    goto :done
)

title LTC Backend - API
echo =========================================
echo   LTC Backend - API Server
echo =========================================
echo Folder: %cd%
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    goto :done
)

if not exist "index.js" (
    echo [ERROR] index.js not found in this folder.
    goto :done
)

node index.js
if errorlevel 1 (
    echo.
    echo [ERROR] Server stopped with an error. Read the messages above.
)

:done
echo.
echo =========================================
echo   Press any key to close this window...
echo =========================================
pause >nul
endlocal
