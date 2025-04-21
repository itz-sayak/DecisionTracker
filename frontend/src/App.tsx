import { useState, useEffect } from 'react'
import AudioUploader from './components/AudioUploader'
import DecisionInsights from './components/DecisionInsights'
import Header from './components/Header'
import type { InsightsData } from './types'

function App() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')
  const [insights, setInsights] = useState<InsightsData | null>(null)
  
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

  return (
    <div className="min-h-screen pb-8 bg-ios-gray">
      <Header />
      
      <main className="container max-w-3xl px-4 mx-auto mt-6">
        
        {/* Audio Uploader */}
        <AudioUploader 
          status={status} 
          setStatus={setStatus} 
          setInsights={setInsights}
        />
        
        {/* Decision Insights Display */}
        {isInsightsComplete && status === 'completed' && (
          <DecisionInsights insights={insights as InsightsData} />
        )}
        
        {/* Display a message if processing is complete but no insights are displayed */}
        {status === 'completed' && !isInsightsComplete && (
          <div className="ios-card mt-8">
            <h2 className="ios-section-title text-red-500">Error: Incomplete Data</h2>
            <p className="text-gray-700">The insights data is incomplete. Please try processing your file again.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
