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
                logger.info(f"First line of file: {first_line}")
                if first_line.startswith("This is a test transcript"):
                    logger.info("Test file content detected")
        except Exception as e:
            logger.warning(f"Error reading file content: {str(e)}")
        
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
            
            # Add a validation check for the insights structure
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
            
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}", exc_info=True)
            processing_tasks[task_id]["status"] = "failed"
            processing_tasks[task_id]["error"] = f"Analysis failed: {str(e)}"
            return
        
        # Update task with results
        processing_tasks[task_id]["status"] = "completed"
        processing_tasks[task_id]["insights"] = insights
        processing_tasks[task_id]["end_time"] = time.time()
        processing_tasks[task_id]["transcription_time"] = transcription_time
        processing_tasks[task_id]["analysis_time"] = analysis_time
        
        total_time = processing_tasks[task_id]["end_time"] - processing_tasks[task_id]["start_time"]
        logger.info(f"Total processing time: {total_time:.2f} seconds")
        logger.info(f"===== PROCESSING COMPLETED FOR TASK: {task_id} =====")
        
    except Exception as e:
        logger.error(f"Error processing audio file: {str(e)}", exc_info=True)
        processing_tasks[task_id]["status"] = "failed"
        processing_tasks[task_id]["error"] = f"Error processing audio file: {str(e)}"
        processing_tasks[task_id]["end_time"] = time.time()
        logger.error(f"===== PROCESSING FAILED FOR TASK: {task_id} =====")
    finally:
        # Clean up the temporary file
        if os.path.exists(file_path):
            logger.info(f"Cleaning up temporary file: {file_path}")
            try:
                os.unlink(file_path)
                logger.info("File cleanup complete")
            except Exception as e:
                logger.warning(f"Error cleaning up file: {str(e)}")
                # Don't let file cleanup failure break the whole process


@app.get("/test")
async def test_agent():
    """Test endpoint to verify the agent is working correctly."""
    logger.info("Test endpoint accessed")
    
    try:
        # Create a test file
        test_file_path = os.path.join("uploads", "test_direct.mp3")
        with open(test_file_path, "w") as f:
            f.write("This is a test transcript for the decision tracker application.")
        
        logger.info(f"Created test file at {test_file_path}")
        
        # Initialize the agent
        logger.info("Initializing DecisionTrackerAgent...")
        agent = DecisionTrackerAgent()
        logger.info("Agent initialized successfully")
        
        # Test transcription
        logger.info("Testing transcription...")
        transcript = agent.transcribe_audio(test_file_path)
        logger.info(f"Transcription successful. Length: {len(transcript)}")
        
        # Test analysis
        logger.info("Testing analysis...")
        insights = agent.analyze_transcript(transcript)
        logger.info("Analysis successful!")
        
        # Clean up
        if os.path.exists(test_file_path):
            os.unlink(test_file_path)
            
        return {
            "status": "success",
            "message": "Agent test completed successfully",
            "insights": insights
        }
        
    except Exception as e:
        logger.error(f"Error in test endpoint: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "message": f"Error testing agent: {str(e)}"
        }


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Decision Tracker API server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 