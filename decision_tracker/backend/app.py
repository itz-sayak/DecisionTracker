from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import time
from tempfile import NamedTemporaryFile
import uuid
from typing import Dict, List, Optional
import json
import logging
from dotenv import load_dotenv
from pydantic import BaseModel
import subprocess
import sys
import signal
import atexit
from datetime import datetime

# Import our agent
from agents.decision_tracker_agent import DecisionTrackerAgent

# Import the FFmpeg check function
from setup_ffmpeg import check_ffmpeg

# Check if FFmpeg is available
try:
    ffmpeg_available = check_ffmpeg()
    if not ffmpeg_available:
        print("WARNING: FFmpeg is not installed or not found in PATH.")
        print("Audio transcription may not work correctly.")
        print("Please install FFmpeg to use audio transcription features.")
except Exception as e:
    print(f"Error checking FFmpeg: {e}")
    print("WARNING: Audio transcription may not work correctly.")

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Decision Tracker API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for tracking processing tasks
processing_tasks: Dict[str, Dict] = {}

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)
logger.info(f"Uploads directory: {os.path.abspath('uploads')}")

# Pydantic model for Google Meet connection
class GoogleMeetRequest(BaseModel):
    email: str
    password: str
    meeting_link: str

@app.get("/")
async def root():
    logger.info("Root endpoint accessed")
    return {"message": "Decision Tracker API is running"}


@app.post("/upload-audio")
async def upload_audio(background_tasks: BackgroundTasks, 
                       file: UploadFile = File(...)):
    """
    Upload an MP3 audio file for processing.
    
    The file will be processed in the background and insights extracted.
    """
    start_time = time.time()
    logger.info(f"Received upload request for file: {file.filename}")
    logger.info(f"Content type: {file.content_type}")
    
    # Validate file type
    if not file.filename.endswith('.mp3'):
        logger.warning(f"Invalid file type: {file.filename}")
        raise HTTPException(status_code=400, detail="Only MP3 files are supported")
    
    # Generate a unique ID for this processing task
    task_id = str(uuid.uuid4())
    logger.info(f"Generated task ID: {task_id}")
    
    # Save the uploaded file
    temp_file = NamedTemporaryFile(delete=False, suffix='.mp3', dir="uploads")
    temp_file_path = temp_file.name
    logger.info(f"Saving file to: {temp_file_path}")
    
    try:
        # Write the file content
        with open(temp_file_path, "wb") as f:
            logger.info("Reading file content...")
            content = await file.read()
            logger.info(f"File size: {len(content) / (1024 * 1024):.2f} MB")
            f.write(content)
            logger.info("File saved successfully")
        
        # Store task information
        processing_tasks[task_id] = {
            "status": "processing",
            "filename": file.filename,
            "file_path": temp_file_path,
            "insights": None,
            "start_time": time.time()
        }
        logger.info(f"Task {task_id} initialized and set to processing status")
        
        # Process the audio file in the background
        logger.info(f"Adding background task to process file: {temp_file_path}")
        background_tasks.add_task(
            process_audio_file, 
            task_id=task_id, 
            file_path=temp_file_path
        )
        logger.info("Background task added successfully")
        
        processing_time = time.time() - start_time
        logger.info(f"Upload handling completed in {processing_time:.2f} seconds")
        return {"task_id": task_id, "status": "processing"}
    
    except Exception as e:
        # Clean up in case of error
        if os.path.exists(temp_file_path):
            logger.info(f"Cleaning up temporary file: {temp_file_path}")
            os.unlink(temp_file_path)
        logger.error(f"Error processing audio upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing upload: {str(e)}")


