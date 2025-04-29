import os
import json
from agents.decision_tracker_agent import DecisionTrackerAgent

# Path to the audio file
audio_file = os.path.join("uploads", "meeting_audio.mp3")

# Check if the file exists
if not os.path.exists(audio_file):
    print(f"Error: File {audio_file} not found!")
    exit(1)

print(f"Testing with audio file: {audio_file}")
print(f"File size: {os.path.getsize(audio_file) / (1024 * 1024):.2f} MB")

try:
    # Initialize the agent
    print("Initializing agent...")
    agent = DecisionTrackerAgent()
    
    # Process the audio file
    print("\nTranscribing audio...")
    transcript = agent.transcribe_audio(audio_file)
    print(f"Transcript length: {len(transcript)} characters")
    print(f"Transcript excerpt: {transcript[:100]}...")
    
    # Analyze the transcript
    print("\nAnalyzing transcript...")
    insights = agent.analyze_transcript(transcript)
    
    # Check if the insights contain all required fields
    required_fields = ["executiveSummary", "decisionPoints", "risksConcernsRaised", "actionItems", "unresolvedQuestions"]
    missing_fields = [field for field in required_fields if field not in insights]
    
    if missing_fields:
        print(f"\nWarning: Missing fields in insights: {missing_fields}")
    else:
        print("\nAll required fields are present in the insights!")
    
    # Print the insights
    print("\nInsights:")
    print(json.dumps(insights, indent=2))
    
    # Save the insights to a file
    with open("test_insights.json", "w") as f:
        json.dump(insights, f, indent=2)
    print("\nInsights saved to test_insights.json")
    
except Exception as e:
    print(f"\nError: {str(e)}") 