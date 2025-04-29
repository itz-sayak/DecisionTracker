import pyaudio
import wave
import threading
import time
import os
from datetime import datetime
import logging
import subprocess
import shutil
import asyncio
import sys
import importlib.util
import re

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("MeetRecorder")

class MeetingRecorder:
    def __init__(self, output_dir="D:/DecisionTracker/decision_tracker/audio", filename=None):
        """
        Initialize the recording functionality
        
        Args:
            output_dir: Directory to save recordings, defaults to D:/DecisionTracker/decision_tracker/audio
            filename: Optional filename, defaults to timestamp-based name
        """
        self.output_dir = output_dir
        # Use mp3 extension instead of wav
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.filename = filename or f"meet_recording_{timestamp}.mp3"
        self.full_path = os.path.join(output_dir, self.filename)
        
        # Create a temporary WAV file for initial recording
        self.temp_wav_path = os.path.join(output_dir, f"temp_recording_{timestamp}.wav")
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Recording parameters
        self.format = pyaudio.paInt16
        self.channels = 1
        self.rate = 44100
        self.chunk = 1024
        self.audio = pyaudio.PyAudio()
        
        # State variables
        self.recording = False
        self.frames = []
        self.recorder_thread = None
        
        # Processing flag - default to False to disable automatic processing
        self.process_after_recording = False

    def start_recording(self):
        """Start recording audio from the default input device"""
        if self.recording:
            logger.warning("Recording is already in progress")
            return False
        
        # Start in a separate thread to not block
        self.recorder_thread = threading.Thread(target=self._record)
        self.recording = True
        self.recorder_thread.start()
        logger.info(f"Started recording to {self.full_path} (MP3)")
        return True
    
    def stop_recording(self):
        """Stop recording and save the file"""
        if not self.recording:
            logger.warning("No recording in progress")
            return False
        
        logger.info("Stopping recording...")
        self.recording = False
        
        if self.recorder_thread:
            logger.info("Waiting for recorder thread to complete...")
            self.recorder_thread.join(timeout=30)  # Wait up to 30 seconds for thread to complete
            
            if self.recorder_thread.is_alive():
                logger.warning("Recorder thread did not complete in time. Recording may be incomplete.")
            else:
                logger.info("Recorder thread completed successfully")
                
            self.recorder_thread = None
        
        # Check if the output file exists
        if os.path.exists(self.full_path):
            file_size = os.path.getsize(self.full_path)
            logger.info(f"Recording saved to {self.full_path} (size: {file_size / 1024:.1f} KB)")
            
            # Process the recording if flag is set
            if self.process_after_recording and file_size > 0:
                logger.info("Initiating automatic processing of the recording...")
                self.process_recording()
        else:
            logger.warning(f"Output file not found at {self.full_path}")
            
        return True
    
    def process_recording(self):
        """Process the recording using the same pipeline as audio uploads"""
        try:
            # Import app.py dynamically to avoid circular imports
            app_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app.py")
            spec = importlib.util.spec_from_file_location("app_module", app_path)
            app_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(app_module)
            
            # Extract timestamp from the filename if it matches the pattern, otherwise use current time
            filename = os.path.basename(self.full_path)
            timestamp_match = re.search(r'(\d{8}_\d{6})', filename)
            
            if timestamp_match:
                # Use the timestamp from the filename
                timestamp = timestamp_match.group(1)
                task_id = f"meet_recording_{timestamp}"
                logger.info(f"Using timestamp from filename: {timestamp}")
            else:
                # Fallback to current time if filename doesn't contain a timestamp
                task_id = f"meet_recording_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                logger.info("Using current timestamp for task ID")
            
            # Add the recording to the processing tasks
            app_module.processing_tasks[task_id] = {
                "status": "processing",
                "filename": os.path.basename(self.full_path),
                "file_path": self.full_path,
                "insights": None,
                "start_time": time.time()
            }
            
            logger.info(f"Created processing task with ID: {task_id}")
            
            # Start processing in a background thread to not block
            processing_thread = threading.Thread(
                target=self._run_processing, 
                args=(app_module.process_audio_file, task_id, self.full_path)
            )
            processing_thread.start()
            
            logger.info(f"Started processing thread for recording: {self.full_path}")
            return task_id
            
        except Exception as e:
            logger.error(f"Error starting processing: {str(e)}")
            return None
    
    def _run_processing(self, process_func, task_id, file_path):
        """Run the processing function in a separate thread"""
        try:
            # Create an event loop for the thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Run the processing function
            loop.run_until_complete(process_func(task_id, file_path))
            loop.close()
            
            logger.info(f"Processing completed for task: {task_id}")
        except Exception as e:
            logger.error(f"Error during processing: {str(e)}")
    
    def _convert_wav_to_mp3(self, wav_path, mp3_path):
        """Convert WAV to MP3 using FFmpeg"""
        try:
            # First try using FFmpeg directly
            if shutil.which('ffmpeg') is not None:
                logger.info("Using FFmpeg for conversion")
                cmd = ['ffmpeg', '-i', wav_path, '-codec:a', 'libmp3lame', '-qscale:a', '2', mp3_path, '-y']
                subprocess.run(cmd, check=True, capture_output=True)
                return True
            
            # Second, try using pydub
            try:
                from pydub import AudioSegment
                logger.info("Using pydub for conversion")
                audio = AudioSegment.from_wav(wav_path)
                audio.export(mp3_path, format="mp3", bitrate="192k")
                return True
            except Exception as pydub_error:
                logger.warning(f"Pydub conversion failed: {pydub_error}")
            
            # If none of the above worked, create a copy of the WAV file with MP3 extension
            # This is just a fallback to maintain consistent filename expectations
            logger.warning("Neither FFmpeg nor pydub conversion worked, creating WAV with MP3 extension")
            shutil.copy2(wav_path, mp3_path)
            logger.info("Copied WAV file with MP3 extension (not a real conversion)")
            return True
            
        except Exception as e:
            logger.error(f"Error in conversion process: {e}")
            return False
    
    def _record(self):
        """Internal recording function that runs in a thread"""
        try:
            # Find the default input device index
            default_device_info = self.audio.get_default_input_device_info()
            default_device_index = default_device_info["index"]
            logger.info(f"Using default input device: {default_device_info['name']}")
            
            # Open audio stream
            stream = self.audio.open(
                format=self.format,
                channels=self.channels,
                rate=self.rate,
                input=True,
                input_device_index=default_device_index,
                frames_per_buffer=self.chunk
            )
            
            logger.info("Recording started...")
            self.frames = []
            
            # Record until stopped
            while self.recording:
                data = stream.read(self.chunk, exception_on_overflow=False)
                self.frames.append(data)
            
            # Stop and close the stream
            stream.stop_stream()
            stream.close()
            
            # Save the recorded data first as a WAV file
            logger.info("Saving temporary WAV file...")
            wf = wave.open(self.temp_wav_path, 'wb')
            wf.setnchannels(self.channels)
            wf.setsampwidth(self.audio.get_sample_size(self.format))
            wf.setframerate(self.rate)
            wf.writeframes(b''.join(self.frames))
            wf.close()
            
            # Convert WAV to MP3
            logger.info("Converting WAV to MP3...")
            if self._convert_wav_to_mp3(self.temp_wav_path, self.full_path):
                logger.info(f"MP3 file saved to {self.full_path}")
                # Remove temporary WAV file
                os.remove(self.temp_wav_path)
                logger.info("Temporary WAV file removed")
            else:
                logger.warning("MP3 conversion failed, keeping WAV file")
                # Rename WAV file to match expected MP3 filename, but with WAV extension
                wav_output_path = os.path.splitext(self.full_path)[0] + ".wav"
                shutil.move(self.temp_wav_path, wav_output_path)
                self.full_path = wav_output_path
                logger.info(f"WAV file saved to {self.full_path}")
                
        except Exception as e:
            logger.error(f"Error during recording: {str(e)}")
            self.recording = False
    
    def get_status(self):
        """Get current recording status"""
        return {
            "recording": self.recording,
            "output_file": self.full_path if self.recording else None,
            "duration": len(self.frames) * self.chunk / self.rate if self.frames else 0
        }
    
    def __del__(self):
        """Clean up resources"""
        if self.recording:
            self.stop_recording()
        self.audio.terminate()


