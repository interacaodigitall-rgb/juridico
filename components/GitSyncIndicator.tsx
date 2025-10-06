// FIX: Import React to resolve "Cannot find namespace 'JSX'" error.
import React from 'react';

export type SyncStatus = 'syncing' | 'synced' | 'error';

const statusConfig: Record<SyncStatus, { icon: JSX.Element; text: string; color: string }> = {
    syncing: {
        icon: (
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        ),
        text: 'Sincronizando...',
        color: 'text-yellow-400',
    },
    synced: {
        icon: (
             <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
        ),
        text: 'Sincronizado',
        color: 'text-green-400',
    },
    error: {
        icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        ),
        text: 'Erro de Sincronização',
        color: 'text-red-400',
    },
};

const CloudIcon = () => (
     <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
);


const GitSyncIndicator: React.FC<{ status: SyncStatus }> = ({ status }) => {
    const currentStatus = statusConfig[status];

    return (
        <div className="flex items-center bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <CloudIcon />
            <span className={`font-semibold mr-2 ${currentStatus.color}`}>{currentStatus.text}</span>
            <div className={currentStatus.color}>
                {currentStatus.icon}
            </div>
        </div>
    );
};

export default GitSyncIndicator;