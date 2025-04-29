@echo off
echo Starting Decision Tracker Backend Server

rem Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created.
)

rem Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate

rem Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

rem Start the server
echo Starting server...
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

rem If the server is stopped, deactivate the virtual environment
call venv\Scripts\deactivate.bat 