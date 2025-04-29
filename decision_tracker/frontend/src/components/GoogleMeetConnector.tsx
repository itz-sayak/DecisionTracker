import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleMeetConnectorProps } from '../types';

// Use development API URL when running locally, otherwise use the /api prefix
const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : '/api';

const GoogleMeetConnector: React.FC<GoogleMeetConnectorProps> = ({ 
  setActiveTab, 
  setStatus,
  setInsights 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<number | null>(null);

  // Clean up polling on component unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Start polling for task status when we have a taskId
  useEffect(() => {
    if (taskId) {
      startPolling(taskId);
    }
  }, [taskId]);

  const startPolling = (id: string) => {
    // Clear any existing polling
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    // Set up polling every 3 seconds
    const interval = setInterval(() => {
      checkTaskStatus(id);
    }, 3000);

    setPollInterval(interval);
  };

  const checkTaskStatus = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/task/${id}`);
      const taskStatus = response.data.status;

      // If task is complete, fetch and display insights
      if (taskStatus === 'completed') {
        // Stop polling
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }

        if (response.data.insights && setInsights && setStatus) {
          console.log('Google Meet processing completed with insights:', response.data.insights);
          
          // Set the insights data first
          setInsights(response.data.insights);
          
          // Set the status to completed right away
          setStatus('completed');
          
          // Directly switch to the insights tab
          if (setActiveTab) {
            console.log('Directly setting active tab to insights');
            setActiveTab('insights');
          }
        }
      } else if (taskStatus === 'failed') {
        // Handle failure
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
        }
        setError(`Processing failed: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error checking task status:', err);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setTaskId(null);

    // Validate the meeting link format
    if (!meetingLink.includes('meet.google.com')) {
      setError('Please enter a valid Google Meet link');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/connect-gmeet`, {
        email,
        password,
        meeting_link: meetingLink
      });

      if (response.data.status === 'success') {
        setSuccess(true);
        // Don't reset form after success to make debugging easier
      } else {
        setError('Failed to connect to Google Meet');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(`Error: ${err.response.data.detail || 'Failed to connect to Google Meet'}`);
      } else {
        setError('Unknown error occurred');
      }
      console.error('Error connecting to Google Meet:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-md mx-auto my-8 transition-all duration-300">
      <h2 className="text-2xl font-bold mb-3 text-gray-800">Connect to Google Meet</h2>
      <p className="text-gray-600 mb-6">Enter your Google account credentials and meeting link to join a Google Meet session. Audio will be automatically recorded and saved to the audio folder.</p>
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 animate-fade-in">
          <p className="font-bold">Success!</p>
          <p>Google Meet is opening in a new window. Check your taskbar for the Chrome browser window.</p>
          <p className="mt-2 font-medium">Audio recording has started automatically. The recording will stop and be saved when the meeting ends or when you exit the meeting.</p>
          <p className="mt-2 text-sm font-bold">Important: The recording will be saved to the audio folder. You must manually upload it to process the audio for insights.</p>
        </div>
      )}
      
      {taskId && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 animate-pulse">
          <p className="font-bold">Processing started!</p>
          <p>Your recording is being processed with task ID: {taskId}</p>
          <p className="mt-2 text-sm">Decision insights will appear automatically when processing is complete.</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 animate-fade-in">
          {error}
        </div>
      )}
      
      <form onSubmit={handleConnect} className="transition-all duration-300">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Google Email
          </label>
          <input
            id="email"
            type="email"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white transition-colors duration-200"
            placeholder="yourname@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white transition-colors duration-200"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Your credentials are only used to log into Google Meet and are not stored.
          </p>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="meetingLink">
            Meeting Link
          </label>
          <input
            id="meetingLink"
            type="url"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white transition-colors duration-200"
            placeholder="https://meet.google.com/xxx-xxxx-xxx"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste the full Google Meet link here (e.g., https://meet.google.com/abc-defg-hij)
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Connect & Record Meeting'}
          </button>
        </div>
      </form>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-bold text-gray-700 mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
          <li>Enter your Google account email and password</li>
          <li>Paste the Google Meet link you received</li>
          <li>Click "Connect & Record Meeting"</li>
          <li>A new Chrome window will open and connect to the meeting</li>
          <li>Your camera and microphone will be automatically turned off</li>
          <li>The meeting audio will be recorded automatically</li>
          <li>Recording will stop automatically when the meeting ends or when you leave the meeting</li>
          <li>The recording will be saved to the audio folder</li>
          <li><span className="font-bold">To process the meeting and get insights:</span></li>
          <li className="ml-5">Return to the main page</li>
          <li className="ml-5">Select "Upload Audio File"</li>
          <li className="ml-5">Choose the recording file from the audio folder</li>
          <li className="ml-5">Click "Upload and Process" to analyze the meeting</li>
        </ol>
      </div>
      
      <div className="mt-4 bg-blue-50 p-3 rounded text-blue-800 text-xs">
        <p className="font-bold">About recording:</p>
        <p>The audio recording captures what you hear through your computer's speakers. Make sure your system audio is properly configured to capture the meeting audio.</p>
      </div>
    </div>
  );
};

export default GoogleMeetConnector; 