@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias, una sola vez...
  call npm install
)
node server.js
pause
