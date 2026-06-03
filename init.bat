@echo off
npx -y create-vite@latest client --template react-ts
mkdir server
cd server
npm init -y
npm install express cors dotenv multer mongoose pdf-lib sharp p-limit
echo.
echo Done. Use start.bat to run the app - not init.bat
pause
