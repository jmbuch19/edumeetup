@echo off
echo ==========================================
echo      edUmeetup MVP - Cleanup Tool
echo ==========================================
echo.
echo This script prepares your project for sharing by removing
echo massive downloaded libraries and build files.
echo.
echo The recipient developer will allow reinstall them easily.
echo.
pause

echo.
echo 1. Removing node_modules (this reduces size by ~500MB)...
rmdir /s /q node_modules

echo.
echo 2. Removing build artifacts...
rmdir /s /q .next

echo.
echo 3. Cleanup complete!
echo.
echo You can now ZIP this folder and send it to your developer.
echo.
pause