@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of a processing task."""
    logger.info(f"Status request for task: {task_id}")
    
    if task_id not in processing_tasks:
        logger.warning(f"Task not found: {task_id}")
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = processing_tasks[task_id]
    logger.info(f"Task {task_id} status: {task['status']}")
    
    # Return task status and insights if available
    response = {
        "task_id": task_id,
        "status": task["status"],
        "filename": task["filename"]
    }
    
    if task["status"] == "completed" and task["insights"]:
        logger.info(f"Returning insights for task: {task_id}")
        response["insights"] = task["insights"]
        
        # Add processing time if available
        if "end_time" in task and "start_time" in task:
            processing_time = task["end_time"] - task["start_time"]
            logger.info(f"Total processing time: {processing_time:.2f} seconds")
            response["processing_time_seconds"] = round(processing_time, 2)
    
    # Include error information if task failed
    if task["status"] == "failed" and "error" in task:
        logger.info(f"Task failed with error: {task['error']}")
        response["error"] = task["error"]
    
    return response


async def process_audio_file(task_id: str, file_path: str):
    """
    Process an audio file to extract insights.
    
    This function runs in the background after file upload.
    """
    try:
        logger.info(f"===== STARTING PROCESSING TASK: {task_id} =====")
        logger.info(f"Processing audio file: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"File does not exist: {file_path}")
            processing_tasks[task_id]["status"] = "failed"
            processing_tasks[task_id]["error"] = "File not found"
            return
            
        logger.info(f"File exists and has size: {os.path.getsize(file_path)} bytes")
        
        # Read file content to check if it's a test file
        try:
            with open(file_path, 'r') as f:
                first_line = f.readline()
                if first_line.strip() == "TEST_FILE":
                    logger.info("Test file detected, generating mock response")
                    time.sleep(2)  # Simulate processing time
                    
                    # Generate mock insights
                    insights = {
                        "executiveSummary": "This is a test file. No real transcription or insights were generated.",
                        "decisionPoints": ["Test decision 1", "Test decision 2"],
                        "risksConcernsRaised": ["Test risk 1", "Test risk 2"],
                        "actionItems": ["Test action 1", "Test action 2"],
                        "unresolvedQuestions": ["Test question 1", "Test question 2"]
                    }
                    
                    # Update task
                    processing_tasks[task_id]["insights"] = insights
                    processing_tasks[task_id]["status"] = "completed"
                    processing_tasks[task_id]["end_time"] = time.time()
                    logger.info("Test file processed successfully")
                    return
        except UnicodeDecodeError:
            # Expected for binary files like mp3
            logger.info("File is binary (as expected for audio)")
        except Exception as e:
            logger.warning(f"Error checking if file is test file: {str(e)}")
        
        # Create decision tracker agent
        logger.info("Initializing DecisionTrackerAgent...")
        try:
            agent = DecisionTrackerAgent()
            logger.info("Agent initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize agent: {str(e)}", exc_info=True)
            processing_tasks[task_id]["status"] = "failed"
            processing_tasks[task_id]["error"] = f"Agent initialization failed: {str(e)}"
            return
        
        # Transcribe the audio
        logger.info("Starting audio transcription...")
        transcription_start = time.time()
        try:
            transcript = agent.transcribe_audio(file_path)
            transcription_time = time.time() - transcription_start
            logger.info(f"Transcription completed in {transcription_time:.2f} seconds")
            logger.info(f"Transcript length: {len(transcript)} characters")
            logger.info(f"Transcript excerpt: {transcript[:100]}...")
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}", exc_info=True)
            processing_tasks[task_id]["status"] = "failed"
            processing_tasks[task_id]["error"] = f"Transcription failed: {str(e)}"
            return
        
        # Analyze the transcript to extract insights
        logger.info("Starting transcript analysis...")
        analysis_start = time.time()
        try:
            insights = agent.analyze_transcript(transcript)
            analysis_time = time.time() - analysis_start
            logger.info(f"Analysis completed in {analysis_time:.2f} seconds")
            
            # Validate insights
            if not insights:
                logger.error("Analysis returned empty insights")
                processing_tasks[task_id]["status"] = "failed"
                processing_tasks[task_id]["error"] = "Analysis returned empty insights"
                return
                
            # Verify insights has the required fields
            required_fields = ["executiveSummary", "decisionPoints", "risksConcernsRaised", "actionItems", "unresolvedQuestions"]
            missing_fields = [field for field in required_fields if field not in insights]
            
            if missing_fields:
                logger.error(f"Insights missing required fields: {missing_fields}")
                processing_tasks[task_id]["status"] = "failed"
                processing_tasks[task_id]["error"] = f"Insights missing required fields: {missing_fields}"
                return
                
            logger.info(f"Insights structure is valid and complete")
            
            # Store the insights and mark as completed
            processing_tasks[task_id]["insights"] = insights
            processing_tasks[task_id]["status"] = "completed"
            processing_tasks[task_id]["end_time"] = time.time()
            
            total_time = processing_tasks[task_id]["end_time"] - processing_tasks[task_id]["start_time"]
            logger.info(f"Total processing time: {total_time:.2f} seconds")
            logger.info(f"===== COMPLETED PROCESSING TASK: {task_id} =====")
            
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}", exc_info=True)
            processing_tasks[task_id]["status"] = "failed"
            processing_tasks[task_id]["error"] = f"Analysis failed: {str(e)}"
            
    except Exception as e:
        logger.error(f"Error processing audio file: {str(e)}", exc_info=True)
        if task_id in processing_tasks:
            processing_tasks[task_id]["status"] = "failed"
            processing_tasks[task_id]["error"] = f"Error processing audio file: {str(e)}"
            

@app.get("/test")
async def test_agent():
    """
    Test endpoint to check if the agent is functional.
    """
    logger.info("Test endpoint accessed")
    try:
        agent = DecisionTrackerAgent()
        test_transcript = "This is a test transcript. We decided to launch the product next month. John will handle marketing."
        insights = agent.analyze_transcript(test_transcript)
        logger.info("Test analysis successful")
        return {
            "status": "success",
            "message": "Agent test successful",
            "insights": insights
        }
    except Exception as e:
        logger.error(f"Test failed: {str(e)}", exc_info=True)
        return {
            "status": "failed",
            "message": f"Agent test failed: {str(e)}"
        }

@app.post("/connect-gmeet")
async def connect_to_gmeet(request: GoogleMeetRequest):
    """
    Connect to a Google Meet meeting using Selenium and record audio
    """
    logger.info(f"Received request to connect to Google Meet: {request.meeting_link}")
    
    try:
        # Use the existing myenv virtual environment
        venv_path = os.path.join(os.path.dirname(__file__), "myenv")
        
        # Determine path to python in virtual environment
        if sys.platform == "win32":
            python_exec = os.path.join(venv_path, "Scripts", "python.exe")
        else:
            python_exec = os.path.join(venv_path, "bin", "python")
        
        # Get the full path to the gmeet.py script
        gmeet_script = os.path.join(os.path.dirname(__file__), "gmeet.py")
        
        # Create a temporary script to run gmeet.py with the provided credentials
        temp_script = os.path.join(os.path.dirname(__file__), f"temp_gmeet_{uuid.uuid4()}.py")
        
        with open(temp_script, "w") as f:
            f.write(f"""
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
import time
import pytz
from datetime import datetime
import getpass
import sys
import os
import signal
import atexit
import traceback

