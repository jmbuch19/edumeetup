@echo off
echo ==========================================
echo EduMeetup - Syncing Database with Neon...
echo Current Directory: %CD%
echo ==========================================

REM Check if .env exists
if exist .env (
    echo .env file found.
) else (
    echo ERROR: .env file NOT found in this folder!
    echo Please make sure you are in the root folder 'edumeetup-mvp'.
    pause
    exit /b 1
)

echo Running: npx prisma db push...
call npx prisma db push

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo FAILED. Please read the error message above.
) else (
    echo.
    echo SUCCESS! Database is synced.
)
pause
