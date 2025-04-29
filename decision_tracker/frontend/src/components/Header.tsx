import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container max-w-3xl px-4 py-4 mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg 
              className="w-8 h-8 mr-2 text-ios-blue" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
            </svg>
            <h1 className="text-2xl font-bold text-ios-dark">Decision Tracker</h1>
          </div>
          <div className="text-sm text-gray-500">
            Powered by LLaMA 70B
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 