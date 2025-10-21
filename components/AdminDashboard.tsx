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
    saveContract,
    deleteContract
} from '../services/contractService';
import { findUserByEmail } from '../services/authService';
import { auth, firestore } from '../firebase';


// Declara o objeto global do Firebase para que o TypeScript o reconheça
declare const firebase: any;

interface AdminDashboardProps {
    user: any;
    onLogout: () => void;
}

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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
    const [step, setStep] = useState<Step>(Step.Select);
    const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set([Step.Select]));
    const [contractType, setContractType] = useState<ContractType | null>(null);
    const [formData, setFormData] = useState<FormData>({});
    const [contracts, setContracts] = useState<SavedContract[]>([]);

    useEffect(() => {
        if (!user) {
            setContracts([]);
            return;
        }
        setSyncStatus('syncing');
        loadContracts(user.uid, 'admin')
            .then(data => {
                setContracts(data);
                setSyncStatus('synced');
            })
            .catch(() => setSyncStatus('error'));
    }, [user]);

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

    const handleFinalizeContract = async (signatures: Signatures, driverEmail: string, action: 'send' | 'finalize') => {
        if (!contractType || !user) return;
        setSyncStatus('syncing');

        const driverPasswordSuggestion = '0123456';

        try {
            // 1. Encontrar o perfil do motorista para obter o UID
            let driverProfile = await findUserByEmail(driverEmail);
            
            if (!driverProfile) {
                const shouldCreate = window.confirm(`Não foi encontrada uma conta para o motorista com o e-mail ${driverEmail}.\n\nPara prosseguir, uma conta precisa de ser criada para ele na consola do Firebase.\n\nUse a palavra-passe temporária: ${driverPasswordSuggestion}\n\nO motorista poderá usá-la para aceder e assinar. Clique em 'OK' se já criou a conta e quer tentar novamente.`);
                if (shouldCreate) {
                    driverProfile = await findUserByEmail(driverEmail);
                    if (!driverProfile) {
                        throw new Error("A conta do motorista ainda não foi encontrada. Por favor, crie-a na consola do Firebase e tente novamente.");
                    }
                } else {
                    throw new Error("Criação de contrato cancelada. Crie a conta do motorista primeiro.");
                }
            }
            
            const currentTemplate = contractTemplates[contractType];
            const allSignaturesCollected = Object.keys(signatures).length >= currentTemplate.signatures.length;
            
            let contractStatus: SavedContract['status'] = 'pending_signature';
            if (action === 'finalize' && allSignaturesCollected) {
                contractStatus = 'completed';
            }

            // 2. Preparar e guardar o contrato usando o novo serviço
            const newContract: Omit<SavedContract, 'id'> = {
                type: contractType,
                title: currentTemplate.title,
                data: { ...formData, DRIVER_EMAIL: driverEmail }, // Store email for reference
                signatures,
                createdAt: new Date().toISOString(),
                adminUid: user.uid,
                driverUid: driverProfile.uid,
                driverEmail: driverProfile.email,
                status: contractStatus,
            };
            
            await saveContract(newContract);
            
            // 3. Gerar PDF se finalizado localmente ou notificar o envio
            if (action === 'finalize') {
                if (allSignaturesCollected) {
                    await generateFinalPDF(currentTemplate, newContract.data, signatures, contractType);
                    alert('🎉 Sucesso! Contrato assinado, PDF gerado e arquivado.');
                } else {
                    alert('⚠️ Aviso! O PDF não foi gerado porque faltam assinaturas. O contrato foi guardado como pendente.');
                }
            } else { // action === 'send'
                alert('✅ Sucesso! Contrato enviado para o portal do motorista para assinatura.');
            }

            // 4. Atualizar a lista local e voltar ao início
            const updatedContracts = await loadContracts(user.uid, 'admin');
            setContracts(updatedContracts);
            setSyncStatus('synced');
            resetProcess();

        } catch (error) {
            setSyncStatus('error');
            console.error(error);
            alert(`❌ Erro: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    
    const handleDeleteContract = async (id: string) => {
        if (!user) return;
        setSyncStatus('syncing');
        try {
            await deleteContract(id, user.uid);
            setContracts(prev => prev.filter(c => c.id !== id));
            setSyncStatus('synced');
        } catch(error) {
            setSyncStatus('error');
            alert(`❌ Erro ao apagar o contrato: ${error instanceof Error ? error.message : String(error)}`);
        }
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
                return <PreviewContract template={contractTemplates[contractType]} formData={formData} onBack={() => setStep(Step.Form)} onNext={handlePreviewAccept} contractType={contractType} />;
            case Step.Sign:
                if (!contractType) return null;
                return <SignContract template={contractTemplates[contractType]} formData={formData} onBack={() => setStep(Step.Preview)} onFinalize={handleFinalizeContract} contractType={contractType} />;
            case Step.Manage:
                return <ManageContracts contracts={contracts} onDelete={handleDeleteContract} onEdit={handleEditContract} onNew={resetProcess}/>;
            default:
                return <SelectContract onSelect={handleSelectContract} />;
        }
    };

    return (
        <div className="p-4 sm:p-6">
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                <Header user={user} onLogout={onLogout} syncStatus={syncStatus} />
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

export default AdminDashboard;