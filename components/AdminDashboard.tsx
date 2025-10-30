import React, { useState, useCallback, useEffect } from 'react';
import { Step, ContractType, FormData, Signatures, SavedContract, UserProfile } from '../types';
import { contractTemplates, empresaData } from '../constants';
import StepIndicator from './StepIndicator';
import SelectContract from './SelectContract';
import ContractForm from './ContractForm';
import PreviewContract from './PreviewContract';
import SignContract from './SignContract';
import ManageContracts from './ManageContracts';
import GitSyncIndicator, { SyncStatus } from './GitSyncIndicator';
import { 
    generateFinalPDF, 
    loadContracts,
    saveContract
} from '../services/contractService';

const Header = ({ user, onLogout, syncStatus }: { user: any, onLogout: () => void, syncStatus: SyncStatus }) => (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div className="text-center sm:text-left">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Sistema Jurídico TVDE
            </h1>
            <p className="text-gray-400 text-lg mt-2">Plataforma Profissional de Gestão Contratual</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-sm text-gray-300">{user.email}</p>
                 <button onClick={onLogout} className="text-xs text-blue-400 hover:underline">Terminar Sessão</button>
            </div>
            <GitSyncIndicator status={syncStatus} />
        </div>
    </div>
);

const DashboardHome = ({ onNew, onManage }: { onNew: () => void, onManage: () => void }) => (
    <div className="glass-effect rounded-xl p-8 text-center fade-in">
        <h2 className="text-3xl font-bold text-gray-100 mb-4">Bem-vindo ao Painel de Gestão</h2>
        <p className="text-gray-400 mb-8 max-w-xl mx-auto">Crie um novo contrato para um motorista ou consulte o arquivo de todos os documentos pendentes e concluídos.</p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <button
                onClick={onNew}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-3 text-lg"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                <span>Criar Novo Contrato</span>
            </button>
            <button
                onClick={onManage}
                className="w-full sm:w-auto px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-3 text-lg"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                <span>Aceder ao Arquivo</span>
            </button>
        </div>
    </div>
);


const AdminDashboard: React.FC<{ user: any, onLogout: () => void, userProfile: UserProfile }> = ({ user, onLogout, userProfile }) => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
    const [step, setStep] = useState<Step>(Step.Dashboard);
    const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set([Step.Dashboard, Step.Select, Step.Manage]));
    const [contractType, setContractType] = useState<ContractType | null>(null);
    const [formData, setFormData] = useState<FormData>({});
    const [contracts, setContracts] = useState<SavedContract[]>([]);
    
    const fetchContracts = useCallback(() => {
        if (!user || !userProfile) {
            setContracts([]);
            return;
        }
        setSyncStatus('syncing');

        loadContracts(user.uid)
            .then(data => {
                setContracts(data);
                setSyncStatus('synced');
            })
            .catch((err) => {
                alert(err.message || 'Ocorreu um erro desconhecido ao carregar os contratos.');
                setSyncStatus('error');
            });
    }, [user, userProfile]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    const startNewContractProcess = useCallback(() => {
        setStep(Step.Select);
        setCompletedSteps(new Set([Step.Dashboard, Step.Select, Step.Manage]));
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

    const handleFinalizeContract = async (signatures: Signatures, action: 'send' | 'finalize') => {
        if (!contractType || !user) return;
        
        setSyncStatus('syncing');

        try {
            const currentTemplate = contractTemplates[contractType];
            const allSignaturesCollected = Object.keys(signatures).length >= currentTemplate.signatures.length;
            
            let contractStatus: SavedContract['status'] = 'pending_signature';
            if (action === 'finalize' && allSignaturesCollected) {
                contractStatus = 'completed';
            }

            const newContract: Omit<SavedContract, 'id'> = {
                type: contractType,
                title: currentTemplate.title,
                data: formData,
                signatures,
                createdAt: new Date().toISOString(),
                adminUid: user.uid,
                status: contractStatus,
            };
            
            await saveContract(newContract);
            
            if (action === 'finalize') {
                if (allSignaturesCollected) {
                    await generateFinalPDF(currentTemplate, newContract.data, signatures, contractType);
                    alert('🎉 Sucesso! Contrato assinado, PDF gerado e arquivado.');
                } else {
                    alert('⚠️ Aviso! O PDF não foi gerado porque faltam assinaturas. O contrato foi guardado como pendente.');
                }
            } else {
                alert('✅ Sucesso! O contrato foi guardado como pendente no arquivo.');
            }

            fetchContracts();
            setSyncStatus('synced');
            setStep(Step.Dashboard);
            setCompletedSteps(new Set([Step.Dashboard, Step.Select, Step.Manage]));
            setContractType(null);
            setFormData({});

        } catch (error) {
            setSyncStatus('error');
            console.error(error);
            alert(`❌ Erro: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    
    const handleEditContract = (contract: SavedContract) => {
        setContractType(contract.type);
        setFormData(contract.data);
        setStep(Step.Form);
        setCompletedSteps(new Set([Step.Dashboard, Step.Select, Step.Form, Step.Preview, Step.Sign, Step.Manage]));
    };

    const renderStep = () => {
        switch (step) {
            case Step.Dashboard:
                return <DashboardHome onNew={startNewContractProcess} onManage={() => setStep(Step.Manage)} />;
            case Step.Select:
                return <SelectContract onSelect={handleSelectContract} onBackToDashboard={() => setStep(Step.Dashboard)} />;
            case Step.Form:
                if (!contractType) return null;
                return <ContractForm template={contractTemplates[contractType]} onBack={startNewContractProcess} onNext={handleFormSubmit} initialData={formData}/>;
            case Step.Preview:
                if (!contractType) return null;
                return <PreviewContract template={contractTemplates[contractType]} formData={formData} onBack={() => setStep(Step.Form)} onNext={handlePreviewAccept} contractType={contractType} />;
            case Step.Sign:
                if (!contractType) return null;
                return <SignContract template={contractTemplates[contractType]} formData={formData} onBack={() => setStep(Step.Preview)} onFinalize={handleFinalizeContract} contractType={contractType} />;
            case Step.Manage:
                return <ManageContracts contracts={contracts} onEdit={handleEditContract} onNew={startNewContractProcess} onBackToDashboard={() => setStep(Step.Dashboard)} />;
            default:
                 return <DashboardHome onNew={startNewContractProcess} onManage={() => setStep(Step.Manage)} />;
        }
    };
    
    const isCreationFlow = [Step.Select, Step.Form, Step.Preview, Step.Sign].includes(step);

    return (
        <div className="p-4 sm:p-6">
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                <Header user={user} onLogout={onLogout} syncStatus={syncStatus} />
                
                {isCreationFlow && (
                    <div className="glass-effect rounded-xl p-4 sm:p-6 mb-8">
                        <StepIndicator currentStep={step} goToStep={goToStep} completedSteps={completedSteps} />
                    </div>
                )}

                <main>{renderStep()}</main>
            </div>
        </div>
    );
};

export default AdminDashboard;