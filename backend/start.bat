@echo off
REM FoodGrid Boston — Django dev server startup script (Windows).
REM Runs on 127.0.0.1:8000 so Vite's proxy can reach it.

cd /d "%~dp0"

REM Load .env if present (basic key=value, no spaces around =)
if exist .env (
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" if not "%%A:~0,1%"=="#" set "%%A=%%B"
  )
)

REM Verify MongoDB connectivity before starting
python manage.py check_connection
if errorlevel 1 (
  echo ERROR: check_connection failed. Is MONGODB_URI set in backend/.env?
  exit /b 1
)

echo Starting Django on http://127.0.0.1:8000 ...
python manage.py runserver 127.0.0.1:8000
