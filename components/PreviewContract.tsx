
import React from 'react';
import { ContractTemplate, FormData } from '../types';

interface PreviewContractProps {
    template: ContractTemplate;
    formData: FormData;
    onBack: () => void;
    onNext: () => void;
}

const PreviewContract: React.FC<PreviewContractProps> = ({ template, formData, onBack, onNext }) => {
    
    let previewContent = template.template;
    Object.entries(formData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        previewContent = previewContent.replace(regex, value || `[${key}]`);
    });
    
    const formattedContent = previewContent.replace(/\n/g, '<br />');

    return (
        <div className="glass-effect rounded-xl p-8 fade-in">
            <h2 className="text-3xl font-bold mb-8 text-gray-100">Revisão do Documento</h2>
            <div className="bg-white rounded-lg p-8 mb-8 max-h-[60vh] overflow-y-auto shadow-lg">
                <div 
                    className="text-black selection:bg-yellow-300"
                    style={{ fontFamily: "'Times New Roman', serif", lineHeight: 1.8, fontSize: '13px', textAlign: 'justify' }}
                    dangerouslySetInnerHTML={{ __html: formattedContent }}
                />
            </div>
            <div className="flex justify-between">
                <button onClick={onBack} className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path></svg>
                    <span>Editar Dados</span>
                </button>
                <button onClick={onNext} className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2">
                    <span>Prosseguir para Assinatura</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
        </div>
    );
};

export default PreviewContract;
