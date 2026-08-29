@echo off
setlocal
cd /d "%~dp0"
set "PORT=8080"

where py >nul 2>nul
if %errorlevel%==0 (
  start "Валка ГЭСН — локальный сервер" cmd /c "cd /d ""%~dp0"" && py -m http.server %PORT%"
) else (
  where python >nul 2>nul
  if errorlevel 1 (
    echo Не найден Python 3.
    echo Установите Python 3 либо разместите содержимое папки на HTTPS-хостинге.
    pause
    exit /b 1
  )
  start "Валка ГЭСН — локальный сервер" cmd /c "cd /d ""%~dp0"" && python -m http.server %PORT%"
)

timeout /t 2 /nobreak >nul
start "" "http://localhost:%PORT%/"
echo Приложение открыто: http://localhost:%PORT%/
echo Для остановки сервера закройте окно "Валка ГЭСН — локальный сервер".
endlocal