# Import functions from the original gmeet.py but prevent the script from running on import
sys.path.append(os.path.dirname(__file__))
from gmeet import Glogin, turnOffMicCam, joinNow

# Import the recorder functionality
from meet_recorder import MeetingRecorder

# Your Gmail credentials from the frontend
mail_address = "{request.email}"
password = "{request.password}"
meeting_link = "{request.meeting_link}"

# Print the credentials for debugging
print(f"Connecting to: {{meeting_link}}")
print(f"Using email: {{mail_address}}")

# Create a recorder instance to capture meeting audio
# Save in the decision_tracker/audio folder
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
output_dir = os.path.join(PROJECT_ROOT, "audio")
# Make sure the audio directory exists
os.makedirs(output_dir, exist_ok=True)
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
recorder = MeetingRecorder(output_dir=output_dir, filename=f"meet_recording_{{timestamp}}.mp3")
# Explicitly disable automatic processing
recorder.process_after_recording = False

# Track if cleanup has been performed
cleanup_done = False

def cleanup():
    global cleanup_done
    if cleanup_done:
        return
    
    cleanup_done = True
    print("\\nExiting... stopping recording and saving file.")
    
    try:
        if recorder and recorder.recording:
            recorder.stop_recording()
            print(f"Recording saved to {{recorder.full_path}}")
            
            # No automatic processing - just inform the user
            print("\\nRecording has been saved to the audio folder.")
            print("To process this recording and generate insights:")
            print("1. Go to the main page of the application")
            print("2. Select 'Upload Audio File'")
            print("3. Choose the saved recording file")
            print("4. Click 'Upload and Process'")
    except Exception as e:
        print(f"Error during cleanup: {{str(e)}}")
        print("Traceback:", traceback.format_exc())

# Register cleanup handlers for various scenarios
atexit.register(cleanup)
signal.signal(signal.SIGINT, lambda sig, frame: (cleanup(), sys.exit(0)))
signal.signal(signal.SIGTERM, lambda sig, frame: (cleanup(), sys.exit(0)))
if hasattr(signal, 'SIGABRT'):
    signal.signal(signal.SIGABRT, lambda sig, frame: (cleanup(), sys.exit(0)))
if hasattr(signal, 'SIGBREAK') and sys.platform == 'win32':
    signal.signal(signal.SIGBREAK, lambda sig, frame: (cleanup(), sys.exit(0)))

# Selenium setup
opt = Options()
opt.add_argument("--disable-blink-features=AutomationControlled")
opt.add_argument("--start-maximized")
opt.add_experimental_option(
    "prefs",
    {{
        "profile.default_content_setting_values.media_stream_mic": 1,
        "profile.default_content_setting_values.media_stream_camera": 1,
        "profile.default_content_setting_values.geolocation": 0,
        "profile.default_content_setting_values.notifications": 1,
    }},
)

