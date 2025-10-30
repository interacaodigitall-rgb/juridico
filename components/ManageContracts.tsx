import React, { useState } from 'react';
import { SavedContract, ContractType } from '../types';
import { generateFinalPDF } from '../services/contractService';
import { contractTemplates } from '../constants';

interface ManageContractsProps {
    contracts: SavedContract[];
    onEdit: (contract: SavedContract) => void;
    onNew: () => void;
    onBackToDashboard: () => void;
}

const ManageContracts: React.FC<ManageContractsProps> = ({ contracts, onEdit, onNew, onBackToDashboard }) => {
    const [selectedType, setSelectedType] = useState<ContractType | null>(null);

    const handleDownload = async (contract: SavedContract) => {
        const template = contractTemplates[contract.type];
        if (!template) {
            alert('Template de contrato não encontrado!');
            return;
        }
        try {
            alert('A gerar o PDF. O download começará em breve...');
            await generateFinalPDF(template, contract.data, contract.signatures, contract.type);
        } catch (error) {
            console.error("Failed to regenerate PDF:", error);
            alert("Falha ao gerar o PDF. Tente novamente.");
        }
    };

    const groupedContracts = contracts.reduce((acc, contract) => {
        const type = contract.type;
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(contract);
        return acc;
    }, {} as Record<ContractType, SavedContract[]>);

    const contractTypeTitles: Record<ContractType, string> = {
        prestacao: "Prestação de Serviços",
        aluguer: "Aluguer de Viatura",
        uber: "Autorizações Uber",
        comodato: "Comodato Bolt",
        aluguer_proprietario: "Aluguer de Viatura (de Proprietário)",
        aluguer_parceiro: "Aluguer de Viatura (Parceiro)",
    };

    const contractTypeIcons: Record<ContractType, string> = {
        prestacao: '⚖️',
        aluguer: '🚗',
        uber: '📱',
        comodato: '🤝',
        aluguer_proprietario: '🏢',
        aluguer_parceiro: '🤝',
    };
    
    const orderedContractTypes = Object.keys(groupedContracts).sort((a,b) => a.localeCompare(b)) as ContractType[];

    if (!selectedType) {
        return (
            <div className="glass-effect rounded-xl p-8 fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <h2 className="text-3xl font-bold text-gray-100">Arquivo de Contratos</h2>
                     <div className="flex items-center gap-4">
                        <button onClick={onBackToDashboard} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                            <span>Voltar ao Painel</span>
                        </button>
                        <button onClick={onNew} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-300">
                            + Novo Contrato
                        </button>
                    </div>
                </div>

                {contracts.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-6">📁</div>
                        <h3 className="text-2xl font-bold text-gray-300 mb-4">Arquivo Vazio</h3>
                        <p className="text-gray-400 mb-6">Nenhum contrato foi arquivado ainda.</p>
                        <button onClick={onNew} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-300">
                            Criar Primeiro Contrato
                        </button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        {orderedContractTypes.map(type => (
                             <div key={type} onClick={() => setSelectedType(type)} className="cursor-pointer p-6 bg-gradient-to-br from-gray-800 to-gray-700 border border-gray-600 rounded-xl hover:border-blue-500 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-xl text-gray-100">{contractTypeTitles[type]}</h3>
                                        <p className="text-gray-400 text-sm">{groupedContracts[type].length} documento(s)</p>
                                    </div>
                                    <div className="text-4xl">{contractTypeIcons[type]}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const filteredContracts = groupedContracts[selectedType] || [];

    return (
        <div className="glass-effect rounded-xl p-8 fade-in">
             <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-3xl font-bold text-gray-100">{contractTypeTitles[selectedType]}</h2>
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedType(null)} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        <span>Voltar ao Arquivo</span>
                    </button>
                </div>
            </div>

            {filteredContracts.length === 0 ? (
                 <div className="text-center py-12">
                    <div className="text-6xl mb-6">📄</div>
                    <h3 className="text-2xl font-bold text-gray-300 mb-4">Nenhum Documento</h3>
                    <p className="text-gray-400">Não existem contratos deste tipo no arquivo.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredContracts.map(contract => (
                        <div key={contract.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-bold text-xl text-gray-100">{contract.title}</h4>
                                    </div>

                                    <p className="text-gray-400 text-sm mb-3">
                                        Criado em: {new Date(contract.createdAt).toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-sm text-gray-300">
                                       <span className="font-semibold text-gray-400">Motorista/Parceiro:</span> {contract.data.NOME_MOTORISTA || contract.data.NOME_PROPRIETARIO_C || contract.data.NOME_OPERADOR || 'N/A'}
                                    </p>
                                    <p className="text-sm text-gray-300">
                                       <span className="font-semibold text-gray-400">Matrícula:</span> {contract.data.MATRICULA || 'N/A'}
                                    </p>
                                </div>
                                <div className="flex flex-row md:flex-col items-stretch md:items-end gap-2 w-full md:w-auto">
                                    <button onClick={() => onEdit(contract)} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 flex-1 sm:flex-initial">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
                                        <span className="hidden sm:inline">Editar</span>
                                    </button>
                                    <button onClick={() => handleDownload(contract)} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 flex-1 sm:flex-initial">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                        <span className="hidden sm:inline">Baixar</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManageContracts;