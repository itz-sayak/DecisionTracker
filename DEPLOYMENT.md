# Decision Tracker Deployment Guide

This document provides instructions for deploying and running the Decision Tracker application.

## Docker Deployment

### Prerequisites

- Docker and Docker Compose installed
- Groq API key

### Deployment Steps

1. Navigate to the project root directory:
   ```
   cd decision_tracker
   ```

2. Set the Groq API key as an environment variable:
   ```powershell
   # PowerShell
   $env:GROQ_API_KEY="your_groq_api_key_here"
   ```

3. Deploy the application:
   ```
   docker compose up -d
   ```

4. Access the application:
   - Frontend: http://localhost:80
   - Backend API: http://localhost:8000

5. To stop the application:
   ```
   docker compose down
   ```

## Alternative: Create a .env File

For convenience, you can create a `.env` file in the project root directory:

1. Create a file named `.env` in the project root with this content:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

2. Then run:
   ```
   docker compose up -d
   ```

## Usage

1. Upload an MP3 file of a meeting recording
2. Wait for the system to process it
3. View the extracted decision insights
4. Download a PDF of the insights by clicking the "DOWNLOAD PDF" button at the bottom of the insights view

## Troubleshooting

- **Docker Not Found**: Add Docker to your PATH
  ```powershell
  # PowerShell example
  $env:Path += ";D:\Docker\resources\bin"
  ```

- **Port Conflicts**: If ports 80 or 8000 are already in use, modify the port mappings in the docker-compose.yml file

- **API Key Issues**: Ensure the GROQ_API_KEY environment variable is correctly set

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| GROQ_API_KEY | API key for Groq LLM service | (Required) |
| HOST | Backend host address | 0.0.0.0 |
| PORT | Backend port | 8000 |

## Maintenance

- **View Logs**:
  ```
  docker logs decision-tracker-backend
  docker logs decision-tracker-frontend
  ```

- **Restart Containers**:
  ```
  docker restart decision-tracker-backend
  docker restart decision-tracker-frontend
  ```

- **Update Application**:
  ```
  git pull
  docker compose down
  docker compose up -d --build
  ```

## Production Considerations

For a production deployment, consider:

1. Using a reverse proxy (e.g., Nginx, Traefik) for SSL termination
2. Setting up proper authentication
3. Implementing monitoring and logging solutions
4. Configuring automatic backups of uploaded data
5. Setting resource limits for containers 