import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FormData, Signatures, ContractTemplate } from '../types';

interface SignContractProps {
    template: ContractTemplate;
    formData: FormData;
    onBack: () => void;
    onComplete: (signatures: Signatures) => void;
}

const SignContract: React.FC<SignContractProps> = ({ template, formData, onBack, onComplete }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [signatures, setSignatures] = useState<Signatures>({});
    const [currentSignerIndex, setCurrentSignerIndex] = useState(0);

    const signers = template.signatures;
    const allSignaturesCollected = currentSignerIndex >= signers.length;

    // Effect to prevent body scrolling while drawing on mobile.
    useEffect(() => {
        const originalStyle = document.body.style.overflow;
        if (isDrawing) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = originalStyle;
        }

        // Restore original style on cleanup
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [isDrawing]);

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

        const handleResize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            
            ctx.lineWidth = 2 * dpr; // Scale line width
            ctx.strokeStyle = '#000000';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            clearCanvas();
        };

        // Use ResizeObserver for robust canvas resizing
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(canvas);
        handleResize(); // Initial setup

        return () => {
            resizeObserver.disconnect();
        };
    }, [clearCanvas]);

    const getCoords = (e: MouseEvent | TouchEvent): { x: number, y: number } => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const event = 'touches' in e ? e.touches[0] : e;
        const dpr = window.devicePixelRatio || 1;
        // Scale coordinates to match canvas resolution
        return {
            x: (event.clientX - rect.left) * dpr,
            y: (event.clientY - rect.top) * dpr,
        };
    }
    
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const { x, y } = getCoords(e.nativeEvent);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;
        const { x, y } = getCoords(e.nativeEvent);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.closePath();
        setIsDrawing(false);
    };

    const saveSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const signerName = signers[currentSignerIndex];
        const dataURL = canvas.toDataURL('image/png');

        setSignatures(prev => ({ ...prev, [signerName]: dataURL }));
        setCurrentSignerIndex(prev => prev + 1);
        clearCanvas();
    };

    return (
        <div className="glass-effect rounded-xl p-8 fade-in">
            <h2 className="text-3xl font-bold mb-8 text-gray-100">Assinatura Digital</h2>
            <div className="grid lg:grid-cols-2 gap-8">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                    <h3 className="font-bold text-xl mb-4 text-gray-100">Área de Assinatura</h3>
                    {!allSignaturesCollected ? (
                        <>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Assinando como:</label>
                                <div className="text-lg font-semibold text-blue-400">{formData[signers[currentSignerIndex]] || signers[currentSignerIndex]}</div>
                            </div>
                            <canvas
                                ref={canvasRef}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                                className="w-full h-64 rounded-lg cursor-crosshair bg-white"
                            />
                            <div className="mt-4 flex space-x-3">
                                <button onClick={clearCanvas} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-300">Limpar</button>
                                <button onClick={saveSignature} className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all duration-300">Confirmar Assinatura</button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <svg className="w-16 h-16 text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <h4 className="text-xl font-bold text-green-400">Todas as assinaturas coletadas!</h4>
                            <p className="text-gray-300 mt-2">Pode gerar o documento final.</p>
                        </div>
                    )}
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                    <h3 className="font-bold text-xl mb-4 text-gray-100">Assinaturas Registradas</h3>
                    <div className="space-y-3">
                        {signers.map(signer => (
                            signatures[signer] ? (
                                <div key={signer} className="p-3 bg-green-900/50 border border-green-700 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold text-green-400">{formData[signer] || signer}</div>
                                        <img src={signatures[signer]} alt="Assinatura" className="h-8 bg-white rounded px-1" />
                                    </div>
                                </div>
                            ) : (
                                <div key={signer} className="p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400">
                                    Aguardando assinatura de: {formData[signer] || signer}
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-10 flex justify-between">
                <button onClick={onBack} className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    <span>Voltar</span>
                </button>
                <button 
                    onClick={() => onComplete(signatures)}
                    disabled={!allSignaturesCollected}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold flex items-center space-x-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <span>Gerar PDF Final</span>
                </button>
            </div>
        </div>
    );
};

export default SignContract;