import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FormData, Signatures, ContractTemplate, ContractType } from '../types';
import { createSignatureRequest, listenToSignatureRequest } from '../services/contractService';
import { auth } from '../firebase';

interface SignContractProps {
    template: ContractTemplate;
    formData: FormData;
    contractType: ContractType;
    onBack: () => void;
    onFinalize: (signatures: Signatures, driverEmail: string, action: 'send' | 'finalize') => void;
}

type FinalizeAction = 'send' | 'finalize';

const SignContract: React.FC<SignContractProps> = ({ template, formData, contractType, onBack, onFinalize }) => {
    const [signatures, setSignatures] = useState<Signatures>({});
    const [signatureRequestId, setSignatureRequestId] = useState<string | null>(null);

    const [isLocalSignModalOpen, setIsLocalSignModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    
    // State for the new email modal
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [driverEmail, setDriverEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [finalizeAction, setFinalizeAction] = useState<FinalizeAction | null>(null);
    
    const [currentSigner, setCurrentSigner] = useState<string | null>(null);
    const [linkToCopy, setLinkToCopy] = useState('');
    const [copied, setCopied] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const signers = template.signatures;
    const allLocalSignaturesCollected = Object.keys(signatures).length >= signers.length;

    useEffect(() => {
        if (!signatureRequestId) return;
        const unsubscribe = listenToSignatureRequest(signatureRequestId, (request) => {
            if (request && request.signatures) {
                setSignatures(prev => ({ ...prev, ...request.signatures }));
            }
        });
        return () => unsubscribe();
    }, [signatureRequestId]);

    // --- New Email Modal Logic ---
    const handleOpenEmailModal = (action: FinalizeAction) => {
        setFinalizeAction(action);
        setIsEmailModalOpen(true);
    };

    const handleConfirmEmail = () => {
        if (!driverEmail || !/\S+@\S+\.\S+/.test(driverEmail)) {
            setEmailError('Por favor, insira um e-mail válido.');
            return;
        }
        setEmailError('');
        setIsEmailModalOpen(false);
        if (finalizeAction) {
            onFinalize(signatures, driverEmail, finalizeAction);
        }
    };
    
    // --- Remote Link Logic ---
    const handleGenerateRemoteLink = async () => {
        if (!auth.currentUser) {
            alert("Erro: Utilizador não autenticado.");
            return;
        }
        try {
            const requestId = await createSignatureRequest(auth.currentUser.uid, contractType, formData, signers);
            setSignatureRequestId(requestId);
            const url = `${window.location.origin}${window.location.pathname}?sign=${requestId}`;
            setLinkToCopy(url);
            setIsLinkModalOpen(true);
        } catch (error) {
            alert(`Falha ao gerar o link: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(linkToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // --- Local Signature Logic ---
    const handleOpenLocalSignModal = (signerName: string) => {
        setCurrentSigner(signerName);
        setIsLocalSignModalOpen(true);
    };

    const handleSaveLocalSignature = () => {
        if (!canvasRef.current || !currentSigner) return;
        const dataURL = canvasRef.current.toDataURL('image/png');
        setSignatures(prev => ({ ...prev, [currentSigner]: dataURL }));
        setIsLocalSignModalOpen(false);
        setCurrentSigner(null);
    };

    useEffect(() => {
        const originalStyle = document.body.style.overflow;
        if (isLocalSignModalOpen || isLinkModalOpen || isEmailModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = originalStyle;
        }
        return () => { document.body.style.overflow = originalStyle; };
    }, [isLocalSignModalOpen, isLinkModalOpen, isEmailModalOpen]);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    useEffect(() => {
        if (!isLocalSignModalOpen || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const timer = setTimeout(() => {
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
        }, 50);

        return () => clearTimeout(timer);
    }, [isLocalSignModalOpen]);

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
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const coords = getCoords(e.nativeEvent);
        if (!coords) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    };

    const stopDrawing = () => { setIsDrawing(false); };

    // --- Modals ---
    const LocalSignatureModal = (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl w-full max-w-3xl h-full max-h-[90vh] p-4 sm:p-6 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-white">Área de Assinatura</h3>
                    <p className="text-gray-400">Assinando como: <span className="font-semibold text-blue-400">{formData[currentSigner || ''] || currentSigner}</span></p>
                </div>
                <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} className="w-full h-full rounded-lg cursor-crosshair bg-white flex-grow" />
                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setIsLocalSignModalOpen(false)} className="w-full sm:w-auto px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold">Cancelar</button>
                    <button onClick={clearCanvas} className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold">Limpar</button>
                    <button onClick={handleSaveLocalSignature} className="w-full sm:w-auto flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">Confirmar Assinatura</button>
                </div>
            </div>
        </div>
    );
    
    const LinkModal = (
         <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl w-full max-w-lg p-6 text-center">
                 <h3 className="text-2xl font-bold text-white mb-4">Link para Assinatura Remota</h3>
                 <p className="text-gray-300 mb-6">Envie este link para as outras partes assinarem o documento. O link é válido por 48 horas.</p>
                 <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 break-words text-left mb-6">
                    <code className="text-blue-400">{linkToCopy}</code>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={() => setIsLinkModalOpen(false)} className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold">Fechar</button>
                    <button onClick={handleCopyLink} className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">{copied ? 'Copiado!' : 'Copiar Link'}</button>
                 </div>
            </div>
        </div>
    );
    
    const EmailModal = (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl w-full max-w-md p-6">
                <h3 className="text-2xl font-bold text-white mb-4">Atribuir Contrato ao Motorista</h3>
                <p className="text-gray-300 mb-6">Insira o e-mail do motorista para associar este contrato à sua conta no portal.</p>
                <div>
                    <label htmlFor="driver-email" className="block text-sm font-semibold text-gray-300 mb-2">
                        E-mail do Motorista
                    </label>
                    <input
                        type="email"
                        id="driver-email"
                        value={driverEmail}
                        onChange={(e) => setDriverEmail(e.target.value)}
                        required
                        className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-gray-100 focus:outline-none focus:ring-2 transition-all duration-300 ${emailError ? 'border-red-500 ring-red-500' : 'border-gray-600 focus:ring-blue-500'}`}
                        placeholder="email.motorista@exemplo.com"
                    />
                    {emailError && <p className="text-red-400 text-sm mt-2">{emailError}</p>}
                </div>
                <div className="mt-6 flex gap-4">
                    <button onClick={() => setIsEmailModalOpen(false)} className="w-full px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold">Cancelar</button>
                    <button onClick={handleConfirmEmail} className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">Confirmar</button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {isLocalSignModalOpen && LocalSignatureModal}
            {isLinkModalOpen && LinkModal}
            {isEmailModalOpen && EmailModal}

            <div className="glass-effect rounded-xl p-8 fade-in">
                <h2 className="text-3xl font-bold mb-2 text-gray-100">Assinatura Digital</h2>
                <p className="text-gray-400 mb-8">Recolha as assinaturas localmente ou envie um link para assinatura remota.</p>

                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="font-bold text-xl text-gray-100">Assinatura Remota</h3>
                            <p className="text-gray-400 text-sm mt-1">Gere um link único para enviar aos signatários.</p>
                        </div>
                        <button onClick={handleGenerateRemoteLink} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 w-full sm:w-auto">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                            <span>Gerar Link Remoto</span>
                        </button>
                    </div>
                     {signatureRequestId && (
                        <p className="text-xs text-green-400 mt-4 text-center sm:text-left">Modo de assinatura remota ativo. As assinaturas recebidas através do link aparecerão automaticamente.</p>
                     )}
                </div>

                <div>
                    <h3 className="font-bold text-xl mb-4 text-gray-100">Painel de Assinaturas</h3>
                    <div className="space-y-4">
                        {signers.map(signer => (
                            <div key={signer} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <span className="font-semibold text-gray-200">{formData[signer] || signer}</span>
                                {signatures[signer] ? (
                                    <div className="bg-white rounded p-2">
                                        <img src={signatures[signer]} alt={`Assinatura de ${signer}`} className="h-10" />
                                    </div>
                                ) : (
                                    <button onClick={() => handleOpenLocalSignModal(signer)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-300 text-sm flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
                                        <span>Assinar Agora</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-10 flex flex-col sm:flex-row justify-between gap-4">
                    <button onClick={onBack} className="w-full sm:w-auto px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold">Voltar</button>
                    <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4">
                        <button onClick={() => handleOpenEmailModal('send')} className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all duration-300">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                            <span>Enviar para Portal</span>
                        </button>
                         <button onClick={() => handleOpenEmailModal('finalize')} disabled={!allLocalSignaturesCollected} className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            <span>Gerar PDF Final</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SignContract;