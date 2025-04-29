# Decision Tracker - Meeting Insights Application

Decision Tracker is a modular AI application that analyzes meeting audio recordings to extract key decision insights. The application uses LLaMA 70B via the Groq API for analysis and provides a stylish iOS-inspired user interface.

![Decision Tracker App](app-preview.png)

## Key Features at a Glance

- **Upload Audio Files**: Easily upload MP3 recordings of your meetings
- **Google Meet Integration**: Simply connect to Google Meet with a meeting URL or code, record the audio, and save it to the audio folder
- **Automatic Insights**: Extract key decisions, action items, and more from your meetings by manually uploading saved audio files
- **Modern UI**: Clean, intuitive interface inspired by iOS design
- **Popup Window Support**: Open insights in a dedicated popup window for better focus and printing capabilities

## Quick Start (Docker)

1. Navigate to the project root directory:
   ```
   cd decision_tracker
   ```

2. Choose one of these methods to run the application:

   **Method 1: Using environment variable**
   ```powershell
   # PowerShell
   $env:GROQ_API_KEY="enter_groq_api_key"
   docker compose up -d
   ```

   **Method 2: Create a .env file (recommended for repeated use)**
   ```
   # Create a file named .env in the project root with this content:
   GROQ_API_KEY=enter_groq_api_key

   # Then run:
   docker compose up -d
   ```

3. Access the application:
   - Frontend: http://localhost:5137
   - Backend API: http://localhost:8000

4. To stop the application:
   ```
   docker compose down
   ```

## System Requirements

### FFmpeg Requirement

**Important**: This application requires FFmpeg for audio transcription using the Whisper model.

- **Docker Setup**: If you use the Docker setup, FFmpeg is included in the container and no additional setup is required.
- **Development Setup**: For local development, the application includes a setup script that automatically extracts and configures FFmpeg from the included zip files.
- **Manual FFmpeg Setup**: If you prefer to use your system's FFmpeg installation:
  1. Make sure FFmpeg is installed on your system
  2. Ensure FFmpeg is in your system PATH
  3. You can then modify the backend/app.py file to remove the setup_ffmpeg.py dependency

You can verify your FFmpeg installation by running:
```
ffmpeg -version
```

## Detailed Features

- **Audio Transcription**: Upload MP3 files and automatically transcribe them using the Whisper model
- **Google Meet Integration**: Join Google Meet sessions via URL or meeting code and record audio (saved to the audio folder for later manual processing)
- **Decision Tracking**: Extract key insights from meeting transcripts, including:
  - Executive Summary
  - Decision Points (with rationale and timelines)
  - Risks/Concerns Raised
  - Action Items (with inferred owners and due dates)
  - Unresolved Questions
- **Minimalistic style Interface**: Clean, intuitive UI 
- **PDF Export**: Download meeting insights as a well-formatted PDF document
- **Popup Window**: View and print insights in a dedicated window independent of the main application
- **Modular Architecture**: Clean separation between frontend, backend, and agent components

## Architecture

![Architecture Diagram](docs/architecture.png)

### Components

- **Frontend**: React application with Tailwind CSS for styling
- **Backend**: FastAPI server that handles file uploads and API requests
- **Agent System**: 
  - `DecisionTrackerAgent` - Orchestrates transcription and analysis
  - Uses Whisper model for audio transcription
  - Utilizes LLaMA 70B via Groq API for extracting decision insights

## Setup

### Prerequisites

