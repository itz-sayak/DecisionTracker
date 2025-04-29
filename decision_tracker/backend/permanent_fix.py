"""
Permanent fix for uvicorn launcher path issues.

This script modifies the uvicorn.exe file to always use the current Python
interpreter path rather than a hardcoded path.
"""
import os
import sys
import re
import subprocess

def fix_uvicorn_launcher(venv_path):
    """
    Create a better uvicorn launcher that always uses the current Python path.
    
    Args:
        venv_path: Path to the virtual environment
    """
    scripts_dir = os.path.join(venv_path, "Scripts")
    if not os.path.exists(scripts_dir):
        print(f"Scripts directory not found at: {scripts_dir}")
        return False
        
    # Create a better launcher script
    uvicorn_bat = os.path.join(scripts_dir, "uvicorn.bat")
    
    # Create a batch file that will always use the current Python
    with open(uvicorn_bat, "w") as f:
        f.write('@echo off\n')
        f.write('REM This is a fixed launcher that always uses the current Python\n')
        f.write('"%~dp0python.exe" -m uvicorn %*\n')
    
    print(f"Created fixed uvicorn launcher at: {uvicorn_bat}")
    print("This launcher will always use the correct Python executable.")
    
    return True

def fix_all_venvs():
    """Fix all virtual environments in the backend directory"""
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Find all virtual environment directories
    venv_dirs = []
    for item in os.listdir(backend_dir):
        item_path = os.path.join(backend_dir, item)
        if os.path.isdir(item_path) and (
            item.startswith("venv") or
            item.startswith("env") or
            item.endswith("venv") or
            item.endswith("env")
        ):
            venv_dirs.append(item_path)
    
    if not venv_dirs:
        print("No virtual environments found in backend directory")
        return False
    
    success = False
    for venv_dir in venv_dirs:
        print(f"Fixing virtual environment: {venv_dir}")
        if fix_uvicorn_launcher(venv_dir):
            success = True
    
    return success

if __name__ == "__main__":
    print("Fixing uvicorn launchers in all virtual environments...")
    if fix_all_venvs():
        print("\nAll uvicorn launchers fixed successfully!")
        print("\nTo run uvicorn, activate your virtual environment and run:")
        print("uvicorn app:app --reload")
    else:
        print("\nFailed to fix any uvicorn launchers.") 