import React, { useState, useCallback, useEffect } from 'react';
import { Step, ContractType, FormData, Signatures, SavedContract } from './types';
import { contractTemplates, empresaData } from './constants';
import StepIndicator from './components/StepIndicator';
import SelectContract from './components/SelectContract';
import ContractForm from './components/ContractForm';
import PreviewContract from './components/PreviewContract';
import SignContract from './components/SignContract';
import ManageContracts from './components/ManageContracts';
import { 
    generateFinalPDF, 
    loadContractsFromStorage, 
    saveContractToStorage, 
    deleteContractFromStorage 
} from './services/contractService';

const Header = () => (
    <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Sistema Jurídico TVDE
        </h1>
        <p className="text-gray-400 text-lg mt-2">Plataforma Profissional de Gestão Contratual</p>
    </div>
);

const App: React.FC = () => {
    const [step, setStep] = useState<Step>(Step.Select);
    const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set([Step.Select]));
    const [contractType, setContractType] = useState<ContractType | null>(null);
    const [formData, setFormData] = useState<FormData>({});
    const [contracts, setContracts] = useState<SavedContract[]>([]);

    useEffect(() => {
        setContracts(loadContractsFromStorage());
    }, []);

    const resetProcess = useCallback(() => {
        setStep(Step.Select);
        setCompletedSteps(new Set([Step.Select]));
        setContractType(null);
        setFormData({});
    }, []);

    const goToStep = (targetStep: Step) => {
        if (completedSteps.has(targetStep)) {
            setStep(targetStep);
        }
    };
    
    const handleSelectContract = (type: ContractType) => {
        setContractType(type);
        setFormData({...empresaData});
        setStep(Step.Form);
        setCompletedSteps(prev => new Set([...prev, Step.Form]));
    };

    const handleFormSubmit = (data: FormData) => {
        setFormData(data);
        setStep(Step.Preview);
        setCompletedSteps(prev => new Set([...prev, Step.Preview]));
    };

    const handlePreviewAccept = () => {
        setStep(Step.Sign);
        setCompletedSteps(prev => new Set([...prev, Step.Sign]));
    };

    const handleSignComplete = async (signatures: Signatures) => {
        if (!contractType) return;
        try {
            const { pdfDataUri } = await generateFinalPDF(contractTemplates[contractType], formData, signatures, contractType);
            const newContract: SavedContract = {
                id: Date.now(),
                type: contractType,
                title: contractTemplates[contractType].title,
                data: formData,
                signatures,
                createdAt: new Date().toISOString(),
                pdf: pdfDataUri
            };
            saveContractToStorage(newContract);
            setContracts(loadContractsFromStorage());
            alert('🎉 Sucesso! Contrato gerado e arquivado.');
            resetProcess();
        } catch (error) {
            console.error(error);
            alert(`❌ Erro ao gerar o PDF: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    
    const handleDeleteContract = (id: number) => {
        deleteContractFromStorage(id);
        setContracts(loadContractsFromStorage());
    };

    const handleEditContract = (contract: SavedContract) => {
        setContractType(contract.type);
        setFormData(contract.data);
        setStep(Step.Form);
        setCompletedSteps(new Set([Step.Select, Step.Form, Step.Preview, Step.Sign]));
    };

    const renderStep = () => {
        switch (step) {
            case Step.Select:
                return <SelectContract onSelect={handleSelectContract} />;
            case Step.Form:
                if (!contractType) return null;
                return <ContractForm template={contractTemplates[contractType]} onBack={resetProcess} onNext={handleFormSubmit} initialData={formData}/>;
            case Step.Preview:
                if (!contractType) return null;
                return <PreviewContract template={contractTemplates[contractType]} formData={formData} onBack={() => setStep(Step.Form)} onNext={handlePreviewAccept} />;
            case Step.Sign:
                if (!contractType) return null;
                return <SignContract template={contractTemplates[contractType]} formData={formData} onBack={() => setStep(Step.Preview)} onComplete={handleSignComplete} />;
            case Step.Manage:
                return <ManageContracts contracts={contracts} onDelete={handleDeleteContract} onEdit={handleEditContract} onNew={resetProcess}/>;
            default:
                return <SelectContract onSelect={handleSelectContract} />;
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen text-gray-100 font-sans p-4 sm:p-6">
            <style>{`.fade-in { animation: fadeIn 0.5s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } } .glass-effect { backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%); background-color: rgba(31, 41, 55, 0.75); border: 1px solid rgba(255, 255, 255, 0.125); }`}</style>
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                <Header />

                <div className="glass-effect rounded-xl p-4 sm:p-6 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <StepIndicator currentStep={step} goToStep={goToStep} completedSteps={completedSteps} />
                         <button
                            onClick={() => {
                                setStep(Step.Manage)
                                setCompletedSteps(prev => new Set([...prev, Step.Manage]));
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-300 flex items-center space-x-2 shadow-lg"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                            <span>Arquivo</span>
                        </button>
                    </div>
                </div>

                <main>{renderStep()}</main>
            </div>
        </div>
    );
};

export default App;
