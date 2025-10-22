
import { jsPDF } from 'jspdf';
import { SavedContract, ContractTemplate, FormData, Signatures, ContractType, SignatureRequest, ContractStatus, UserRole } from '../types';
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

/**
 * Erro personalizado para indicar que uma consulta do Firestore falhou devido a um índice em falta.
 * Contém o link direto para a criação do índice necessário.
 */
export class FirestoreIndexError extends Error {
    public readonly indexCreationLink: string;

    constructor(message: string, link: string) {
        super(message);
        this.name = 'FirestoreIndexError';
        this.indexCreationLink = link;
    }
}


// Declara o objeto global do Firebase para que o TypeScript o reconheça
declare const firebase: any;

// --- Firestore Service (Refactored for subcollection structure) ---

const signatureRequestsRef = firestore.collection('signatureRequests');

/**
 * Carrega os contratos para um determinado utilizador (admin ou motorista).
 * - Admins: Carrega os contratos da sua própria sub-coleção.
 * - Motoristas: Utiliza uma consulta de grupo de coleções para encontrar todos os contratos
 *   em que são participantes, independentemente de qual admin os criou.
 * @param uid O ID do utilizador autenticado.
 * @param role O papel do utilizador ('admin' ou 'driver').
 * @returns Uma promessa que resolve para uma lista de contratos.
 * @throws {FirestoreIndexError} se a consulta requerer um índice que não existe.
 */
export const loadContracts = async (uid: string, role: UserRole): Promise<SavedContract[]> => {
    try {
        // FIX: Changed type from `firebase.firestore.Query` to `any` to resolve "Cannot find namespace 'firebase'" error.
        let query: any;

        if (role === 'admin') {
            // Admin carrega apenas os contratos que criou (na sua sub-coleção)
            query = firestore.collection('users').doc(uid).collection('contracts');
        } else {
            // Motorista precisa de uma consulta de grupo para encontrar os seus contratos em todas as sub-coleções
            query = firestore.collectionGroup('contracts').where('participantUids', 'array-contains', uid);
        }
        
        const snapshot = await query.get();
        const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedContract));
        
        contracts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return contracts;

    } catch (error: any) {
         console.error(`Error loading contracts for UID ${uid} with role ${role}:`, error);

        if (error.code === 'failed-precondition' && error.message?.includes('https://console.firebase.google.com')) {
            const urlRegex = /(https?:\/\/[^\s]+)/;
            const match = error.message.match(urlRegex);
            const indexCreationLink = match?.[0]?.replace(/\\"/g, '') || '#';
            
            const userMessage = 'AÇÃO NECESSÁRIA: A base de dados precisa de uma otimização.\n\n' +
                    'Por favor, siga estes passos:\n' +
                    '1. Clique no link abaixo para abrir a consola do Firebase (abrirá num novo separador).\n' +
                    '2. Na página que abrir, clique no botão "Criar Índice".\n' +
                    '3. Aguarde 1-2 minutos para o índice ser ativado.\n' +
                    '4. Volte aqui e clique em "Tentar Novamente".';

            throw new FirestoreIndexError(userMessage, indexCreationLink);
        
        } else if (error.code === 'permission-denied') {
             throw new Error('Erro de permissão. Contacte o administrador para verificar as regras de segurança da base de dados.');
        } 
        
        throw new Error('Falha ao carregar os seus contratos. Verifique a sua ligação à Internet e tente novamente.');
    }
};

/**
 * Guarda um novo contrato na sub-coleção do administrador que o criou.
 * @param contractData Os dados do contrato a guardar.
 * @returns O ID do novo documento do contrato.
 */
export const saveContract = async (contractData: Omit<SavedContract, 'id'>): Promise<string> => {
    try {
        const docRef = await firestore
            .collection('users')
            .doc(contractData.adminUid)
            .collection('contracts')
            .add(contractData);
        return docRef.id;
    } catch (error) {
        console.error('Error saving contract to Firestore:', error);
        throw new Error('Falha ao guardar o contrato na nuvem.');
    }
};

/**
 * Atualiza as assinaturas e o estado de um contrato existente.
 * @param contractId O ID do contrato a ser atualizado.
 * @param adminUid O ID do admin que criou o contrato (para encontrar a sub-coleção correta).
 * @param signatures O objeto de assinaturas atualizado.
 * @param status O novo estado do contrato.
 */