print("Starting Chrome...")
driver = webdriver.Chrome(options=opt)

print("Logging into Google...")
Glogin(driver, mail_address, password)

print(f"Joining meeting: {{meeting_link}}")
# Modified version of joinNow that doesn't block
driver.get(meeting_link)
turnOffMicCam(driver)
print("Meeting started.")

# Start recording after joining the meeting
print("Starting audio recording (MP3 format)...")
recorder.start_recording()
print(f"Recording to: {{recorder.full_path}}")

try:
    # Keep running until manually closed or meeting ends
    print("\\nMeeting in progress. Recording audio. Recording will automatically stop when the meeting ends.")
    print("DO NOT CLOSE THIS WINDOW unless you want to end the recording manually.")
    print("The recording will be saved as an MP3 file when the meeting ends or you close this window.")
    
    # Flag to track if we're still in the meeting
    in_meeting = True
    
    while in_meeting:
        time.sleep(5)
        
        # Print a status update every 60 seconds
        if int(time.time()) % 60 == 0:
            duration = recorder.get_status()["duration"]
            print(f"Recording in progress... Duration: {{duration:.1f}} seconds")
        
        try:
            # Check if we're still in the meeting by looking for specific elements
            # This could be "You left the meeting", "Meeting ended", or absence of meeting UI elements
            
            # Method 1: Check if we got disconnected/kicked (look for "You left" text)
            left_texts = ["You left the meeting", "Meeting ended", "You've left", 
                         "You were removed", "Meeting is over", "Call ended"]
            
            for leave_text in left_texts:
                try:
                    xpath_expression = f"//*[contains(text(), '{{leave_text}}')]"
                    if driver.find_element(By.XPATH, xpath_expression):
                        print(f"Detected: {{leave_text}}")
                        in_meeting = False
                        break
                except:
                    pass
            
            # Method 2: Check if the URL has changed away from meet.google.com
            current_url = driver.current_url
            if not current_url.startswith("https://meet.google.com"):
                print("No longer on Google Meet URL")
                in_meeting = False
            
            # Method 3: Check for specific meeting elements to confirm we're still in a call
            try:
                # Try to find elements that should be present during an active meeting
                meeting_elements = driver.find_elements(By.CSS_SELECTOR, 
                                                       "div[data-meeting-title], div[role='complementary'], div[jsname='SQpL2c']")
                if not meeting_elements:
                    # If none of the meeting elements are found, we might have left
                    print("Meeting elements no longer found")
                    in_meeting = False
            except:
                pass
                
        except Exception as e:
            # If error when checking meeting status, assume we're no longer in the meeting
            print(f"Error checking meeting status: {{e}}")
            in_meeting = False
    
    print("\\nMeeting has ended or user has left. Stopping recording...")
            
except KeyboardInterrupt:
    print("\\nKeyboard interrupt received.")
except Exception as e:
    print(f"\\nUnexpected error: {{e}}")
    print("Traceback:", traceback.format_exc())
finally:
    cleanup()
    try:
        driver.quit()
    except:
        pass
    print("Meeting ended. Browser closed.")
            """)
        
        # Run the temporary script in a separate process
        logger.info(f"Starting Google Meet connection process with script: {temp_script}")
        
        # Run in background to not block API
        process = subprocess.Popen([python_exec, temp_script], 
                         creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0)
        
        logger.info(f"Process started with PID: {process.pid}")
        
        return {"status": "success", "message": "Google Meet connection started with recording", "process_id": process.pid}
    
    except Exception as e:
        logger.error(f"Error connecting to Google Meet: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error connecting to Google Meet: {str(e)}")
    finally:
        # Clean up temp script after a delay (give time for the process to start)
        # We don't wait for it to complete since this runs in background
        time.sleep(3)
        try:
            if os.path.exists(temp_script):
                os.remove(temp_script)
        except Exception as e:
            logger.error(f"Error removing temporary script: {str(e)}")

@app.get("/process-latest-recording")
async def process_latest_recording():
    """
    Process the most recent recording in the audio directory
    """
    try:
        # Import the function to get and process the latest recording
        from meet_recorder import process_latest_recording
        
        # Process the latest recording
        logger.info("Processing latest recording from the audio folder")
        task_id = process_latest_recording()
        
        if task_id:
            logger.info(f"Processing started with task ID: {task_id}")
            return {"status": "success", "message": "Processing started", "task_id": task_id}
        else:
            logger.warning("No recordings found to process")
            return {"status": "error", "message": "No recordings found to process"}
    
    except Exception as e:
        logger.error(f"Error processing latest recording: {str(e)}", exc_info=True)
        return {"status": "error", "message": f"Error processing recording: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Decision Tracker API server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 