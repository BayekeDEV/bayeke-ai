@echo off
chcp 65001 >nul
title Байеке ИИ — Backend тоқтату
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Байеке ИИ — Backend тоқтату
echo ========================================
echo.

set FOUND=0

for /f "tokens=5" %%P in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
  set FOUND=1
  echo Порт 3000 — процесс %%P тоқтатылуда...
  taskkill /F /PID %%P >nul 2>&1
  if errorlevel 1 (
    echo [ЕСКЕРТУ] %%P процессін тоқтату сәтсіз. Админ ретінде қайта көріңіз.
  ) else (
    echo [OK] Backend тоқтатылды.
  )
)

if "!FOUND!"=="0" (
  echo [АҚПАРАТ] Порт 3000 бос — backend іске қосылмаған сияқты.
)

echo.
pause
