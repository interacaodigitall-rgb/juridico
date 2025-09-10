
import React from 'react';

const LoadingSpinner: React.FC = () => (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen flex flex-col justify-center items-center text-white">
        <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-b-2 border-blue-500 mb-6"></div>
        <p className="text-xl text-gray-300">A carregar...</p>
    </div>
);

export default LoadingSpinner;