# Function to be called from the temporary script
def start_recording_from_meet(output_dir="D:/DecisionTracker/decision_tracker/audio"):
    """
    Start recording from Google Meet
    
    Args:
        output_dir: Directory to save the recording, defaults to D:/DecisionTracker/decision_tracker/audio
    
    Returns:
        recorder: The recorder instance
    """
    try:
        recorder = MeetingRecorder(output_dir=output_dir)
        recorder.start_recording()
        logger.info(f"Started recording Google Meet session to {recorder.full_path}")
        return recorder
    except Exception as e:
        logger.error(f"Failed to start recording: {str(e)}")
        return None


def get_latest_recording(audio_dir="D:/DecisionTracker/decision_tracker/audio"):
    """
    Get the most recently created MP3 file in the audio directory
    
    Args:
        audio_dir: Directory to look for recordings
        
    Returns:
        path: Full path to the most recent MP3 file, or None if not found
    """
    try:
        # Ensure the directory exists
        if not os.path.exists(audio_dir):
            logger.warning(f"Audio directory {audio_dir} does not exist")
            return None
            
        # Get all MP3 files
        mp3_files = [os.path.join(audio_dir, f) for f in os.listdir(audio_dir) 
                    if f.lower().endswith('.mp3')]
        
        if not mp3_files:
            logger.warning(f"No MP3 files found in {audio_dir}")
            return None
            
        # Get the most recent file by modification time
        latest_file = max(mp3_files, key=os.path.getmtime)
        logger.info(f"Found most recent MP3 file: {latest_file}")
        
        return latest_file
        
    except Exception as e:
        logger.error(f"Error finding latest recording: {str(e)}")
        return None


def process_latest_recording(audio_dir="D:/DecisionTracker/decision_tracker/audio"):
    """
    Process the most recent recording in the audio directory
    
    Args:
        audio_dir: Directory to look for recordings
        
    Returns:
        task_id: ID of the processing task, or None if failed
    """
    try:
        # Find the latest recording
        latest_file = get_latest_recording(audio_dir)
        if not latest_file:
            logger.warning("No recordings found to process")
            return None
            
        # Create a recorder instance just for processing
        recorder = MeetingRecorder(output_dir=audio_dir)
        recorder.full_path = latest_file
        
        # Process the recording
        task_id = recorder.process_recording()
        return task_id
        
    except Exception as e:
        logger.error(f"Error processing latest recording: {str(e)}")
        return None


if __name__ == "__main__":
    # Testing the recorder
    recorder = MeetingRecorder()
    recorder.start_recording()
    print("Recording for 10 seconds...")
    time.sleep(10)
    recorder.stop_recording()
    print(f"Recording saved to {recorder.full_path}") 