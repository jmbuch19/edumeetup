@echo off
echo ==========================================
echo      edUmeetup MVP - Build Fixer
echo ==========================================
echo.
echo 1. Cleaning up old files...
rmdir /s /q .next
rmdir /s /q node_modules
del /f /q package-lock.json

echo.
echo 2. Forcing removal of Next.js 16...
call npm uninstall next

echo.
echo 3. Installing stable Next.js 14 stack...
call npm cache clean --force
call npm install
call npm list next

echo.
echo 3. Starting development server...
echo.
call npm run dev


