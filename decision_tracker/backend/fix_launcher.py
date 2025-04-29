"""
Fix uvicorn launcher to use the correct Python path.
"""
import os
import sys

def create_uvicorn_wrapper():
    """Create a wrapper script for uvicorn that uses the correct Python path"""
    scripts_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "venv", "Scripts")
    
    # Path to uvicorn executable
    uvicorn_path = os.path.join(scripts_dir, "uvicorn.exe")
    
    # Path to uvicorn-wrapper.bat
    wrapper_path = os.path.join(scripts_dir, "uvicorn-wrapper.bat")
    
    # Create a batch file that will call uvicorn with the correct Python
    with open(wrapper_path, "w") as f:
        f.write('@echo off\n')
        f.write('"%~dp0python.exe" -m uvicorn %*\n')
    
    print(f"Created uvicorn wrapper at: {wrapper_path}")
    print("This wrapper will use the correct Python executable.")
    print("\nTo use uvicorn, activate your virtual environment and run:")
    print("uvicorn-wrapper app:app --reload")

if __name__ == "__main__":
    create_uvicorn_wrapper()
    print("\nWrapper created successfully!") 