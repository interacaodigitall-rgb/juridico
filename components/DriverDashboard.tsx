import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SavedContract, UserProfile, Signatures } from '../types';
import { loadContracts, generateFinalPDF, updateContractSignatures } from '../services/contractService';
import { contractTemplates } from '../constants';
import LoadingSpinner from './LoadingSpinner';

interface DriverDashboardProps {
    user: any;
    userProfile: UserProfile;
    onLogout: () => void;
}

const DriverDashboard: React.FC<DriverDashboardProps> = ({ user, userProfile, onLogout }) => {
    const [contracts, setContracts] = useState<SavedContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContract, setSelectedContract] = useState<SavedContract | null>(null);

    const fetchContracts = useCallback(() => {
        setLoading(true);
        loadContracts(user.uid, 'driver')
            .then(setContracts)
            .finally(() => setLoading(false));
    }, [user.uid]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    const handleSignContract = (contract: SavedContract) => {
        setSelectedContract(contract);
    };

    const handleBackToList = () => {
        setSelectedContract(null);
        fetchContracts();
    };

    if (loading) return <LoadingSpinner />;

    if (selectedContract) {
        return <SignView contract={selectedContract} onBack={handleBackToList} driverUid={user.uid} />;
    }

    return (
        <div className="p-4 sm:p-6">
            <div className="container mx-auto px-4 py-6 max-w-4xl">
                <div className="flex justify-between items-center mb-8">
                    <div className="text-left">
                        <h1 className="text-3xl font-bold text-gray-100">Portal do Motorista</h1>
                        <p className="text-gray-400">Bem-vindo, {userProfile.email}</p>
                    </div>
                    <button onClick={onLogout} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold">Sair</button>
                </div>

                <div className="space-y-10">
                    <ContractList title="Documentos para Assinar" contracts={contracts} onAction={handleSignContract} actionLabel="Rever e Assinar" />
                </div>
            </div>
        </div>
    );
};

// --- Sub-componentes para o DriverDashboard ---
const getPendingRolesForDriver = (contract: SavedContract): { key: string, label: string }[] => {
    const template = contractTemplates[contract.type];
    // The name of the logged-in driver as per the contract data.
    const driverName = contract.data.NOME_MOTORISTA;

    // Define the roles a user in the driver portal can possibly sign for.
    // We explicitly exclude "REPRESENTANTE_NOME" as it's handled by the admin.
    const possibleDriverRoles = [
        { key: "NOME_MOTORISTA", label: "Motorista" },
        { key: "NOME_PROPRIETARIO", label: "Proprietário" },
    ];

    const pendingRoles: { key: string, label: string }[] = [];

    for (const role of possibleDriverRoles) {
        // Check if this role is required for this specific contract type
        const isRoleRequired = template.signatures.includes(role.key);
        // Check if this role has already been signed
        const isRoleSigned = !!contract.signatures[role.key];
        // Check if the name assigned to this role in the contract matches the logged-in driver's name
        const isDriverAssignedToRole = contract.data[role.key] === driverName;

        if (isRoleRequired && !isRoleSigned && isDriverAssignedToRole) {
            pendingRoles.push({ key: role.key, label: role.label });
        }
    }

    return pendingRoles;
};


