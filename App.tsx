
import React, { useState, useCallback, useEffect } from 'react';
import { Step, ContractType, FormData, Signatures, SavedContract } from './types';
import { contractTemplates, empresaData } from './constants';
import StepIndicator from './components/StepIndicator';
import SelectContract from './components/SelectContract';
import ContractForm from './components/ContractForm';
import PreviewContract from './components/PreviewContract';
import SignContract from './components/SignContract';
import ManageContracts from './components/ManageContracts';
import GitSyncIndicator, { SyncStatus } from './components/GitSyncIndicator';
import { 
    generateFinalPDF, 
    loadContracts,
    saveContract,
    deleteContract
} from './services/contractService';
import { auth } from './firebase';
import Login from './components/Login';
import LoadingSpinner from './components/LoadingSpinner';

// FIX: Define a local interface for the user object to resolve TypeScript errors
// related to the 'firebase' namespace not being found. This ensures type safety
// for the user object without relying on globally available Firebase types.
interface FirebaseUser {
    uid: string;
    email: string | null;
}

const Header = ({ user, onLogout, syncStatus }: { user: FirebaseUser, onLogout: () => void, syncStatus: SyncStatus }) => (
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

const App: React.FC = () => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
    
    const [step, setStep] = useState<Step>(Step.Select);
    const [completedSteps, setCompletedSteps] = useState<Set<Step>>(new Set([Step.Select]));
    const [contractType, setContractType] = useState<ContractType | null>(null);
    const [formData, setFormData] = useState<FormData>({});
    const [contracts, setContracts] = useState<SavedContract[]>([]);

    useEffect(() => {
        // If auth service is not available (e.g., if SDK fails to load),
        // ensure we don't try to use it.
        if (!auth) {
            setLoadingAuth(false);
            setUser(null);
            return;
        }

        const unsubscribe = auth.onAuthStateChanged((user: FirebaseUser | null) => {
            setUser(user);
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
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

    const handleSignComplete = async (signatures: Signatures) => {
        if (!contractType) return;
        setSyncStatus('syncing');
        try {
            await generateFinalPDF(contractTemplates[contractType], formData, signatures, contractType);
            
            if (!user) throw new Error("Utilizador não autenticado");

            const newContract: Omit<SavedContract, 'id'> = {
                type: contractType,
                title: contractTemplates[contractType].title,
                data: formData,
                signatures,
                createdAt: new Date().toISOString(),
            };
            await saveContract(user.uid, newContract);
            const updatedContracts = await loadContracts(user.uid);
            setContracts(updatedContracts);
            setSyncStatus('synced');
            alert('🎉 Sucesso! Contrato gerado e arquivado na nuvem.');
            resetProcess();
        } catch (error) {
            setSyncStatus('error');
            console.error(error);
            alert(`❌ Erro ao gerar ou guardar o contrato: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    
    const handleDeleteContract = async (id: string) => {
        if (!user) return;
        setSyncStatus('syncing');
        try {
            await deleteContract(user.uid, id);
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

    const handleLogout = () => {
        if (auth) {
            auth.signOut();
        }
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

    if (loadingAuth) {
        return <LoadingSpinner />;
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen text-gray-100 font-sans">
            <div className="p-4 sm:p-6">
                <style>{`.fade-in { animation: fadeIn 0.5s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } } .glass-effect { backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%); background-color: rgba(31, 41, 55, 0.75); border: 1px solid rgba(255, 255, 255, 0.125); }`}</style>
                <div className="container mx-auto px-4 py-6 max-w-7xl">
                    <Header user={user} onLogout={handleLogout} syncStatus={syncStatus} />

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
        </div>
    );
};

export default App;