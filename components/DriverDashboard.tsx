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

    useEffect(() => {
        loadContracts(user.uid, 'driver')
            .then(setContracts)
            .finally(() => setLoading(false));
    }, [user.uid]);

    const handleSignContract = (contract: SavedContract) => {
        setSelectedContract(contract);
    };

    const handleBackToList = () => {
        setSelectedContract(null);
        // Recarregar contratos para ver o estado atualizado
        setLoading(true);
        loadContracts(user.uid, 'driver')
            .then(setContracts)
            .finally(() => setLoading(false));
    };

    if (loading) return <LoadingSpinner />;

    if (selectedContract) {
        return <SignView contract={selectedContract} onBack={handleBackToList} />;
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
                {contracts.map(contract => (
                    <div key={contract.id} className="glass-effect rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-gray-100">{contract.title}</h3>
                            <p className="text-sm text-gray-400">Recebido em: {new Date(contract.createdAt).toLocaleDateString('pt-PT')}</p>
                        </div>
                        <button onClick={() => onAction(contract)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold w-full sm:w-auto">
                            {actionLabel}
                        </button>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const SignView: React.FC<{ contract: SavedContract; onBack: () => void; }> = ({ contract, onBack }) => {
    const [isSigned, setIsSigned] = useState(false);
    const [loading, setLoading] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const template = contractTemplates[contract.type];
    let previewContent = template.template;
    Object.entries(contract.data).forEach(([key, value]) => {
        previewContent = previewContent.replace(new RegExp(`{{${key}}}`, 'g'), value || `[${key}]`);
    });
    const formattedContent = previewContent.replace(/\n/g, '<br />');

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    useEffect(() => {
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

    const getCoords = (e: MouseEvent | TouchEvent): { x: number, y: number } | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const event = 'touches' in e ? e.touches[0] : e;
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const coords = getCoords(e.nativeEvent);
        if (!coords) return;
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.beginPath();
        ctx?.moveTo(coords.x, coords.y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const coords = getCoords(e.nativeEvent);
        if (!coords) return;
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.lineTo(coords.x, coords.y);
        ctx?.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);

    const handleSubmitSignature = async () => {
        if (!canvasRef.current) return;
        setLoading(true);
        const dataURL = canvasRef.current.toDataURL('image/png');
        const signerName = "NOME_MOTORISTA"; // Assumindo que o motorista é sempre este signatário

        const newSignatures: Signatures = { ...contract.signatures, [signerName]: dataURL };
        const allSigners = template.signatures;
        const isComplete = allSigners.every(signer => newSignatures[signer]);

        try {
            await updateContractSignatures(contract.id, newSignatures, isComplete ? 'completed' : 'pending_signature');
            setIsSigned(true);
        } catch (e) {
            alert("Erro ao guardar assinatura.");
        } finally {
            setLoading(false);
        }
    };
    
    if (isSigned) {
        return (
             <div className="fixed inset-0 bg-gray-900 flex flex-col justify-center items-center text-center p-4">
                <div className="text-5xl mb-4">✅</div>
                <h1 className="text-3xl font-bold text-green-400 mb-2">Assinatura Enviada!</h1>
                <p className="text-lg text-gray-300">O contrato foi assinado com sucesso.</p>
                <button onClick={onBack} className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">Voltar aos Meus Contratos</button>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl py-6">
            <button onClick={onBack} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg mb-6">← Voltar à Lista</button>
            <div className="glass-effect rounded-xl p-6">
                 <h2 className="text-2xl font-bold mb-4 text-gray-100">{contract.title}</h2>
                <div className="bg-white rounded-lg p-6 max-h-[50vh] overflow-y-auto shadow-inner mb-6">
                    <div dangerouslySetInnerHTML={{ __html: formattedContent }} style={{ fontFamily: "'Times New Roman', serif", color: 'black' }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">Sua Assinatura</h3>
                 <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-48 rounded-lg cursor-crosshair bg-white" />
                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <button onClick={clearCanvas} className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg">Limpar</button>
                    <button onClick={handleSubmitSignature} disabled={loading} className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50">
                        {loading ? "Aguarde..." : "Confirmar e Assinar Contrato"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;