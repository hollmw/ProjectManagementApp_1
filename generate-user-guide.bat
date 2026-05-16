@echo off
echo Generating DRESIO User Guide...
echo.

set SCRIPT_DIR=%APPDATA%\Claude\local-agent-mode-sessions\8c104eeb-b35a-4c9c-a2a1-e3540e896e7a\729783ee-067b-4c19-b2fa-60a1ad167769\local_1d1a6a1f-380b-4490-b60b-69c661a5ecb5\outputs

cd /d "%SCRIPT_DIR%"

echo Installing docx library...
call npm install docx --save 2>nul

echo Running build script...
node build-guide.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Copying to your project folder...
    copy /Y "%SCRIPT_DIR%\dresio-user-guide.docx" "%~dp0dresio-user-guide.docx"
    echo.
    echo Done! dresio-user-guide.docx is now in your ProjectManagementApp_1 folder.
) else (
    echo.
    echo Something went wrong. Make sure Node.js is installed on your computer.
    echo Download it from: https://nodejs.org
)

echo.
pause
