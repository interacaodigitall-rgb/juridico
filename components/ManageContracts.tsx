import React from 'react';
import { SavedContract, ContractType } from '../types';
import { generateFinalPDF } from '../services/contractService';
import { contractTemplates } from '../constants';

interface ManageContractsProps {
    contracts: SavedContract[];
    onDelete: (contract: SavedContract) => void;
    onEdit: (contract: SavedContract) => void;
    onNew: () => void;
}

const ManageContracts: React.FC<ManageContractsProps> = ({ contracts, onDelete, onEdit, onNew }) => {

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
        prestacao: "Contratos de Prestação de Serviços",
        aluguer: "Contratos de Aluguer de Viatura",
        uber: "Autorizações Uber",
        comodato: "Contratos de Comodato Bolt",
    };
    
    const orderedContractTypes = Object.keys(groupedContracts).sort((a,b) => a.localeCompare(b)) as ContractType[];


    return (
        <div className="glass-effect rounded-xl p-8 fade-in">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-100">Arquivo de Contratos</h2>
                 <button onClick={onNew} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-300">
                    + Novo Contrato
                </button>
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
                <div className="space-y-10">
                     {orderedContractTypes.map(type => (
                        <div key={type}>
                            <h3 className="text-2xl font-semibold text-gray-200 mb-4 border-b-2 border-gray-700 pb-2">{contractTypeTitles[type]}</h3>
                            <div className="space-y-4">
                                {groupedContracts[type].map(contract => (
                                    <div key={contract.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-all duration-300">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="font-bold text-xl text-gray-100">{contract.title}</h4>
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${contract.status === 'completed' ? 'bg-green-600/30 text-green-300' : 'bg-yellow-600/30 text-yellow-300'}`}>
                                                        {contract.status === 'completed' ? 'Concluído' : 'Pendente'}
                                                    </span>
                                                </div>

                                                <p className="text-gray-400 text-sm mb-3">
                                                    Criado em: {new Date(contract.createdAt).toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                <p className="text-sm text-gray-300">
                                                   <span className="font-semibold text-gray-400">Motorista:</span> {contract.data.NOME_MOTORISTA || contract.data.NOME_OPERADOR || 'N/A'}
                                                </p>
                                                <p className="text-sm text-gray-300">
                                                   <span className="font-semibold text-gray-400">Matrícula:</span> {contract.data.MATRICULA || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="flex flex-row md:flex-col items-stretch md:items-end gap-2 w-full md:w-auto">
                                                <button onClick={() => onEdit(contract)} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
                                                    <span>Editar</span>
                                                </button>
                                                <button onClick={() => handleDownload(contract)} className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                    <span>Baixar</span>
                                                </button>
                                                <button onClick={() => { if(window.confirm('Tem a certeza que deseja excluir este contrato?')) { onDelete(contract) }}} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    <span>Excluir</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManageContracts;