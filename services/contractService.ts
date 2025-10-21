import { jsPDF } from 'jspdf';
import { SavedContract, ContractTemplate, FormData, Signatures, ContractType, SignatureRequest, ContractStatus } from '../types';
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

// --- Firestore Service (New Structure) ---

const contractsRef = firestore.collection('contracts');
const signatureRequestsRef = firestore.collection('signatureRequests');

export const loadContracts = async (uid: string, role: 'admin' | 'driver'): Promise<SavedContract[]> => {
    try {
        if (role === 'driver') {
            // Drivers only read from the new global collection, which is correct.
            const snapshot = await contractsRef.where('driverUid', '==', uid).orderBy('createdAt', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedContract));
        }

        // --- Admin Loading Logic (Backward Compatibility) ---
        // Admin loads from BOTH the new global collection and the old user-specific subcollection.

        // 1. Fetch from new global 'contracts' collection
        const newContractsPromise = contractsRef.where('adminUid', '==', uid).get();
        
        // 2. Fetch from old 'users/{uid}/contracts' subcollection
        const oldContractsRef = firestore.collection('users').doc(uid).collection('contracts');
        const oldContractsPromise = oldContractsRef.get();
        
        const [newSnapshot, oldSnapshot] = await Promise.all([newContractsPromise, oldContractsPromise]);
        
        const newContracts = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedContract));
        const oldContracts = oldSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedContract));

        // 3. Combine, sort, and return all contracts
        const allContracts = [...newContracts, ...oldContracts];
        allContracts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        // Basic deduplication by ID, just in case of any weird edge cases.
        return Array.from(new Map(allContracts.map(item => [item.id, item])).values());
        
    } catch (error) {
        console.error('Error loading contracts from Firestore:', error);
        alert('Falha ao carregar contratos. Verifique a sua ligação à Internet.');
        return [];
    }
};

export const saveContract = async (contractData: Omit<SavedContract, 'id'>): Promise<string> => {
    try {
        const docRef = await contractsRef.add(contractData);
        return docRef.id;
    } catch (error) {
        console.error('Error saving contract to Firestore:', error);
        throw new Error('Falha ao guardar o contrato na nuvem.');
    }
};

export const updateContractSignatures = async (contractId: string, signatures: Signatures, status: ContractStatus): Promise<void> => {
    try {
        await contractsRef.doc(contractId).update({
            signatures,
            status,
        });
    } catch (error) {
        console.error('Error updating contract signatures:', error);
        throw new Error('Falha ao atualizar as assinaturas do contrato.');
    }
};


export const deleteContract = async (contractId: string, adminUid: string): Promise<void> => {
    // To support deleting old contracts, we must try deleting from both locations.
    try {
        const newRef = firestore.collection('contracts').doc(contractId);
        const oldRef = firestore.collection('users').doc(adminUid).collection('contracts').doc(contractId);
        
        // Deleting a non-existent doc doesn't throw an error, so this is safe.
        // One of these will delete the document.
        await Promise.all([newRef.delete(), oldRef.delete()]);

    } catch (error) {
        console.error('Error deleting contract from Firestore:', error);
        throw new Error('Falha ao apagar o contrato.');
    }
};

// --- Signature Request Service ---

export const createSignatureRequest = async (
    adminUid: string, 
    contractType: ContractType, 
    formData: FormData, 
    signers: string[]
): Promise<string> => {
    try {
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48h expiration

        const newRequest = {
            userId: adminUid,
            contractType,
            formData,
            signers,
            signatures: {},
            status: 'pending' as const,
            createdAt: now,
            expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
        };
        const docRef = await signatureRequestsRef.add(newRequest);
        return docRef.id;
    } catch (error) {
        console.error('Error creating signature request:', error);
        throw new Error('Falha ao criar o pedido de assinatura remota.');
    }
};

export const listenToSignatureRequest = (
    requestId: string, 
    callback: (request: SignatureRequest | null) => void
): (() => void) => {
    return signatureRequestsRef.doc(requestId).onSnapshot(
        doc => {
            if (doc.exists) {
                const data = doc.data() as Omit<SignatureRequest, 'id'>;
                callback({ id: doc.id, ...data });
            } else {
                callback(null);
            }
        },
        error => {
            console.error('Error listening to signature request:', error);
            callback(null);
        }
    );
};

export const getSignatureRequest = async (requestId: string): Promise<SignatureRequest | null> => {
    try {
        const doc = await signatureRequestsRef.doc(requestId).get();
        if (!doc.exists) {
            console.log('No such signature request!');
            return null;
        }
        const request = { id: doc.id, ...doc.data() } as SignatureRequest;

        // Check for expiration
        if (request.expiresAt && request.expiresAt.toDate() < new Date()) {
            console.log('Signature request has expired.');
            return null;
        }

        return request;
    } catch (error) {
        console.error('Error getting signature request:', error);
        return null;
    }
};

export const updateSignature = async (
    requestId: string,
    signerName: string,
    signatureDataUrl: string
): Promise<void> => {
    try {
        const docRef = signatureRequestsRef.doc(requestId);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new Error("Signature request not found.");
        }

        const requestData = doc.data() as SignatureRequest;

        const updatedSignatures = {
            ...requestData.signatures,
            [signerName]: signatureDataUrl,
        };

        const updatePayload: { signatures: Signatures; status?: 'completed' } = {
            signatures: updatedSignatures,
        };

        const allSigners = requestData.signers;
        const allSigned = allSigners.every(signer => updatedSignatures[signer]);

        if (allSigned) {
            updatePayload.status = 'completed';
        }

        await docRef.update(updatePayload);

    } catch (error) {
        console.error('Error updating signature:', error);
        throw new Error('Falha ao atualizar a assinatura.');
    }
};


// --- PDF Generation Service (No changes needed here, but kept for completeness) ---

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

    const signatureWidth = 55;
    const signatureHeight = 22;
    const singleSignatureHeight = contractType === 'uber' ? 36 : 40; 
    const signatureBlockHeight = (template.signatures.length * singleSignatureHeight);

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

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);

        const footerText = currentCompanyData.NOME_EMPRESA;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

        if (totalPages > 1 && i < totalPages) {
            const stampText = `DOCUMENTO ASSINADO EM ${new Date().toLocaleDateString('pt-PT')}`;
            const stampY = pageHeight - 17;
            const textWidth = doc.getTextWidth(stampText);
            
            doc.setDrawColor(150, 150, 150);
            doc.roundedRect((pageWidth - textWidth) / 2 - 2, stampY - 4, textWidth + 4, 6, 2, 2, 'S');
            doc.text(stampText, pageWidth / 2, stampY, { align: 'center' });
        }
    }

    doc.setPage(totalPages);
    doc.setTextColor(0, 0, 0); 
    
    const pdfBlob = doc.output('blob');
    const pdfDataUri = doc.output('datauristring');
    
    const fileName = `${template.title.replace(/\s+/g, '_')}_${formData.DATA_ASSINATURA || new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    return { pdfBlob, pdfDataUri };
};