import { jsPDF } from 'jspdf';
import { SavedContract, ContractTemplate, FormData, Signatures, ContractType, SignatureRequest } from '../types';
import { empresaData } from '../constants';
import { firestore } from '../firebase';


declare global {
    interface Window {
        jspdf: {
            jsPDF: typeof jsPDF;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            GState: any; 
        };
    }
}

// Declara o objeto global do Firebase para que o TypeScript o reconheça
declare const firebase: any;

// --- Firestore Service ---

export const loadContracts = async (userId: string): Promise<SavedContract[]> => {
    try {
        const contractsRef = firestore.collection('users').doc(userId).collection('contracts');
        const snapshot = await contractsRef.orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SavedContract));
    } catch (error) {
        console.error('Error loading contracts from Firestore:', error);
        alert('Falha ao carregar contratos. Verifique a sua ligação à Internet.');
        return [];
    }
};

export const saveContract = async (userId: string, contractData: Omit<SavedContract, 'id'>): Promise<string> => {
    try {
        const contractsRef = firestore.collection('users').doc(userId).collection('contracts');
        const docRef = await contractsRef.add(contractData);
        return docRef.id;
    } catch (error) {
        console.error('Error saving contract to Firestore:', error);
        throw new Error('Falha ao guardar o contrato na nuvem.');
    }
};

export const deleteContract = async (userId: string, contractId: string): Promise<void> => {
    try {
        const contractRef = firestore.collection('users').doc(userId).collection('contracts').doc(contractId);
        await contractRef.delete();
    } catch (error) {
        console.error('Error deleting contract from Firestore:', error);
        throw new Error('Falha ao apagar o contrato.');
    }
};


// --- PDF Generation Service ---

