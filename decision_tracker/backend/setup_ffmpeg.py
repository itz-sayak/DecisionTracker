import os
import subprocess
import sys
import logging

logger = logging.getLogger(__name__)

def check_ffmpeg():
    """
    Check if FFmpeg is installed on the system.
    
    Returns:
        bool: True if FFmpeg is available, False otherwise
    """
    logger.info("Checking for FFmpeg installation...")
    
    try:
        # Try to run ffmpeg -version and capture the output
        result = subprocess.run(
            ["ffmpeg", "-version"], 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True,
            check=False
        )
        
        if result.returncode == 0:
            version_info = result.stdout.split('\n')[0]
            logger.info(f"FFmpeg found: {version_info}")
            return True
        else:
            logger.warning(f"FFmpeg check failed with return code: {result.returncode}")
            logger.warning(f"Error output: {result.stderr}")
            return False
            
    except FileNotFoundError:
        logger.warning("FFmpeg not found in system PATH")
        return False
    except Exception as e:
        logger.warning(f"Error checking FFmpeg: {str(e)}")
        return False

def setup_ffmpeg():
    """
    Maintained for backward compatibility.
    Just checks if FFmpeg is installed.
    
    Returns:
        bool: True if FFmpeg is available, False otherwise
    """
    return check_ffmpeg()

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Check FFmpeg
    if check_ffmpeg():
        print("FFmpeg is installed and working correctly!")
        sys.exit(0)
    else:
        print("FFmpeg is not installed or not working correctly.")
        print("Please install FFmpeg on your system to use audio transcription features.")
        print("On Windows: Download from https://www.gyan.dev/ffmpeg/builds/ and add to PATH")
        print("On Ubuntu/Debian: sudo apt install ffmpeg")
        print("On macOS: brew install ffmpeg")
        sys.exit(1) 