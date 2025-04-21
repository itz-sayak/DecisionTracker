import requests
import os
import json
import shutil
import sys

# Check if we should test the agent directly
direct_test = len(sys.argv) > 1 and sys.argv[1] == "--direct"

if direct_test:
    print("Testing the agent directly without API...")
    
    # Import the agent
    from agents.decision_tracker_agent import DecisionTrackerAgent
    
    # Create a test file
    test_file_path = os.path.join('uploads', 'test_audio.mp3')
    with open(test_file_path, 'w') as f:
        f.write("This is a test transcript for the decision tracker application.")
    
    # Create an agent instance
    agent = DecisionTrackerAgent()
    
    # Test transcription
    try:
        print("Testing transcription...")
        transcript = agent.transcribe_audio(test_file_path)
        print(f"Transcription successful. Length: {len(transcript)}")
        print(f"Transcript excerpt: {transcript[:100]}...")
        
        # Test analysis
        print("\nTesting analysis...")
        insights = agent.analyze_transcript(transcript)
        print("Analysis successful!")
        print("Insights:")
        print(json.dumps(insights, indent=2))
        
    except Exception as e:
        print(f"Error during direct agent test: {str(e)}")
    
    # Exit after direct test
    sys.exit(0)

# Create a proper test file with test_ prefix
test_file_path = os.path.join('uploads', 'test_audio.mp3')

# Ensure the file has content and exists
with open(test_file_path, 'w') as f:
    f.write("This is a test transcript for the decision tracker application.")

# Print file information
print(f"Testing with file: {test_file_path}")
print(f"File exists: {os.path.exists(test_file_path)}")
print(f"File size: {os.path.getsize(test_file_path)} bytes")

# Read and print the file content to verify
with open(test_file_path, 'r') as f:
    content = f.read()
    print(f"File content: {content}")
    print(f"Content starts with 'This is a test transcript': {content.startswith('This is a test transcript')}")

# Prepare the file upload
files = {
    'file': ('test_audio.mp3', open(test_file_path, 'rb'), 'audio/mp3')
}

# Upload the file
print("Uploading file...")
response = requests.post('http://localhost:8000/upload-audio', files=files)
print(f"Response status code: {response.status_code}")
print(f"Response content: {response.text}")

if response.status_code == 200:
    data = response.json()
    task_id = data.get('task_id')
    
    print(f"Task ID: {task_id}")
    print("Waiting for processing to complete...")
    
    # Poll for results
    task_complete = False
    max_attempts = 10
    attempts = 0
    
    while not task_complete and attempts < max_attempts:
        attempts += 1
        print(f"Polling attempt {attempts}...")
        
        task_response = requests.get(f'http://localhost:8000/task/{task_id}')
        task_data = task_response.json()
        
        print(f"Task status: {task_data.get('status')}")
        
        if task_data.get('status') == 'completed':
            task_complete = True
            print("Task completed!")
            print("Insights:")
            print(json.dumps(task_data.get('insights'), indent=2))
        elif task_data.get('status') == 'failed':
            print("Task failed!")
            print(f"Error: {task_data.get('error')}")
            break
        
        if not task_complete:
            import time
            print("Waiting 3 seconds...")
            time.sleep(3)
    
    if not task_complete:
        print("Maximum polling attempts reached. Process may still be running.")
else:
    print("Upload failed!") 