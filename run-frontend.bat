@echo off
setlocal EnableExtensions
cd /d "%~dp0client"
if errorlevel 1 (
    echo [ERROR] Cannot open folder: %~dp0client
    goto :done
)

title LTC Frontend - React
echo =========================================
echo   LTC Frontend - React App
echo =========================================
echo Folder: %cd%
echo.

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not found. Install Node.js from https://nodejs.org/
    goto :done
)

if not exist "package.json" (
    echo [ERROR] package.json not found in this folder.
    goto :done
)

call npm run dev
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend stopped with an error. Read the messages above.
)

:done
echo.
echo =========================================
echo   Press any key to close this window...
echo =========================================
pause >nul
endlocal
