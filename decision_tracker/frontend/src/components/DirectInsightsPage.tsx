import React from 'react';
import { InsightsData } from '../types';
import DecisionInsights from './DecisionInsights';

interface DirectInsightsPageProps {
  insights: InsightsData;
}

/**
 * A simple wrapper component that displays just the insights without any navigation
 * Used for opening insights in a popup window
 */
const DirectInsightsPage: React.FC<DirectInsightsPageProps> = ({ insights }) => {
  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Meeting Decision Insights</h1>
          <div className="flex space-x-4">
            <button 
              onClick={() => window.print()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button 
              onClick={() => window.close()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
        </header>
        
        <main>
          <DecisionInsights insights={insights} />
        </main>
        
        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>Generated on {new Date().toLocaleDateString()}</p>
        </footer>
      </div>
    </div>
  );
};

export default DirectInsightsPage; 