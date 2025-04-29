import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import WaveSurfer from 'wavesurfer.js';
import type { InsightsData } from '../types';

interface AudioUploaderProps {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  setStatus: React.Dispatch<React.SetStateAction<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>>;
  setInsights: React.Dispatch<React.SetStateAction<InsightsData | null>>;
}

// Use development API URL when running locally, otherwise use the /api prefix
const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : '/api';

const AudioUploader: React.FC<AudioUploaderProps> = ({ 
  status, 
  setStatus,
  setInsights 
}) => {
  // File upload state
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  
  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        window.clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);
  
  // Initialize waveform when file is selected
  useEffect(() => {
    if (status === 'processing' && waveformRef.current && !wavesurferRef.current) {
      const wavesurfer = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#007AFF',
        progressColor: '#0055CC',
        cursorWidth: 0,
        barWidth: 3,
        barGap: 2,
        barRadius: 3,
        height: 60,
      });
      
      // Create animated effect with random audio data
      const audioData = Array.from({ length: 200 }, () => Math.random() * 0.5 + 0.25);
      wavesurferRef.current = wavesurfer;
      
      // Load audio data for visualization
      wavesurfer.load('');
      wavesurfer.setVolume(0);
      
      try {
        // Create an AudioBuffer directly instead of using WaveSurfer.util
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const buffer = audioContext.createBuffer(1, audioData.length, 48000);
        const channelData = buffer.getChannelData(0);
        
        audioData.forEach((val, i) => {
          channelData[i] = val;
        });
        
        // Use WaveSurfer's loadDecodedBuffer method with type assertion
        // @ts-ignore - Using type assertion to bypass TypeScript checking
        if (typeof (wavesurfer as any).loadDecodedBuffer === 'function') {
          // @ts-ignore - Using type assertion to bypass TypeScript checking
          (wavesurfer as any).loadDecodedBuffer(buffer);
        }
      } catch (e) {
        console.error('Error setting audio visualization:', e);
      }
      
      wavesurfer.seekTo(0);
    }
    
    return () => {
      if (wavesurferRef.current && status !== 'processing') {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [status]);
  
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileSelection(file);
    }
  };
  
  const handleFileSelection = (file: File) => {
    // Reset error message
    setErrorMessage(null);
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.mp3')) {
      setErrorMessage('Please upload an MP3 file');
      return;
    }
    
    setSelectedFile(file);
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setStatus('uploading');
    setErrorMessage(null);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      // Upload the audio file
      const response = await axios.post(`${API_URL}/upload-audio`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Get the task ID
      const { task_id } = response.data;
      setStatus('processing');
      
      // Start polling for results
      pollForResults(task_id);
      
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('error');
      setErrorMessage('Failed to upload audio file. Please try again.');
    }
  };
  
  const pollForResults = (taskId: string) => {
    // Poll the API every 3 seconds to check processing status
    const intervalId = window.setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/task/${taskId}`);
        const { status: taskStatus, insights } = response.data;
        
        if (taskStatus === 'completed' && insights) {
          // Task completed successfully
          console.log('Audio processing completed with insights:', insights);
          
          // Set the insights data and update status in one go
          setInsights(insights);
          setStatus('completed');
          
          // Done polling
          window.clearInterval(intervalId);
        } else if (taskStatus === 'failed') {
          // Task failed
          setStatus('error');
          setErrorMessage(response.data.error || 'Processing failed. Please try again.');
          window.clearInterval(intervalId);
        }
        // Otherwise, continue polling
        
      } catch (error) {
        console.error('Polling error:', error);
        setStatus('error');
        setErrorMessage('Failed to check processing status. Please try again.');
        window.clearInterval(intervalId);
      }
    }, 3000);
    
    pollingIntervalRef.current = intervalId;
  };
  
  const resetUploader = () => {
    setStatus('idle');
    setSelectedFile(null);
    setErrorMessage(null);
    setInsights(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="ios-card">
      <h2 className="ios-section-title">Process Meeting Audio</h2>
      
      {status === 'idle' && (
        <>
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? 'border-ios-blue bg-blue-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <svg 
              className="w-12 h-12 mx-auto mb-4 text-gray-400" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
            </svg>
            
            <p className="mb-2 text-sm text-gray-500">
              Drag & drop an MP3 file here, or{' '}
              <button 
                className="text-ios-blue hover:underline"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="text-xs text-gray-400">MP3 format only</p>
            
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              accept=".mp3"
              onChange={handleFileInputChange}
            />
          </div>
          
          {selectedFile && (
            <div className="mt-4">
              <p className="font-medium text-gray-700">
                Selected file: <span className="text-ios-blue">{selectedFile.name}</span>
              </p>
              <p className="text-gray-500 text-sm">
                Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              
              <button
                className="mt-4 w-full py-2 px-4 bg-ios-blue text-white rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={handleUpload}
              >
                Process Audio
              </button>
            </div>
          )}
        </>
      )}
      
      {/* Display status during processing */}
      {status === 'uploading' && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ios-blue mx-auto"></div>
          <p className="mt-4 text-gray-700">
            Uploading your audio file...
          </p>
        </div>
      )}
      
      {status === 'processing' && (
        <div className="p-4">
          <div ref={waveformRef} className="mt-4"></div>
          <p className="text-center mt-4 text-gray-700">
            Analyzing your audio file...
          </p>
          <p className="text-center text-gray-500 text-sm mt-2">
            This may take a few minutes. Please wait.
          </p>
        </div>
      )}
      
      {/* Display error if something goes wrong */}
      {status === 'error' && (
        <div className="text-center py-6">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-red-800">Processing Error</h3>
          <p className="mt-2 text-gray-600">{errorMessage || 'An unexpected error occurred.'}</p>
          <button
            className="mt-6 py-2 px-4 bg-ios-blue text-white rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={resetUploader}
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Display completed status and allow restarting */}
      {status === 'completed' && (
        <div className="text-center py-6">
          <button
            className="py-2 px-4 bg-ios-blue text-white rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={resetUploader}
          >
            Process Another Meeting
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioUploader; 