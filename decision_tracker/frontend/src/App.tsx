import { useState, useEffect } from 'react'
import AudioUploader from './components/AudioUploader'
import DecisionInsights from './components/DecisionInsights'
import Header from './components/Header'
import GoogleMeetConnector from './components/GoogleMeetConnector'
import type { InsightsData } from './types'

// Feature flags for behavior control
const FEATURES = {
  FORCE_INSIGHTS_TAB: true, // Always try to show insights when available
  DEBUG_MODE: import.meta.env.DEV, // Only enable debug features in development
  AUTO_SWITCH_DELAY_MS: 500, // Delay before auto-switching to insights tab
  POLLING_INTERVAL_MS: 3000 // How often to check for task updates
};

function App() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [activeTab, setActiveTab] = useState<'audio' | 'gmeet' | 'insights'>('audio')
  const [showNotification, setShowNotification] = useState(false)
  
  /* 
  // For testing - set some sample data - COMMENTED OUT to start with normal upload screen
  useEffect(() => {
    // Sample insights for testing
    const sampleInsights: InsightsData = {
      executiveSummary: "In this meeting, the team discussed the Q3 roadmap, budget allocation, and timeline for the new product launch.",
      decisionPoints: [
        {
          decision: "Launch new product by September 30th",
          timeline: "Q3 2025",
          rationale: "To capture market share before holiday season"
        },
        {
          decision: "Allocate additional $50,000 for marketing",
          timeline: "Immediately",
          rationale: "To support the product launch"
        }
      ],
      risksConcernsRaised: [
        {
          description: "Supply chain constraints might delay manufacturing",
          severity: "Medium",
          mitigation: "Start procurement process early"
        }
      ],
      actionItems: [
        {
          task: "Finalize product specifications",
          assignee: "Engineering Team",
          dueDate: "July 15, 2025"
        },
        {
          task: "Prepare marketing materials",
          assignee: "Marketing Team",
          dueDate: "August 1, 2025"
        }
      ],
      unresolvedQuestions: [
        {
          question: "Should we include the premium feature in the initial release?",
          context: "It would increase development time but could justify a higher price point"
        }
      ]
    };
    
    // Enable sample data for testing
    setInsights(sampleInsights);
    setStatus('completed');
  }, []);
  */

  // Check if insights object is complete with all required fields
  const isInsightsComplete = insights && 
    typeof insights === 'object' && 
    'executiveSummary' in insights &&
    'decisionPoints' in insights &&
    'risksConcernsRaised' in insights &&
    'actionItems' in insights &&
    'unresolvedQuestions' in insights;

  // Automatically switch to insights tab when processing is complete
  useEffect(() => {
    if (status === 'completed' && isInsightsComplete && FEATURES.FORCE_INSIGHTS_TAB) {
      console.log('Status completed and insights are complete - switching to insights tab');
      // Add a delay to ensure all state updates have been processed
      setTimeout(() => {
        setActiveTab('insights');
        console.log('Tab should now be set to insights');
      }, FEATURES.AUTO_SWITCH_DELAY_MS);
    } else if (status === 'completed') {
      console.log('Status is completed but insights might be incomplete:', insights);
    }
  }, [status, isInsightsComplete, insights]);

  // Log state changes for debugging
  useEffect(() => {
    console.log('Current state:', { status, activeTab, hasInsights: !!insights, isInsightsComplete });
  }, [status, activeTab, insights, isInsightsComplete]);

  // Function to load sample test data for debugging
  const loadTestInsights = () => {
    console.log('Loading test insights data');
    const sampleInsights: InsightsData = {
      executiveSummary: "In this meeting, the team discussed the Q3 roadmap, budget allocation, and timeline for the new product launch.",
      decisionPoints: [
        {
          decision: "Launch new product by September 30th",
          timeline: "Q3 2025",
          rationale: "To capture market share before holiday season"
        },
        {
          decision: "Allocate additional $50,000 for marketing",
          timeline: "Immediately",
          rationale: "To support the product launch"
        }
      ],
      risksConcernsRaised: [
        {
          description: "Supply chain constraints might delay manufacturing",
          severity: "Medium",
          mitigation: "Start procurement process early"
        }
      ],
      actionItems: [
        {
          task: "Finalize product specifications",
          assignee: "Engineering Team",
          dueDate: "July 15, 2025"
        },
        {
          task: "Prepare marketing materials",
          assignee: "Marketing Team",
          dueDate: "August 1, 2025"
        }
      ],
      unresolvedQuestions: [
        {
          question: "Should we include the premium feature in the initial release?",
          context: "It would increase development time but could justify a higher price point"
        }
      ]
    };
    
    // Set insights and status
    setInsights(sampleInsights);
    setStatus('completed');
    
    // Force tab change after a delay to ensure state is updated
    setTimeout(() => {
      setActiveTab('insights');
      console.log('Switched to insights tab with test data');
    }, 300);
  };

  // Expose state to window for debugging
  useEffect(() => {
    if (FEATURES.DEBUG_MODE) {
      (window as any).appDebug = {
        getState: () => ({ 
          status, 
          activeTab, 
          hasInsights: !!insights, 
          isInsightsComplete,
          insights,
          features: FEATURES
        }),
        showInsights: () => {
          if (isInsightsComplete) {
            setActiveTab('insights');
            return 'Switching to insights tab';
          } else {
            return 'No valid insights data available';
          }
        },
        loadTestData: loadTestInsights,
        features: FEATURES,
        forceInsightsTab: (force: boolean) => {
          FEATURES.FORCE_INSIGHTS_TAB = force;
          return `Auto-navigation to insights tab is now ${force ? 'enabled' : 'disabled'}`;
        }
      };
      console.log('App debug functions available. Type appDebug.getState() in console to check current state');
    }
  }, [status, activeTab, insights, isInsightsComplete, loadTestInsights]);

  // Show notification when insights are ready but tab hasn't switched
  useEffect(() => {
    if (status === 'completed' && isInsightsComplete && activeTab !== 'insights') {
      setShowNotification(true);
      // Auto-hide notification after 7 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 7000);
      return () => clearTimeout(timer);
    } else {
      setShowNotification(false);
    }
  }, [status, isInsightsComplete, activeTab]);

  return (
    <div className="min-h-screen pb-8 bg-white">
      <Header />
      
      <main className="container max-w-3xl px-4 mx-auto mt-6">
        
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex">
            <button
              className={`py-2 px-4 font-medium text-sm ${activeTab === 'audio' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'} transition-all duration-200`}
              onClick={() => setActiveTab('audio')}
            >
              Upload Audio
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm ${activeTab === 'gmeet' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'} transition-all duration-200`}
              onClick={() => setActiveTab('gmeet')}
            >
              Google Meet
            </button>
            {isInsightsComplete && (
              <button
                className={`py-2 px-4 font-medium text-sm ${activeTab === 'insights' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'} transition-all duration-200`}
                onClick={() => setActiveTab('insights')}
              >
                Decision Insights
              </button>
            )}
            
            {/* Hidden test button - only visible in development */}
            {import.meta.env.DEV && (
              <button
                className="py-2 px-4 ml-auto font-medium text-xs text-gray-400 hover:text-gray-600"
                onClick={loadTestInsights}
                title="Load test insights data (Development only)"
              >
                Test Mode
              </button>
            )}
          </div>
        </div>
        
        {/* Content based on selected tab */}
        {activeTab === 'audio' && (
          <AudioUploader 
            status={status} 
            setStatus={setStatus} 
            setInsights={setInsights}
          />
        )}
        
        {activeTab === 'gmeet' && (
          <GoogleMeetConnector 
            setActiveTab={setActiveTab}
            setStatus={setStatus}
            setInsights={setInsights}
          />
        )}
        
        {/* Decision Insights Display */}
        {activeTab === 'insights' && isInsightsComplete && (
          <div className="animate-scale-in">
            <DecisionInsights insights={insights as InsightsData} />
          </div>
        )}
        
        {/* Display a message if processing is complete but no insights are displayed */}
        {status === 'completed' && !isInsightsComplete && (
          <div className="ios-card mt-8 animate-fade-in">
            <h2 className="ios-section-title text-red-500">Error: Incomplete Data</h2>
            <p className="text-gray-700">The insights data is incomplete. Please try processing your file again.</p>
          </div>
        )}
        
        {/* Force display insights if available but tab isn't switched */}
        {isInsightsComplete && activeTab !== 'insights' && status === 'completed' && (
          <div className="mt-8 text-center">
            <p className="text-gray-700 mb-4">Your insights are ready!</p>
            <button 
              onClick={() => setActiveTab('insights')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none"
            >
              View Decision Insights
            </button>
          </div>
        )}
      </main>
      
      {/* Floating action button for insights when available but not shown */}
      {isInsightsComplete && activeTab !== 'insights' && (
        <div className="fixed bottom-6 right-6 z-50">
          <button 
            onClick={() => setActiveTab('insights')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center"
            title="View your insights"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            View Insights
          </button>
        </div>
      )}
      
      {/* Notification toast for insights */}
      {showNotification && (
        <div className="fixed top-6 right-6 z-50 bg-white border border-green-500 rounded-lg shadow-xl p-4 animate-bounce-gentle">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-lg p-2">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Insights Ready!</p>
              <p className="text-sm text-gray-500">Your decision insights are now available</p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="bg-green-100 rounded-md inline-flex text-green-600 hover:text-green-800 px-3 py-1 text-sm"
                onClick={() => setActiveTab('insights')}
              >
                View Now
              </button>
              <button
                className="ml-1 bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500"
                onClick={() => setShowNotification(false)}
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
