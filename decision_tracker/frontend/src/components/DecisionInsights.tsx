import React, { useRef } from 'react';
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
  
  const contentRef = useRef<HTMLDivElement>(null);
  
  const exportToPDF = () => {
    // Visual feedback for PDF generation
    const downloadButton = document.getElementById('downloadPdfButton');
    if (downloadButton) {
      downloadButton.classList.add('animate-pulse-gentle');
      downloadButton.textContent = 'GENERATING PDF...';
    }
    
    // Short delay to show animation
    setTimeout(() => {
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
      
      // Reset button
      if (downloadButton) {
        downloadButton.classList.remove('animate-pulse-gentle');
        downloadButton.textContent = 'DOWNLOAD PDF';
      }
    }, 800);
  };
  
  const openInNewWindow = () => {
    // Create a new window
    const newWindow = window.open('', '_blank', 'width=800,height=800');
    
    if (!newWindow) {
      alert('Pop-up blocked! Please allow pop-ups for this site to open insights in a new window.');
      return;
    }
    
    // Clone the current styles
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          // Skip stylesheets from other domains due to CORS
          return '';
        }
      })
      .filter(Boolean)
      .join('\n');

    // Get the content to display
    const content = contentRef.current?.innerHTML || '';
    
    // Write content to the new window
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Meeting Decision Insights</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${styles}</style>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
              background-color: #f5f5f7;
            }
            .print-button {
              background-color: #007AFF;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: bold;
              margin-top: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            .print-button:hover {
              background-color: #0062cc;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #1d1d1f;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">Meeting Decision Insights</h1>
            <button class="print-button" onclick="window.print()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 19H18V22H6V19Z" fill="currentColor"/>
                <path d="M18 13H6V16H18V13Z" fill="currentColor"/>
                <path d="M18 5V2H6V5H4V13C4 14.1 4.9 15 6 15H18C19.1 15 20 14.1 20 13V5H18ZM8 4H16V5H8V4ZM17 12H7V11H17V12Z" fill="currentColor"/>
              </svg>
              Print Insights
            </button>
          </div>
          <div id="content">${content}</div>
          <div style="text-align: center; margin-top: 30px;">
            <button class="print-button" onclick="window.print()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 19H18V22H6V19Z" fill="currentColor"/>
                <path d="M18 13H6V16H18V13Z" fill="currentColor"/>
                <path d="M18 5V2H6V5H4V13C4 14.1 4.9 15 6 15H18C19.1 15 20 14.1 20 13V5H18ZM8 4H16V5H8V4ZM17 12H7V11H17V12Z" fill="currentColor"/>
              </svg>
              Print Insights
            </button>
          </div>
        </body>
      </html>
    `);
    
    newWindow.document.close();
  };
  
  return (
    <div className="mt-8" ref={contentRef}>
      {/* Executive Summary */}
      <div className="ios-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="ios-section-title">Executive Summary</h2>
        <p className="text-gray-700">{executiveSummary}</p>
      </div>
      
      {/* Decision Points */}
      <div className="ios-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="ios-section-title">Decision Points</h2>
        {decisionPoints.length > 0 ? (
          <ul className="space-y-4">
            {decisionPoints.map((decision, index) => (
              <li key={index} className="pb-3 border-b border-gray-100 last:border-0 animate-fade-in" style={{ animationDelay: `${0.1 + (index * 0.1)}s` }}>
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
      <div className="ios-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <h2 className="ios-section-title">Risks & Concerns</h2>
        {risksConcernsRaised.length > 0 ? (
          <ul className="ml-5 space-y-2 list-disc">
            {risksConcernsRaised.map((risk, index) => (
              <li key={index} className="text-gray-700 animate-fade-in" style={{ animationDelay: `${0.3 + (index * 0.1)}s` }}>
                {risk.description}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No risks or concerns identified.</p>
        )}
      </div>
      
      {/* Action Items */}
      <div className="ios-card animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <h2 className="ios-section-title">Action Items</h2>
        {actionItems.length > 0 ? (
          <ul className="space-y-4">
            {actionItems.map((action, index) => (
              <li key={index} className="p-3 bg-gray-50 rounded-lg animate-scale-in" style={{ animationDelay: `${0.4 + (index * 0.1)}s` }}>
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
      <div className="ios-card animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <h2 className="ios-section-title">Unresolved Questions</h2>
        {unresolvedQuestions.length > 0 ? (
          <ul className="ml-5 space-y-2 list-disc">
            {unresolvedQuestions.map((question, index) => (
              <li key={index} className="text-gray-700 animate-fade-in" style={{ animationDelay: `${0.5 + (index * 0.1)}s` }}>
                {question.question}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No unresolved questions identified.</p>
        )}
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-center mt-8 gap-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <button 
          id="openWindowButton"
          className="flex items-center ios-button bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
          onClick={openInNewWindow}
        >
          <svg 
            className="w-5 h-5 mr-2" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          OPEN IN NEW WINDOW
        </button>
        
        <button 
          id="downloadPdfButton"
          className="flex items-center ios-button bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
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