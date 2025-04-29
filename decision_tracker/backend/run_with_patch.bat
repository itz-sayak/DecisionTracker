@echo off
echo Starting Decision Tracker with audio patches...
python -m uvicorn app:app --reload
pause