export const updateContractSignatures = async (
    contractId: string,
    adminUid: string,
    signatures: Signatures,
    status: ContractStatus
): Promise<void> => {
    try {
        const contractRef = firestore
            .collection('users')
            .doc(adminUid)
            .collection('contracts')
            .doc(contractId);
        await contractRef.update({ signatures, status });
    } catch (error: any) {
        console.error('Error updating contract signatures:', error);
        if (error.code === 'permission-denied') {
            throw new Error("Permissão negada. Certifique-se de que tem permissão para assinar este contrato.");
        }
        throw new Error('Falha ao atualizar as assinaturas do contrato.');
    }
};

/**
 * Apaga um contrato da base de dados.
 * @param contractId O ID do contrato a ser apagado.
 * @param adminUid O ID do admin que criou o contrato.
 */
export const deleteContract = async (contractId: string, adminUid: string): Promise<void> => {
    try {
        const contractRef = firestore
            .collection('users')
            .doc(adminUid)
            .collection('contracts')
            .doc(contractId);
        await contractRef.delete();
    } catch (error) {
        console.error('Error deleting contract from Firestore:', error);
        throw new Error('Falha ao apagar o contrato.');
    }
};

// --- Signature Request Service (for remote signing link, logic remains similar) ---

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


// --- PDF Generation Service (Refactored for better layout) ---

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

    // Use a single, consistent config for readability
    const config = contractType === 'uber' 
        ? { fontSize: 9.8, lineHeight: 4.8, margin: 20, yStart: 25 }
        : { fontSize: 11, lineHeight: 5.5, margin: 20, yStart: 25 };

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (config.margin * 2);
    let y = config.yStart;

    // Render Title
    doc.setFont('times', 'bold');
    doc.setFontSize(config.fontSize + 2);
    const titleLines = doc.splitTextToSize(title, contentWidth);
    doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
    y += (titleLines.length * (config.lineHeight + 1)) + 10;

    // Render Body
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

    // --- Reworked Signature Placement Logic ---

    const signatureWidth = 70;
    const signatureHeight = 35;
    // Estimate a generous, consistent height for each signature block (image + text)
    const singleSignatureBlockHeight = 60; 
    const totalSignaturesHeight = template.signatures.length * singleSignatureBlockHeight;
    const spaceBeforeSignatures = 15;

    // Check if the entire signature block fits on the current page. If not, add a new page.
    if (y + spaceBeforeSignatures + totalSignaturesHeight > pageHeight - config.margin) {
        doc.addPage();
        y = config.yStart; // Reset y for the new page
    }
    
    y += spaceBeforeSignatures;

    // Render signatures
    const signerNameFontSize = contractType === 'uber' ? 8.5 : 9;
    const textLineHeightFactor = contractType === 'uber' ? 3.0 : 3.5;
    const spaceAfterSignature = contractType === 'uber' ? 7 : 10;

    template.signatures.forEach((signerName) => {
        const signatureDataUrl = signatures[signerName];
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
        
        const centeredSignatureX = (pageWidth - signatureWidth) / 2;
        if (signatureDataUrl) {
            try {
                // The signature image is placed first
                doc.addImage(signatureDataUrl, 'PNG', centeredSignatureX, y, signatureWidth, signatureHeight);
                // The text is placed below the image
                const textY = y + signatureHeight + 5; 
                const textLines = doc.splitTextToSize(signatureBlockText, pageWidth - (config.margin * 2));
                doc.text(textLines, pageWidth / 2, textY, { align: 'center' });
                y = textY + (textLines.length * textLineHeightFactor) + spaceAfterSignature;

            } catch (e) {
                console.warn('Error adding signature image:', e);
                doc.rect(centeredSignatureX, y, signatureWidth, signatureHeight);
                doc.text('Signature Error', centeredSignatureX + 5, y + 15);
                y += singleSignatureBlockHeight;
            }
        } else {
             // If no signature, just draw the text block and advance y
             const textLines = doc.splitTextToSize(signatureBlockText, pageWidth - (config.margin * 2));
             const placeholderY = y + signatureHeight / 2; // Center text in placeholder area
             doc.text(textLines, pageWidth / 2, placeholderY, { align: 'center' });
             y += singleSignatureBlockHeight;
        }
    });

    // --- Footer and Page Numbering Logic ---
    const totalPages = (doc.internal as any).pages.length;
    const currentCompanyData = empresaData;

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);

        const footerText = `${currentCompanyData.NOME_EMPRESA} | Página ${i} de ${totalPages}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    doc.setPage(totalPages);
    doc.setTextColor(0, 0, 0); 
    
    const pdfBlob = doc.output('blob');
    const pdfDataUri = doc.output('datauristring');
    
    const fileName = `${template.title.replace(/\s+/g, '_')}_${formData.DATA_ASSINatura || new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    return { pdfBlob, pdfDataUri };
};
