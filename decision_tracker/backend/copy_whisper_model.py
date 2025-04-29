import os
import shutil
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def find_whisper_models():
    """Find Whisper models in the default cache locations."""
    potential_paths = [
        # Windows paths
        os.path.expanduser("~/.cache/whisper"),
        os.path.expanduser("~/.cache/torch/hub/whisper"),
        os.path.expanduser("~/.cache/torch/hub/openai_whisper_main"),
        # Linux/Mac paths
        os.path.expanduser("~/.cache/whisper"),
        os.path.expanduser("~/.cache/torch/hub/whisper"),
    ]
    
    found_models = []
    
    for path in potential_paths:
        if os.path.exists(path):
            logger.info(f"Found potential model directory: {path}")
            for root, dirs, files in os.walk(path):
                # Look for .pt files which are PyTorch model files
                for file in files:
                    if file.endswith(".pt"):
                        found_models.append(os.path.join(root, file))
                        logger.info(f"Found model file: {file}")
    
    return found_models

def copy_models_to_local_dir(models, destination):
    """Copy found models to a local directory."""
    os.makedirs(destination, exist_ok=True)
    logger.info(f"Created local model directory: {destination}")
    
    for model_path in models:
        model_file = os.path.basename(model_path)
        dest_path = os.path.join(destination, model_file)
        
        try:
            logger.info(f"Copying {model_path} to {dest_path}")
            shutil.copy2(model_path, dest_path)
            logger.info(f"Successfully copied {model_file}")
        except Exception as e:
            logger.error(f"Error copying {model_path}: {str(e)}")
    
    logger.info(f"All found models have been copied to {destination}")

if __name__ == "__main__":
    # Define the destination directory inside the project
    current_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(current_dir, "models")
    
    # Find and copy models
    found_models = find_whisper_models()
    
    if not found_models:
        logger.warning("No Whisper models found in default cache locations")
        logger.info("The model will be downloaded when the agent is first initialized")
    else:
        logger.info(f"Found {len(found_models)} model files")
        copy_models_to_local_dir(found_models, models_dir)
        
    logger.info("Done!") 