- Docker and Docker Compose
- Groq API Key ([Get one here](https://console.groq.com/))
- For Google Meet integration:
  - Chrome browser installed
  - System with audio capabilities
  - Python packages: selenium, webdriver-manager, pyaudio, pydub

### Configuration

1. Clone the repository
2. Create a `.env` file in the `backend` directory based on `.env.example`:

```
GROQ_API_KEY=your_groq_api_key_here
```

### Development Environment

If you want to run the application in development mode:

#### Backend

```bash
cd decision_tracker/backend

# On Windows
start_server.bat

# On Linux/macOS
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload
```

#### Frontend

```bash
cd decision_tracker/frontend
npm install
npm run dev
```

The development servers will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

## Using Google Meet Integration

The application can connect to Google Meet sessions and record audio for later manual processing:

1. Start the application and navigate to the main page
2. Select the "Google Meet Link" option in the audio processing section
3. Enter either:
   - The full Google Meet URL (e.g., https://meet.google.com/abc-defg-hij)
   - Just the meeting code (e.g., abc-defg-hij)
4. Click "Join and Record Meeting"
5. The application will:
   - Launch a Chrome browser session
   - Join the meeting
   - Record audio for the duration of the meeting
   - Save the recording to the `audio` folder
6. **Important**: The recording will NOT be automatically processed
7. To analyze the meeting, you must manually upload the saved audio file:
   - Go to the main page
   - Select "Upload Audio File"
   - Choose the recorded meeting file from the audio folder
   - Click "Upload and Process"
   - Wait for processing to complete to view insights

### Google Meet Integration Requirements

- Chrome browser must be installed on the server
- System must have working audio capture capabilities
- For best results, the system should be in a quiet environment
- Note that this feature requires the following Python packages:
  - selenium
  - webdriver-manager
  - pyaudio
  - pydub

### Limitations

- The current implementation joins as a guest without authentication
- For meetings requiring authentication, manual intervention may be needed
- Audio quality depends on system microphone and speakers
- Background noise may affect transcription quality
- The Google Meet recording is saved to the audio folder but must be manually uploaded for processing

## API Documentation

The backend API is documented using Swagger UI, available at:

```
http://localhost:8000/docs
```

## Agent Design

The `DecisionTrackerAgent` is designed with a modular architecture:

1. **Initialization**:
   - Loads environment variables
   - Sets up Groq client
   - Initializes Whisper model

2. **Audio Transcription**:
   - Transcribes MP3 audio using Whisper model
   - Returns text transcript

3. **Transcript Analysis**:
   - Sends transcript to LLaMA 70B via Groq API
   - Uses specialized system prompts for decision extraction
   - Returns structured insights in JSON format

4. **Insight Extraction**:
   - Processes LLM output into structured insights
   - Formats data for frontend consumption

## LLM Prompt Design

The system prompt for LLaMA 70B is designed to extract specific decision-related insights from meeting transcripts. The prompt instructs the model to analyze the text and identify:

- Key decisions made during the meeting
- Associated timelines and rationales
- Risks or concerns raised
- Action items with assignees and due dates
- Unresolved questions for follow-up

## Using the Popup Insights Feature

The application now supports opening decision insights in a dedicated popup window:

1. After processing your meeting audio and generating insights, you can open them in a separate window
2. This provides a cleaner, focused view of the insights without the main application UI
3. The popup window includes:
   - A print button to quickly print the insights
   - A close button to dismiss the window
4. For developers, you can use this functionality programmatically:
   ```javascript
   import { openInsightsPopup } from 'decision-tracker';
   
   // Open insights in a popup window
   const closePopup = openInsightsPopup(insightsData);
   
   // Later, if needed:
   closePopup(); // Close the popup window programmatically
   ```

5. The popup window displays the insights using the `DirectInsightsPage` component, which provides:
   - A clean, print-friendly layout
   - Automatic date generation showing when the insights were viewed
   - All the same detailed insights as the main application view

## Troubleshooting

### Docker Issues

- **"GROQ_API_KEY variable is not set" Warning**: Make sure to either set the environment variable or create a .env file in the project root as shown in the Quick Start section
- **Port Conflicts**: If ports 80 or 8000 are already in use, modify the port mappings in the docker-compose.yml file
- **Docker Not Found**: Ensure Docker and Docker Compose are installed and in your system PATH

### Google Meet Integration Issues

- **Chrome Browser Not Found**: Ensure Chrome is installed and can be detected by Selenium
- **Audio Capture Issues**: Check system audio permissions and ensure microphone is working
- **Meeting Access Issues**: Verify the Google Meet link is correct and accessible without authentication
- **Package Installation Errors**: Install missing dependencies using `pip install selenium webdriver-manager pyaudio pydub`

## Future Enhancements

- Vector DB integration (FAISS or ChromaDB) for long-term memory
- Multi-user support with authentication
- Recurring task detection and reminder system
- Integration with calendar applications
- Support for additional audio formats
- Enhanced Google Meet integration with authentication support
- Support for other video conferencing platforms (Zoom, Microsoft Teams)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 