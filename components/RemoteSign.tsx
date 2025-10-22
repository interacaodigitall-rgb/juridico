import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSignatureRequest, updateSignature } from '../services/contractService';
import { SignatureRequest } from '../types';
import { contractTemplates } from '../constants';
import LoadingSpinner from './LoadingSpinner';

const RemoteSign: React.FC = () => {
    const [request, setRequest] = useState<SignatureRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [signerToSign, setSignerToSign] = useState<string | null>(null);
    const [isSigned, setIsSigned] = useState(false);
    
    const hash = window.location.hash.substring(1);
    const hashSearchParams = new URLSearchParams(hash.startsWith('?') ? hash.substring(1) : hash);
    const requestId = hashSearchParams.get('sign');

    useEffect(() => {
        if (!requestId) {
            setError('Link de assinatura inválido ou em falta.');
            setLoading(false);
            return;
        }

        getSignatureRequest(requestId)
            .then(data => {
                if (!data) {
                    setError('Pedido de assinatura não encontrado, inválido ou expirado.');
                } else {
                    setRequest(data);
                    // Find the next person to sign
                    const nextSigner = data.signers.find(s => !data.signatures[s]);
                    setSignerToSign(nextSigner || null);
                    if(!nextSigner) {
                        setError('Este contrato já foi assinado por todas as partes.');
                    }
                }
            })
            .catch(() => setError('Ocorreu um erro ao carregar o pedido de assinatura.'))
            .finally(() => setLoading(false));
    }, [requestId]);

    // Contract Preview Logic
    let previewContent = '';
    if (request) {
        const template = contractTemplates[request.contractType];
        previewContent = template.template;
        Object.entries(request.formData).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            previewContent = previewContent.replace(regex, value ? String(value) : `[${key}]`);
        });
    }
    const formattedContent = previewContent.replace(/\n/g, '<br />');

    // Canvas Logic
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    
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
        if (request && !error) {
            const timer = setTimeout(calibrateCanvas, 50);
            window.addEventListener('resize', calibrateCanvas);

            return () => {
                window.removeEventListener('resize', calibrateCanvas);
                clearTimeout(timer);
            };
        }
    }, [request, error, calibrateCanvas]);

    const getCoords = (e: MouseEvent | TouchEvent): { x: number, y: number } | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const event = 'touches' in e ? e.touches[0] : e;
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const coords = getCoords(e.nativeEvent);
        if (!coords) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;
        const coords = getCoords(e.nativeEvent);
        if (!coords) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    };

    const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        setIsDrawing(false);
    };

    const handleSubmitSignature = async () => {
        if (!requestId || !signerToSign || !canvasRef.current) return;
        setLoading(true);
        const dataURL = canvasRef.current.toDataURL('image/png');
        try {
            await updateSignature(requestId, signerToSign, dataURL);
            setIsSigned(true);
        } catch (e) {
            setError('Não foi possível enviar a sua assinatura. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };


    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return (
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen flex flex-col justify-center items-center text-white p-4 text-center">
                <div className="text-5xl mb-4">🚫</div>
                <h1 className="text-3xl font-bold text-red-400 mb-2">Erro</h1>
                <p className="text-lg text-gray-300 max-w-md">{error}</p>
            </div>
        );
    }
    
    if (isSigned) {
        return (
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen flex flex-col justify-center items-center text-white p-4 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h1 className="text-3xl font-bold text-green-400 mb-2">Obrigado!</h1>
                <p className="text-lg text-gray-300">A sua assinatura foi enviada com sucesso. Já pode fechar esta página.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 h-screen text-gray-200 font-sans flex flex-col p-2 sm:p-4 overflow-hidden">
            <div className="text-center mb-4 flex-shrink-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">
                    Assinatura de Documento
                </h1>
                <p className="text-gray-400">
                    Olá, <span className="font-bold">{request?.formData[signerToSign || '']}</span>. Por favor, reveja e assine.
                </p>
            </div>

            <div className="flex-grow flex flex-col md:flex-row gap-4 min-h-0">
                {/* Painel de Pré-visualização */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col md:w-1/2 overflow-hidden">
                    <h2 className="text-xl font-bold mb-2 text-gray-100 flex-shrink-0">{request ? contractTemplates[request.contractType].title : ''}</h2>
                    <div className="bg-white rounded-lg p-4 h-full overflow-y-auto shadow-inner">
                        <div 
                            className="text-black"
                            style={{ fontFamily: "'Times New Roman', serif", lineHeight: 1.6, fontSize: '12px', textAlign: 'justify' }}
                            dangerouslySetInnerHTML={{ __html: formattedContent }}
                        />
                    </div>
                </div>
                
                {/* Painel de Assinatura */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col md:w-1/2">
                    <h3 className="text-lg font-bold text-white mb-2 text-center flex-shrink-0">Sua Assinatura</h3>
                    <div className="flex-grow w-full h-full min-h-[150px]">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full h-full rounded-lg cursor-crosshair bg-white touch-none"
                        />
                    </div>
                    <div className="mt-4 flex flex-col sm:flex-row gap-2 flex-shrink-0">
                        <button onClick={clearCanvas} className="w-full sm:w-auto px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all duration-300">Limpar</button>
                        <button onClick={handleSubmitSignature} className="w-full sm:w-auto flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all duration-300">Confirmar e Enviar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RemoteSign;