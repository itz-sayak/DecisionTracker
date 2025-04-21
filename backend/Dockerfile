FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and FFmpeg with full codec support
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    xz-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install FFmpeg from the official release (v6.0)
RUN wget -q https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz \
    && mkdir -p /opt/ffmpeg \
    && tar xvf ffmpeg-release-amd64-static.tar.xz -C /opt/ffmpeg --strip-components=1 \
    && ln -s /opt/ffmpeg/ffmpeg /usr/local/bin/ffmpeg \
    && ln -s /opt/ffmpeg/ffprobe /usr/local/bin/ffprobe \
    && rm ffmpeg-release-amd64-static.tar.xz

# Verify FFmpeg installation
RUN ffmpeg -version

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Create and activate virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create directory for uploads
RUN mkdir -p uploads

# Expose the port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"] 