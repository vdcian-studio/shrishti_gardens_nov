@echo off
cd /d "%~dp0"
echo Starting Shrishti Gardens on http://localhost:5173
start "" http://localhost:5173
where npx >nul 2>nul && (npx --yes serve -l 5173) || (python -m http.server 5173)
