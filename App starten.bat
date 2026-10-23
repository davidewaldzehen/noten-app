@echo off
rem Startet die Noten-App lokal und öffnet sie im Browser. Fenster offen lassen, solange die App läuft.
cd /d "%~dp0"
if not exist node_modules (
  echo Installiere einmalig die Bibliotheken ...
  call npm install
)
call npm run dev -- --open
