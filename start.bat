@echo off
title VoxAI - Voice & Text AI Assistant
echo Starting VoxAI Assistant...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo Launching index.html directly...
    start "" "%~dp0index.html"
)