const ContractList: React.FC<{ title: string; contracts: SavedContract[]; onAction: (c: SavedContract) => void; actionLabel: string; }> = ({ title, contracts, onAction, actionLabel }) => (
    <div>
        <h2 className="text-2xl font-semibold text-gray-200 mb-4 border-b-2 border-gray-700 pb-2">{title}</h2>
        {contracts.length === 0 ? (
            <div className="text-center py-10">
                <div className="text-5xl mb-4">👍</div>
                <h3 className="text-xl font-bold text-gray-300">Tudo em ordem!</h3>
                <p className="text-gray-400">De momento, não tem contratos pendentes para assinar.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {contracts.map(contract => {
                    const pendingRoles = getPendingRolesForDriver(contract);
                    const buttonLabel = pendingRoles.length > 0 
                        ? `Assinar como ${pendingRoles.map(r => r.label).join(' e ')}`
                        : actionLabel;

                    return (
                        <div key={contract.id} className="glass-effect rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-100">{contract.title}</h3>
                                <p className="text-sm text-gray-400">Recebido em: {new Date(contract.createdAt).toLocaleDateString('pt-PT')}</p>
                            </div>
                            <button onClick={() => onAction(contract)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold w-full sm:w-auto">
                                {buttonLabel}
                            </button>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);

const SignView: React.FC<{ contract: SavedContract; onBack: () => void; driverUid: string; }> = ({ contract, onBack, driverUid }) => {
    const [currentContract, setCurrentContract] = useState(contract);
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState<{ key: string, label: string } | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const pendingRoles = getPendingRolesForDriver(currentContract);
    
    useEffect(() => {
        if (pendingRoles.length > 0 && !selectedRole) {
            setSelectedRole(pendingRoles[0]);
        } else if (pendingRoles.length === 0) {
            setSelectedRole(null);
        }
    }, [pendingRoles, selectedRole]);

    const template = contractTemplates[currentContract.type];
    let previewContent = template.template;
    Object.entries(currentContract.data).forEach(([key, value]) => {
        previewContent = previewContent.replace(new RegExp(`{{${key}}}`, 'g'), value || `[${key}]`);
    });
    const formattedContent = previewContent.replace(/\n/g, '<br />');

    const calibrateCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }, []);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const timer = setTimeout(() => {
            calibrateCanvas();
            clearCanvas();
        }, 50);
        window.addEventListener('resize', calibrateCanvas);

        return () => {
            document.body.style.overflow = 'auto';
            window.removeEventListener('resize', calibrateCanvas);
            clearTimeout(timer);
        };
    }, [calibrateCanvas, clearCanvas, selectedRole]);


    const getCoords = (e: MouseEvent | TouchEvent): { x: number, y: number } | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const event = 'touches' in e ? e.touches[0] : e;
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const coords = getCoords(e.nativeEvent);
        if (!coords) return;
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.beginPath();
        ctx?.moveTo(coords.x, coords.y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;
        const coords = getCoords(e.nativeEvent);
        if (!coords) return;
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.lineTo(coords.x, coords.y);
        ctx?.stroke();
    };

    const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        setIsDrawing(false);
    };

    const handleSubmitSignature = async () => {
        if (!canvasRef.current || !selectedRole) return;
        setLoading(true);
        const dataURL = canvasRef.current.toDataURL('image/png');

        const newSignatures: Signatures = { ...currentContract.signatures, [selectedRole.key]: dataURL };
        const allSigners = template.signatures;
        const isComplete = allSigners.every(signer => newSignatures[signer]);

        try {
            await updateContractSignatures(
                currentContract.id, 
                newSignatures, 
                isComplete ? 'completed' : 'pending_signature',
                driverUid,
                currentContract.adminUid
            );
            setCurrentContract(prev => ({ ...prev, signatures: newSignatures }));
            // Select next role or null if done
            const nextRoles = getPendingRolesForDriver({ ...currentContract, signatures: newSignatures });
            setSelectedRole(nextRoles[0] || null);

        } catch (e) {
            alert("Erro ao guardar assinatura.");
        } finally {
            setLoading(false);
        }
    };
    
    if (pendingRoles.length === 0) {
        return (
             <div className="fixed inset-0 bg-gray-900 flex flex-col justify-center items-center text-center p-4 z-50">
                <div className="text-5xl mb-4">✅</div>
                <h1 className="text-3xl font-bold text-green-400 mb-2">Assinatura Enviada!</h1>
                <p className="text-lg text-gray-300">O contrato foi assinado com sucesso.</p>
                <button onClick={onBack} className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">Voltar aos Meus Contratos</button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col p-2 sm:p-4 overflow-y-auto">
            <div className="flex-shrink-0 mb-4">
                <button onClick={onBack} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">← Voltar à Lista</button>
            </div>
            
            <div className="glass-effect rounded-xl p-4 mb-4 overflow-hidden flex-shrink-0 flex flex-col min-h-[40vh]">
                <h2 className="text-2xl font-bold mb-2 text-gray-100 flex-shrink-0">{currentContract.title}</h2>
                <div className="bg-white rounded-lg p-4 flex-grow overflow-y-auto shadow-inner">
                    <div dangerouslySetInnerHTML={{ __html: formattedContent }} style={{ fontFamily: "'Times New Roman', serif", color: 'black', fontSize: '12px' }} />
                </div>
            </div>
            
            <div className="glass-effect rounded-xl p-4 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-white mb-2 text-center">
                    Assinar como: <span className="text-blue-400">{selectedRole?.label}</span>
                </h3>
                {pendingRoles.length > 1 && (
                     <div className="flex justify-center gap-2 mb-2">
                        {pendingRoles.map(role => (
                            <button key={role.key} onClick={() => setSelectedRole(role)} className={`px-3 py-1 text-sm rounded-full ${selectedRole?.key === role.key ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
                                {role.label}
                            </button>
                        ))}
                    </div>
                )}
                 <div className="flex-grow w-full h-full min-h-[150px]">
                    <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-full rounded-lg cursor-crosshair bg-white touch-none" />
                 </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button onClick={clearCanvas} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold">Limpar</button>
                    <button onClick={handleSubmitSignature} disabled={loading || !selectedRole} className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-50">
                        {loading ? "Aguarde..." : `Confirmar Assinatura como ${selectedRole?.label}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;