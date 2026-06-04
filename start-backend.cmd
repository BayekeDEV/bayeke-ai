@echo off
chcp 65001 >nul
title Байеке ИИ — Backend
cd /d "%~dp0backend"

echo.
echo ========================================
echo   Байеке ИИ — Backend іске қосу
echo ========================================
echo.
echo Папка: %CD%
echo Сайт:  http://localhost:3000
echo.
echo Тоқтату: осы терезеде Ctrl+C немесе stop-backend.cmd
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ҚАТЕ] Node.js табылмады. nodejs.org сайтынан орнатыңыз.
  pause
  exit /b 1
)

if not exist "server.js" (
  echo [ҚАТЕ] server.js табылмады. start-backend.cmd файлын project түбірінен іске қосыңыз.
  pause
  exit /b 1
)

echo ИИ кілтін тексеру...
node scripts\test-ai.mjs
if errorlevel 1 (
  echo.
  echo [ЕСКЕРТУ] Gemini қазір жұмыс істемейді — жоғарыдағы нұсқауларды оқыңыз.
  echo Сервер бармын іске қосылады, бірақ чат жауап бермейді.
  echo.
  pause
)

node server.js
if errorlevel 1 (
  echo.
  echo [ҚАТЕ] Backend тоқтады. Порт 3000 бос емес болса stop-backend.cmd іске қосыңыз.
  pause
)
