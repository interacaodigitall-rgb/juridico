import React, { useState, useCallback, useEffect } from 'react';
import { Step, ContractType, FormData, Signatures, SavedContract } from '../types';
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
import { findUserByEmail } from '../services/authService';

const FIREBASE_PROJECT_ID = 'sistema-juridico-tvde';

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

const InstructionModal = ({ email, onClose, onRetry }: { email: string, onClose: () => void, onRetry: () => void }) => {
    const firebaseProjectUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/users`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 fade-in">
            <div className="bg-gray-800 rounded-xl w-full max-w-2xl p-6 text-left border border-gray-600 shadow-2xl">
                <h3 className="text-2xl font-bold text-white mb-4">Ação Necessária: Criar Conta do Motorista</h3>
                <p className="text-gray-300 mb-4">
                    A conta para o motorista <strong className="text-blue-400">{email}</strong> não foi encontrada.
                    Para que o contrato possa ser enviado para o portal, a conta de autenticação do motorista precisa de ser criada primeiro.
                </p>
                <div className="space-y-3 text-gray-200 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                    <p><strong>Passo 1:</strong> Abra a consola do Firebase num novo separador clicando no link abaixo.</p>
                    <a href={firebaseProjectUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">
                        Ir para a página de Autenticação do Firebase →
                    </a>
                    <p><strong>Passo 2:</strong> Clique no botão <strong>"Adicionar utilizador"</strong>.</p>
                    <p><strong>Passo 3:</strong> Preencha o e-mail: <code className="bg-gray-700 p-1 rounded text-yellow-300">{email}</code></p>
                    <p><strong>Passo 4:</strong> Defina uma palavra-passe temporária (ex: <strong>0123456</strong>) e forneça-a ao motorista.</p>
                    <p><strong>Passo 5:</strong> Clique em <strong>"Adicionar utilizador"</strong>.</p>
                    <p className="pt-2 text-sm text-gray-400">Depois disto, o perfil do motorista na base de dados será criado automaticamente quando ele fizer o primeiro login.</p>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-end">
                    <button onClick={onClose} className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition-all duration-300">Cancelar</button>
                    <button onClick={onRetry} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-300">Já Criei a Conta, Tentar Novamente</button>
                </div>
            </div>
        </div>
    );
};

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


const AdminDashboard: React.FC<{ user: any, onLogout: () => void }> = ({ user, onLogout }) => {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
    const [step, setStep] = useState<Step>(Step.Dashboard);
    const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set([Step.Dashboard, Step.Select, Step.Manage]));
    const [contractType, setContractType] = useState<ContractType | null>(null);
    const [formData, setFormData] = useState<FormData>({});
    const [contracts, setContracts] = useState<SavedContract[]>([]);
    
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
    const [driverEmailForModal, setDriverEmailForModal] = useState('');
    const [retryPayload, setRetryPayload] = useState<{ signatures: Signatures; action: 'send' | 'finalize' } | null>(null);

    const fetchContracts = useCallback(() => {
        if (!user) {
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
    }, [user]);

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

        const driverEmail = formData.EMAIL_MOTORISTA;
        if (!driverEmail) {
            alert('❌ Erro: O e-mail do motorista é obrigatório e não foi encontrado no formulário.');
            setSyncStatus('error');
            return;
        }
        
        setSyncStatus('syncing');

        try {
            const driverProfile = await findUserByEmail(driverEmail);
            
            if (!driverProfile) {
                setDriverEmailForModal(driverEmail);
                setRetryPayload({ signatures, action });
                setIsInstructionModalOpen(true);
                setSyncStatus('synced');
                return;
            }
            
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
                driverUid: driverProfile.uid,
                driverEmail: driverProfile.email,
                status: contractStatus,
                participantUids: [user.uid, driverProfile.uid],
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
                alert('✅ Sucesso! O contrato foi enviado para o portal do motorista e aguarda assinatura.');
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

    const handleRetryFinalize = () => {
        if (retryPayload) {
            setIsInstructionModalOpen(false);
            handleFinalizeContract(retryPayload.signatures, retryPayload.action);
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
             {isInstructionModalOpen && (
                <InstructionModal 
                    email={driverEmailForModal}
                    onClose={() => setIsInstructionModalOpen(false)}
                    onRetry={handleRetryFinalize}
                />
            )}
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