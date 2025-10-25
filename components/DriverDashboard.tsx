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
        loadContracts(user.uid, userProfile.role)
            .then(setContracts)
            .finally(() => setLoading(false));
    }, [user.uid, userProfile.role]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    const handleSignContract = (contract: SavedContract) => {
        setSelectedContract(contract);
    };

    const handleBackToList = () => {
        setSelectedContract(null);
        fetchContracts(); // Recarrega os contratos para refletir o novo estado
    };

    if (loading) return <LoadingSpinner />;

    if (selectedContract) {
        return <SignView contract={selectedContract} onBack={handleBackToList} />;
    }

    const pendingContracts = contracts.filter(c => c.status === 'pending_signature' && getPendingRolesForDriver(c).length > 0);
    const completedContracts = contracts.filter(c => c.status === 'completed');

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
                    <PendingContractList contracts={pendingContracts} onSign={handleSignContract} />
                    <CompletedContractList contracts={completedContracts} />
                </div>
            </div>
        </div>
    );
};

// --- Sub-componentes para o DriverDashboard ---
const getPendingRolesForDriver = (contract: SavedContract): { key: string, label: string }[] => {
    const template = contractTemplates[contract.type];
    const driverName = contract.data.NOME_MOTORISTA;

    const possibleDriverRoles = [
        { key: "NOME_MOTORISTA", label: "Motorista" },
        { key: "NOME_PROPRIETARIO", label: "Proprietário" },
    ];

    const pendingRoles: { key: string, label: string }[] = [];

    for (const role of possibleDriverRoles) {
        const isRoleRequired = template.signatures.includes(role.key);
        const isRoleSigned = !!contract.signatures[role.key];
        const isDriverAssignedToRole = contract.data[role.key] === driverName;

        if (isRoleRequired && !isRoleSigned && isDriverAssignedToRole) {
            pendingRoles.push({ key: role.key, label: role.label });
        }
    }
    return pendingRoles;
};

const PendingContractList: React.FC<{ contracts: SavedContract[]; onSign: (c: SavedContract) => void; }> = ({ contracts, onSign }) => (
    <div>
        <h2 className="text-2xl font-semibold text-gray-200 mb-4 border-b-2 border-gray-700 pb-2">Documentos para Assinar</h2>
        {contracts.length === 0 ? (
            <div className="text-center py-10 glass-effect rounded-lg">
                <div className="text-5xl mb-4">👍</div>
                <h3 className="text-xl font-bold text-gray-300">Tudo em ordem!</h3>
                <p className="text-gray-400">De momento, não tem contratos pendentes.</p>
            </div>
        ) : (
            <div className="space-y-4">
                {contracts.map(contract => (
                    <div key={contract.id} className="glass-effect rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-gray-100">{contract.title}</h3>
                            <p className="text-sm text-gray-400">Recebido em: {new Date(contract.createdAt).toLocaleDateString('pt-PT')}</p>
                        </div>
                        <button onClick={() => onSign(contract)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold w-full sm:w-auto">
                            Rever e Assinar
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const CompletedContractList: React.FC<{ contracts: SavedContract[]; }> = ({ contracts }) => {
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

    return (
        <div>
            <h2 className="text-2xl font-semibold text-gray-200 mb-4 border-b-2 border-gray-700 pb-2">Arquivo de Contratos Concluídos</h2>
            {contracts.length === 0 ? (
                <div className="text-center py-10 glass-effect rounded-lg">
                    <div className="text-5xl mb-4">📂</div>
                    <h3 className="text-xl font-bold text-gray-300">Arquivo Vazio</h3>
                    <p className="text-gray-400">Ainda não tem contratos concluídos.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {contracts.map(contract => (
                        <div key={contract.id} className="glass-effect rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-100">{contract.title}</h3>
                                <p className="text-sm text-gray-400">Concluído em: {new Date(contract.createdAt).toLocaleDateString('pt-PT')}</p>
                            </div>
                            <button onClick={() => handleDownload(contract)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold w-full sm:w-auto">
                                Baixar PDF
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const SignView: React.FC<{ contract: SavedContract; onBack: () => void; }> = ({ contract, onBack }) => {
    const [currentContract, setCurrentContract] = useState(contract);
    const [loading, setLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState<{ key: string, label: string } | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const pendingRoles = getPendingRolesForDriver(currentContract);
    
    useEffect(() => {
        if (pendingRoles.length > 0 && !selectedRole) {
            setSelectedRole(pendingRoles[0]);
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

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#111827';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
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
        const timer = setTimeout(() => {
            calibrateCanvas();
        }, 50);
        window.addEventListener('resize', calibrateCanvas);

        return () => {
            window.removeEventListener('resize', calibrateCanvas);
            clearTimeout(timer);
        };
    }, [calibrateCanvas, selectedRole]);


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
                isComplete ? 'completed' : 'pending_signature'
            );
            
            const updatedContractState = { ...currentContract, signatures: newSignatures, status: isComplete ? 'completed' : 'pending_signature' } as SavedContract;
            const nextRoles = getPendingRolesForDriver(updatedContractState);

            if (nextRoles.length > 0) {
                 setCurrentContract(updatedContractState);
                 setSelectedRole(nextRoles[0]);
                 alert(`Assinatura como "${selectedRole?.label}" guardada. Por favor, assine agora como "${nextRoles[0].label}".`);
            } else {
                 alert('Obrigado! Todas as suas assinaturas foram submetidas com sucesso.');
                 onBack();
            }

        } catch (e) {
            alert(e instanceof Error ? e.message : "Erro ao guardar assinatura.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col p-2 sm:p-4 overflow-hidden">
            <div className="flex-shrink-0 mb-4 flex items-center">
                <button onClick={onBack} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">← Voltar</button>
                <h1 className="text-lg md:text-xl font-bold text-gray-100 text-center flex-grow truncate px-2">{currentContract.title}</h1>
            </div>

            <div className="flex-grow flex flex-col md:flex-row gap-4 min-h-0">
                 {/* Painel de Pré-visualização */}
                 <div className="glass-effect rounded-xl p-4 flex flex-col md:w-1/2 overflow-hidden">
                    <h2 className="text-xl font-bold mb-2 text-gray-100 flex-shrink-0">Pré-visualização</h2>
                    <div className="bg-white rounded-lg p-4 flex-grow overflow-y-auto shadow-inner">
                        <div dangerouslySetInnerHTML={{ __html: formattedContent }} style={{ fontFamily: "'Times New Roman', serif", color: 'black', fontSize: '12px', textAlign: 'justify' }} />
                    </div>
                </div>

                {/* Painel de Assinatura */}
                <div className="glass-effect rounded-xl p-4 flex flex-col md:w-1/2">
                    <h3 className="text-xl font-bold text-white mb-2 text-center flex-shrink-0">
                        Assinar como: <span className="text-blue-400">{selectedRole?.label}</span>
                    </h3>
                    {pendingRoles.length > 1 && (
                        <div className="flex justify-center gap-2 mb-2 flex-wrap flex-shrink-0">
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
                    <div className="mt-4 flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        <button onClick={clearCanvas} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold">Limpar</button>
                        <button onClick={handleSubmitSignature} disabled={loading || !selectedRole} className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold disabled:opacity-50">
                            {loading ? "Aguarde..." : `Confirmar Assinatura como ${selectedRole?.label}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;