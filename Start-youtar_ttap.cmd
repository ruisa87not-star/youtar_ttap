@echo off
setlocal EnableExtensions DisableDelayedExpansion
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-youtar_ttap.ps1"
if errorlevel 1 (
    pause
    exit /b 1
)
exit /b 0
