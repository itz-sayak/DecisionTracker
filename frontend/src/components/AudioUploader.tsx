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
    // Poll every 3 seconds
    const intervalId = window.setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/task/${taskId}`);
        const { status: taskStatus, insights } = response.data;
        
        if (taskStatus === 'completed') {
          // Success! We have insights
          setStatus('completed');
          setInsights(insights);
          clearInterval(intervalId);
        } else if (taskStatus === 'failed') {
          // Something went wrong
          setStatus('error');
          setErrorMessage('Processing failed. Please try again.');
          clearInterval(intervalId);
        }
        // Continue polling if status is still 'processing'
        
      } catch (error) {
        console.error('Polling error:', error);
        setStatus('error');
        setErrorMessage('Failed to retrieve results. Please try again.');
        clearInterval(intervalId);
      }
    }, 3000);
    
    pollingIntervalRef.current = intervalId;
  };
  
  const resetUploader = () => {
    setSelectedFile(null);
    setStatus('idle');
    setErrorMessage(null);
    setInsights(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="ios-card">
      <h2 className="ios-section-title">Upload Meeting Audio</h2>
      
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
              <div className="flex items-center justify-between p-3 bg-ios-gray rounded-lg">
                <div className="flex items-center">
                  <svg 
                    className="w-6 h-6 mr-2 text-ios-blue" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                  >
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                  </svg>
                  <span className="font-medium truncate">{selectedFile.name}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                <button
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg"
                  onClick={resetUploader}
                >
                  Cancel
                </button>
                <button
                  className="ios-button"
                  onClick={handleUpload}
                >
                  Process Audio
                </button>
              </div>
            </div>
          )}
        </>
      )}
      
      {status === 'uploading' && (
        <div className="py-8 text-center">
          <div className="inline-block w-16 h-16 border-4 border-t-ios-blue border-gray-200 rounded-full animate-spin"></div>
          <p className="mt-4 text-lg font-medium">Uploading audio...</p>
        </div>
      )}
      
      {status === 'processing' && (
        <div className="py-8 text-center">
          <div className="mb-6" ref={waveformRef}></div>
          <p className="text-lg font-medium">Analyzing meeting audio...</p>
          <p className="mt-2 text-sm text-gray-500">
            Transcribing and extracting decision insights
          </p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="py-8 text-center">
          <svg 
            className="w-16 h-16 mx-auto mb-4 text-red-500" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
          </svg>
          <p className="mt-4 text-lg font-medium text-red-600">
            {errorMessage || 'An error occurred'}
          </p>
          <button
            className="px-6 py-2 mt-4 text-white bg-red-500 rounded-lg"
            onClick={resetUploader}
          >
            Try Again
          </button>
        </div>
      )}
      
      {status === 'completed' && (
        <div className="py-4 text-center">
          <svg 
            className="w-16 h-16 mx-auto mb-4 text-green-500" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
          <p className="mt-4 text-lg font-medium text-green-600">
            Analysis completed!
          </p>
          <button
            className="ios-button mt-4"
            onClick={resetUploader}
          >
            Process Another File
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioUploader; 