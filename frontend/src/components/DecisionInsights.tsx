import React from 'react';
import { jsPDF } from 'jspdf';
// Define module for file-saver
import type { InsightsData } from '../types';

// Add module declaration
declare module 'file-saver';

interface DecisionInsightsProps {
  insights: InsightsData;
}

const DecisionInsights: React.FC<DecisionInsightsProps> = ({ insights }) => {
  const {
    executiveSummary = '',
    decisionPoints = [],
    risksConcernsRaised = [],
    actionItems = [],
    unresolvedQuestions = []
  } = insights || {};
  
  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    
    // Add title
    doc.setFontSize(22);
    doc.setTextColor(0, 122, 255); // iOS blue
    doc.text('Meeting Decision Insights', 105, yPos, { align: 'center' });
    yPos += 15;
    
    // Executive Summary
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Executive Summary', 20, yPos);
    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    
    // Split text to fit page width
    const splitSummary = doc.splitTextToSize(executiveSummary, 170);
    doc.text(splitSummary, 20, yPos);
    yPos += splitSummary.length * 7 + 10;
    
    // Decision Points
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Decision Points', 20, yPos);
    yPos += 10;
    doc.setFontSize(12);
    
    decisionPoints.forEach((decision, index) => {
      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setTextColor(0, 0, 0);
      doc.text(`${index + 1}. ${decision.decision}`, 20, yPos);
      yPos += 7;
      
      if (decision.timeline) {
        doc.setTextColor(100, 100, 100);
        doc.text(`   Timeline: ${decision.timeline}`, 20, yPos);
        yPos += 7;
      }
      
      if (decision.rationale) {
        doc.setTextColor(100, 100, 100);
        const splitRationale = doc.splitTextToSize(`   Rationale: ${decision.rationale}`, 165);
        doc.text(splitRationale, 20, yPos);
        yPos += splitRationale.length * 7;
      }
      
      yPos += 5;
    });
    
    // Add remaining sections similarly with page breaks as needed
    // Risks/Concerns
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Risks & Concerns', 20, yPos);
    yPos += 10;
    doc.setFontSize(12);
    
    risksConcernsRaised.forEach((risk, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setTextColor(0, 0, 0);
      const splitRisk = doc.splitTextToSize(`${index + 1}. ${risk.description}`, 165);
      doc.text(splitRisk, 20, yPos);
      yPos += splitRisk.length * 7 + 5;
    });
    
    // Action Items
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Action Items', 20, yPos);
    yPos += 10;
    doc.setFontSize(12);
    
    actionItems.forEach((action, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setTextColor(0, 0, 0);
      doc.text(`${index + 1}. ${action.task}`, 20, yPos);
      yPos += 7;
      
      doc.setTextColor(100, 100, 100);
      doc.text(`   Assignee: ${action.assignee}`, 20, yPos);
      yPos += 7;
      
      if (action.dueDate) {
        doc.text(`   Due: ${action.dueDate}`, 20, yPos);
        yPos += 7;
      }
      
      yPos += 3;
    });
    
    // Unresolved Questions
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Unresolved Questions', 20, yPos);
    yPos += 10;
    doc.setFontSize(12);
    
    unresolvedQuestions.forEach((question, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setTextColor(0, 0, 0);
      const splitQuestion = doc.splitTextToSize(`${index + 1}. ${question.question}`, 165);
      doc.text(splitQuestion, 20, yPos);
      yPos += splitQuestion.length * 7 + 5;
    });
    
    // Add footer with date
    const today = new Date();
    const dateStr = today.toLocaleDateString();
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${dateStr}`, 105, 285, { align: 'center' });
    
    // Save the PDF
    doc.save('meeting-insights.pdf');
  };
  
  return (
    <div className="mt-8">
      {/* Executive Summary */}
      <div className="ios-card">
        <h2 className="ios-section-title">Executive Summary</h2>
        <p className="text-gray-700">{executiveSummary}</p>
      </div>
      
      {/* Decision Points */}
      <div className="ios-card">
        <h2 className="ios-section-title">Decision Points</h2>
        {decisionPoints.length > 0 ? (
          <ul className="space-y-4">
            {decisionPoints.map((decision, index) => (
              <li key={index} className="pb-3 border-b border-gray-100 last:border-0">
                <p className="font-medium text-gray-800">{decision.decision}</p>
                {decision.timeline && (
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium">Timeline:</span> {decision.timeline}
                  </p>
                )}
                {decision.rationale && (
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium">Rationale:</span> {decision.rationale}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No decision points identified.</p>
        )}
      </div>
      
      {/* Risks & Concerns */}
      <div className="ios-card">
        <h2 className="ios-section-title">Risks & Concerns</h2>
        {risksConcernsRaised.length > 0 ? (
          <ul className="ml-5 space-y-2 list-disc">
            {risksConcernsRaised.map((risk, index) => (
              <li key={index} className="text-gray-700">
                {risk.description}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No risks or concerns identified.</p>
        )}
      </div>
      
      {/* Action Items */}
      <div className="ios-card">
        <h2 className="ios-section-title">Action Items</h2>
        {actionItems.length > 0 ? (
          <ul className="space-y-4">
            {actionItems.map((action, index) => (
              <li key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start">
                  <div className="flex items-center justify-center flex-shrink-0 w-6 h-6 text-white bg-ios-blue rounded-full">
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-800">{action.task}</p>
                    <div className="flex flex-wrap mt-1 text-sm gap-x-4">
                      <span className="text-gray-600">
                        <span className="font-medium">Assignee:</span> {action.assignee}
                      </span>
                      {action.dueDate && (
                        <span className="text-gray-600">
                          <span className="font-medium">Due:</span> {action.dueDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No action items identified.</p>
        )}
      </div>
      
      {/* Unresolved Questions */}
      <div className="ios-card">
        <h2 className="ios-section-title">Unresolved Questions</h2>
        {unresolvedQuestions.length > 0 ? (
          <ul className="ml-5 space-y-2 list-disc">
            {unresolvedQuestions.map((question, index) => (
              <li key={index} className="text-gray-700">
                {question.question}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No unresolved questions identified.</p>
        )}
      </div>
      
      {/* Export button */}
      <div className="flex justify-center mt-6">
        <button 
          className="flex items-center ios-button bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md"
          onClick={exportToPDF}
        >
          <svg 
            className="w-5 h-5 mr-2" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm6.905 9.97a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72V18a.75.75 0 001.5 0v-4.19l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" />
            <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
          </svg>
          DOWNLOAD PDF
        </button>
      </div>
    </div>
  );
};

export default DecisionInsights; 