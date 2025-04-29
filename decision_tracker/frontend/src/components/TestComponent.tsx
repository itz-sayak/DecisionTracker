import React from 'react';
import { jsPDF } from 'jspdf';

const TestComponent: React.FC = () => {
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(22);
    doc.setTextColor(0, 122, 255); // iOS blue
    doc.text('Test PDF Document', 105, 20, { align: 'center' });
    
    // Add content
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('This is a test PDF document.', 20, 40);
    doc.text('If you can see this, the PDF generation is working correctly.', 20, 50);
    
    // Add date
    const today = new Date();
    const dateStr = today.toLocaleDateString();
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${dateStr}`, 105, 285, { align: 'center' });
    
    // Save the PDF
    doc.save('test-document.pdf');
  };
  
  return (
    <div className="mt-8 ios-card">
      <h2 className="ios-section-title">PDF Test</h2>
      <p className="text-gray-700 mb-4">
        This component tests the PDF download functionality. Click the button below to generate and download a test PDF.
      </p>
      
      {/* Export button */}
      <div className="flex justify-center mt-6">
        <button 
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md"
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
          TEST PDF DOWNLOAD
        </button>
      </div>
    </div>
  );
};

export default TestComponent; 