export const generateFinalPDF = async (template: ContractTemplate, formData: FormData, signatures: Signatures, contractType: ContractType): Promise<{ pdfBlob: Blob, pdfDataUri: string }> => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error('jsPDF library not loaded. Please check your internet connection and refresh.');
    }

    const { jsPDF } = window.jspdf;
    
    const allData = { ...formData };
    
    let rawContent = template.template;

    if (contractType === 'aluguer' && formData.MODALIDADE_50_50 === 'true') {
        const fixedRentClause = `O Segundo Contraente obriga-se a pagar à Primeira Contraente uma renda semanal mínima de {{VALOR_RENDA}} €, liquidada antecipadamente, até à segunda-feira de cada semana. O valor inclui utilização da viatura devidamente licenciada, seguro automóvel obrigatório, seguro de acidentes pessoais e manutenção periódica. O atraso superior a 3 dias úteis no pagamento confere à Primeira Contraente o direito de suspender o contrato e recolher de imediato a viatura.`;
        const fiftyFiftyClause = `A remuneração será partilhada em regime de 50/50% da faturação líquida semanal, após a dedução de todas as taxas das plataformas (Uber, Bolt, etc.) e impostos aplicáveis. As despesas de combustível, portagens e limpeza da viatura são da responsabilidade do Segundo Contraente. Os pagamentos serão efetuados semanalmente por transferência bancária, acompanhados de um extrato detalhado da faturação.`;
        rawContent = rawContent.replace(fixedRentClause, fiftyFiftyClause);
    }
    
    Object.entries(allData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
         if (contractType === 'aluguer' && formData.MODALIDADE_50_50 === 'true' && key === 'VALOR_RENDA') return;
        rawContent = rawContent.replace(regex, value || `[${key}]`);
    });

    const contentLines = rawContent.split('\n');
    const title = contentLines.find(line => line.trim() !== '') || template.title;
    const body = contentLines.slice(contentLines.indexOf(title) + 1).join('\n');

    // Define rendering configurations to try, with a special compact version for 'uber'.
    let renderConfigs;
    if (contractType === 'uber') {
        renderConfigs = [
             { id: 'uber-special', fontSize: 9.8, lineHeight: 4.8, margin: 20, yStart: 25 },
        ];
    } else {
        renderConfigs = [
            { id: 'default', fontSize: 12, lineHeight: 6, margin: 15, yStart: 30 },
            { id: 'compact', fontSize: 11.5, lineHeight: 5.8, margin: 15, yStart: 28 },
            { id: 'extra-compact', fontSize: 11, lineHeight: 5.5, margin: 12, yStart: 25 },
            { id: 'super-compact', fontSize: 10.5, lineHeight: 5.3, margin: 12, yStart: 25 }
        ];
    }

    let finalDoc: jsPDF | null = null;
    let finalConfig = renderConfigs[0];
    let finalY = 0;

    // Signature block dimensions, adjusted for Uber contract to be more compact.
    const signatureWidth = 55;
    const signatureHeight = 22;
    const singleSignatureHeight = contractType === 'uber' ? 36 : 40; 
    const signatureBlockHeight = (template.signatures.length * singleSignatureHeight);

    // Find the best config that fits the signatures on the last content page
    for (const config of renderConfigs) {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - (config.margin * 2);
        let y = config.yStart;

        doc.setFont('times', 'bold');
        doc.setFontSize(config.fontSize + 2);
        const titleLines = doc.splitTextToSize(title, contentWidth);
        doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
        y += (titleLines.length * (config.lineHeight + 1)) + 10;

        doc.setFont('times', 'normal');
        doc.setFontSize(config.fontSize);
        const bodyLines = doc.splitTextToSize(body, contentWidth);
        
        bodyLines.forEach((line: string) => {
            if (y > pageHeight - config.margin - 10) { 
                doc.addPage();
                y = config.yStart;
            }
            doc.text(line, config.margin, y);
            y += config.lineHeight;
        });

        const availableSpace = pageHeight - y - config.margin;
        if (signatureBlockHeight <= availableSpace) {
            finalDoc = doc;
            finalConfig = config;
            finalY = y;
            break; 
        }
    }
    
    // If no config worked, use the most compact one and let it flow to the next page if needed
    if (!finalDoc) {
        finalConfig = renderConfigs[renderConfigs.length - 1];
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - (finalConfig.margin * 2);
        let y = finalConfig.yStart;

        doc.setFont('times', 'bold');
        doc.setFontSize(finalConfig.fontSize + 2);
        const titleLines = doc.splitTextToSize(title, contentWidth);
        doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
        y += (titleLines.length * (finalConfig.lineHeight + 1)) + 10;

        doc.setFont('times', 'normal');
        doc.setFontSize(finalConfig.fontSize);
        const bodyLines = doc.splitTextToSize(body, contentWidth);
        
        bodyLines.forEach((line: string) => {
            if (y > pageHeight - finalConfig.margin - 10) {
                doc.addPage();
                y = finalConfig.yStart;
            }
            doc.text(line, finalConfig.margin, y);
            y += finalConfig.lineHeight;
        });
        
        finalDoc = doc;
        finalY = y;
    }
    
    const doc = finalDoc;
    let y = finalY;
    const { margin } = finalConfig;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Define signature spacing variables, with compact values for the Uber contract.
    const spaceBeforeSignatures = contractType === 'uber' ? 12 : 15;
    const signerNameFontSize = contractType === 'uber' ? 8.5 : 9;
    const textLineHeightFactor = contractType === 'uber' ? 3.0 : 3.5;
    const spaceAfterSignature = contractType === 'uber' ? 7 : 10;
    
    y += spaceBeforeSignatures;

    template.signatures.forEach((signerName) => {
         if (y + singleSignatureHeight > pageHeight - margin) {
            doc.addPage();
            y = finalConfig.yStart; 
        }

        const signatureDataUrl = signatures[signerName];
        if (!signatureDataUrl) return;

        let signatureBlockText = '';
        doc.setFontSize(signerNameFontSize);
        doc.setFont('times', 'normal');

        if(signerName === 'NOME_PROPRIETARIO') {
            signatureBlockText = `Pelo Proprietário do Veículo:\n${allData.NOME_PROPRIETARIO}`;
        } else if (signerName === 'REPRESENTANTE_NOME') {
            if (contractType === 'comodato') {
                signatureBlockText = `Pelo Operador: ${allData.NOME_OPERADOR}\n(Representado por: ${allData.REPRESENTANTE_NOME})`;
            } else if (contractType === 'uber') {
                signatureBlockText = `Pelo Operador TVDE:\n${allData.REPRESENTANTE_NOME}`;
            } else { 
                signatureBlockText = `Pela Primeira Contraente:\n${allData.REPRESENTANTE_NOME}`;
            }
        } else if (signerName === 'NOME_MOTORISTA') {
            signatureBlockText = `Pelo Motorista:\n${allData.NOME_MOTORISTA}`;
        }
        
        const textLines = doc.splitTextToSize(signatureBlockText, pageWidth - (margin * 2));
        doc.text(textLines, pageWidth / 2, y, { align: 'center' });
        y += (textLines.length * textLineHeightFactor) + 2;

        const centeredSignatureX = (pageWidth - signatureWidth) / 2;
        try {
            doc.addImage(signatureDataUrl, 'PNG', centeredSignatureX, y, signatureWidth, signatureHeight);
        } catch (e) {
            console.warn('Error adding signature image:', e);
            doc.rect(centeredSignatureX, y, signatureWidth, signatureHeight);
            doc.text('Signature Error', centeredSignatureX + 5, y + 15);
        }
        y += signatureHeight + spaceAfterSignature;
    });

    const totalPages = (doc.internal as any).pages.length;
    const currentCompanyData = empresaData;

    // Add footers and watermark to all pages
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);

        // Company name on ALL pages, without page number
        const footerText = currentCompanyData.NOME_EMPRESA;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Stamp ONLY on multi-page documents and pages WITHOUT signatures (i.e., not the last page)
        if (totalPages > 1 && i < totalPages) {
            const stampText = `DOCUMENTO ASSINADO EM ${new Date().toLocaleDateString('pt-PT')}`;
            const stampY = pageHeight - 17; // Placed slightly above the footer text
            const textWidth = doc.getTextWidth(stampText);
            
            doc.setDrawColor(150, 150, 150);
            doc.roundedRect((pageWidth - textWidth) / 2 - 2, stampY - 4, textWidth + 4, 6, 2, 2, 'S');
            doc.text(stampText, pageWidth / 2, stampY, { align: 'center' });
        }
    }

    // Set back to the last page and reset color before outputting
    doc.setPage(totalPages);
    doc.setTextColor(0, 0, 0); 
    
    const pdfBlob = doc.output('blob');
    const pdfDataUri = doc.output('datauristring');
    
    const fileName = `${template.title.replace(/\s+/g, '_')}_${formData.DATA_ASSINATURA || new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    return { pdfBlob, pdfDataUri };
};

export const downloadPdf = (pdfDataUri: string, title: string, date: string) => {
    const link = document.createElement('a');
    link.href = pdfDataUri;
    link.download = `${title.replace(/\s+/g, '_')}_${date}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


