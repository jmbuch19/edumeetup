@echo off
echo ==========================================
echo Starting Deployment Process...
echo Repo: https://github.com/jmbuch19/edumeetup.git
echo Current Directory: %CD%
echo ==========================================

REM Check Git Config - Set if missing (using placeholder if needed, user can change later)
git config user.email >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Setting default git identity...
    git config --global user.email "deploy@edumeetup.com"
    git config --global user.name "EduMeetup Deployer"
)

REM Initialize Git if not present
if not exist .git (
    echo Initializing Git repository...
    git init
    git branch -M main
)

REM Set Remote Origin
echo Setting remote to https://github.com/jmbuch19/edumeetup.git...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/jmbuch19/edumeetup.git

echo ==========================================
echo Adding files...
git add .
echo Committing changes...
git commit -m "Deployment fix - Final"
echo Pushing to GitHub...
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo PUSH FAILED.
    echo Please check if you have permission to push to this repository.
    echo or if the repository is empty (you might need to pull first if it's not).
) else (
    echo.
    echo SUCCESS! Code is on GitHub. Vercel should be deploying the fix now.
)
pause
