import os
import json
from agents.decision_tracker_agent import DecisionTrackerAgent

# Path to the audio file
audio_file = os.path.join('uploads', 'meeting_audio.mp3')

print(f'Testing with audio file: {audio_file}')

try:
    # Initialize the agent
    agent = DecisionTrackerAgent()
    
    # Process the audio file
    print('Transcribing audio...')
    transcript = agent.transcribe_audio(audio_file)
    print(f'Transcript length: {len(transcript)}')
    
    # Analyze the transcript
    print('Analyzing transcript...')
    insights = agent.analyze_transcript(transcript)
    
    # Print the insights
    print('Insights:')
    print(json.dumps(insights, indent=2))
except Exception as e:
    print(f'Error: {e}')