// --- Signature Request Service ---

export const createSignatureRequest = async (userId: string, contractType: ContractType, formData: FormData, signers: string[]): Promise<string> => {
    try {
        const signatureRequestsRef = firestore.collection('signatureRequests');
        // FIX: Use the global firebase object directly to ensure access to firestore static properties
        const createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const expiresAt = firebase.firestore.Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000); // 48 hours expiration

        const newRequest = {
            userId,
            contractType,
            formData,
            signatures: {},
            signers,
            status: 'pending',
            createdAt,
            expiresAt,
        };

        const docRef = await signatureRequestsRef.add(newRequest);
        return docRef.id;
    } catch (error) {
        console.error('Error creating signature request:', error);
        throw new Error('Falha ao criar o pedido de assinatura remota.');
    }
};

export const getSignatureRequest = async (id: string): Promise<SignatureRequest | null> => {
    try {
        const docRef = firestore.collection('signatureRequests').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return null;
        }
        const data = doc.data();
        // Check for expiration
        if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
             console.warn('Signature request has expired');
             await docRef.delete();
             return null;
        }
        return { id: doc.id, ...data } as SignatureRequest;
    } catch (error) {
        console.error('Error getting signature request:', error);
        return null;
    }
};

export const updateSignature = async (id: string, signerName: string, signatureDataUrl: string): Promise<void> => {
    try {
        const docRef = firestore.collection('signatureRequests').doc(id);
        await docRef.update({
            [`signatures.${signerName}`]: signatureDataUrl
        });
    } catch (error) {
        console.error('Error updating signature:', error);
        throw new Error('Falha ao guardar a assinatura.');
    }
};

export const listenToSignatureRequest = (id: string, callback: (data: SignatureRequest | null) => void): (() => void) => {
    const docRef = firestore.collection('signatureRequests').doc(id);
    const unsubscribe = docRef.onSnapshot(
        (doc) => {
            if (doc.exists) {
                callback({ id: doc.id, ...doc.data() } as SignatureRequest);
            } else {
                callback(null);
            }
        },
        (error) => {
            console.error("Error listening to signature request:", error);
            callback(null);
        }
    );
    return unsubscribe;
};