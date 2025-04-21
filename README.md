# Decision Tracker - Meeting Insights Application

Decision Tracker is a modular AI application that analyzes meeting audio recordings to extract key decision insights. The application uses LLaMA 70B via the Groq API for analysis and provides a simplistic user interface.

![Decision Tracker App](pic.png)

## Quick Start (Docker)

1. Navigate to the project root directory:
   ```
   cd decision_tracker
   ```

2. Choose one of these methods to run the application:

   **Method 1: Using environment variable**
   ```powershell
   # PowerShell
   $env:GROQ_API_KEY="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"
   docker compose up -d
   ```

   **Method 2: Create a .env file (recommended for repeated use)**
   ```
   # Create a file named .env in the project root with this content:
   GROQ_API_KEY=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

   # Then run:
   docker compose up -d
   ```

3. Access the application:
   - Frontend: http://localhost:80
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

## Features

- **Audio Transcription**: Upload MP3 files and automatically transcribe them using the Whisper model
- **Decision Tracking**: Extract key insights from meeting transcripts, including:
  - Executive Summary
  - Decision Points (with rationale and timelines)
  - Risks/Concerns Raised
  - Action Items (with inferred owners and due dates)
  - Unresolved Questions
- **iOS-style Interface**: Clean, intuitive UI inspired by Apple's design language
- **PDF Export**: Download meeting insights as a well-formatted PDF document
- **Modular Architecture**: Clean separation between frontend, backend, and agent components

## Architecture


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
python -m venv venv
source venv/Scripts/activate  # On Linux/macOS
# or
venv\Scripts\activate.ps1     # On Windows (PowerShell)
# or
venv\Scripts\activate.bat     # On Windows (Command Prompt)

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

## Troubleshooting

### Docker Issues

- **"GROQ_API_KEY variable is not set" Warning**: Make sure to either set the environment variable or create a .env file in the project root as shown in the Quick Start section
- **Port Conflicts**: If ports 80 or 8000 are already in use, modify the port mappings in the docker-compose.yml file
- **Docker Not Found**: Ensure Docker and Docker Compose are installed and in your system PATH

## Future Enhancements

- Multi-user support with authentication
- Recurring task detection and reminder system
- Integration with calendar applications

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
