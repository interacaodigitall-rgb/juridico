
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

// Declara o objeto global do Firebase para que o TypeScript o reconheça
declare const firebase: any;

// --- Firestore Service (Refactored for a single, top-level collection model) ---

/**
 * Carrega contratos do Firestore. Para admins, carrega de ambas as localizações (nova e antiga)
 * para garantir retrocompatibilidade. Para motoristas, carrega apenas da nova estrutura.
 * @param uid O ID do utilizador autenticado.
 * @param role O papel do utilizador ('admin' ou 'driver').
 * @returns Uma promessa que resolve para uma lista de contratos.
 */
export const loadContracts = async (uid: string, role: UserRole): Promise<SavedContract[]> => {
    try {
        // Promessa para novos contratos da coleção principal 'contracts'
        const newContractsPromise = firestore.collection('contracts')
            .where('participantUids', 'array-contains', uid)
            .get();

        let allContracts: SavedContract[] = [];

        // Para administradores, também obtém contratos antigos da sua subcoleção de utilizador
        // para garantir retrocompatibilidade durante a transição de dados.
        if (role === 'admin') {
            console.log("Admin detectado, a obter também os contratos antigos...");
            const legacyContractsPromise = firestore.collection('users').doc(uid).collection('contracts').get();
            
            // Aguarda que ambas as consultas terminem
            const [newSnapshot, legacySnapshot] = await Promise.all([newContractsPromise, legacyContractsPromise]);
            
            const newContracts = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedContract));
            const legacyContracts = legacySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedContract));
            console.log(`Encontrados ${newContracts.length} contratos novos e ${legacyContracts.length} contratos antigos.`);

            // Junta e remove duplicados, dando preferência ao novo formato se houver um conflito de ID.
            const contractMap = new Map<string, SavedContract>();
            legacyContracts.forEach(c => contractMap.set(c.id, c));
            newContracts.forEach(c => contractMap.set(c.id, c)); // Os novos sobrepõem os antigos se os IDs corresponderem
            allContracts = Array.from(contractMap.values());

        } else { // Para motoristas, obtém apenas da nova e mais eficiente estrutura de coleção.
            const newSnapshot = await newContractsPromise;
            allContracts = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedContract));
        }
        
        // Ordena todos os contratos por data de criação, de forma descendente.
        allContracts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        console.log(`Total de contratos carregados: ${allContracts.length}`);
        return allContracts;

    } catch (error: any) {
        console.error(`Erro ao carregar contratos para o UID ${uid} com papel ${role}:`, error.message);
        if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
            throw new Error('Permissões ausentes ou insuficientes para carregar os contratos. Verifique as regras de segurança do Firestore.');
        }
        throw new Error('Falha ao carregar contratos. Verifique a sua ligação à Internet e tente novamente.');
    }
};

/**
 * Guarda um novo contrato na coleção principal 'contracts'.
 * @param contractData Os dados do contrato a guardar.
 * @returns O ID do novo contrato.
 */
export const saveContract = async (contractData: Omit<SavedContract, 'id'>): Promise<string> => {
    try {
        const newContractRef = await firestore.collection('contracts').add(contractData);
        return newContractRef.id;
    } catch (error) {
        console.error('Error saving contract:', error);
        throw new Error('Falha ao guardar o contrato na nuvem.');
    }
};


/**
 * Atualiza as assinaturas e o estado de um único documento de contrato.
 * @param contractId O ID do contrato a ser atualizado.
 * @param signatures O objeto de assinaturas atualizado.
 * @param status O novo estado do contrato.
 */
export const updateContractSignatures = async (
    contractId: string,
    signatures: Signatures,
    status: ContractStatus
): Promise<void> => {
    try {
        const contractRef = firestore.collection('contracts').doc(contractId);
        await contractRef.update({ signatures, status });

    } catch (error: any) {
        console.error('Error updating contract signatures:', error);
        if (error.code === 'permission-denied') {
            throw new Error("Permissão negada. Certifique-se de que tem permissão para assinar este contrato.");
        }
        throw new Error('Falha ao atualizar as assinaturas do contrato.');
    }
};


// --- Signature Request Service (for remote signing link, logic remains similar) ---
// FIX: Convertido para uma função para evitar erros de inicialização.
// A referência é agora obtida de forma "preguiçosa", garantindo que `firestore` não seja nulo.
const signatureRequestsRef = () => firestore.collection('signatureRequests');


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
        const docRef = await signatureRequestsRef().add(newRequest);
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
    return signatureRequestsRef().doc(requestId).onSnapshot(
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
        const doc = await signatureRequestsRef().doc(requestId).get();
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
        const docRef = signatureRequestsRef().doc(requestId);
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


// --- PDF Generation Service (Refactored for better layout and reliable download) ---

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

    if (contractType === 'prestacao') {
        const fixedFeeClauseText = `CLÁUSULA QUINTA (Remuneração)
A remuneração do Motorista terá como referência a facturação líquida efectivamente obtida com os serviços prestados, deduzidas as taxas das plataformas, impostos aplicáveis e a taxa de utilização da viatura e gestão de frota fixada em {{VALOR_TAXA}} €/semana. Combustível, portagens e limpeza são encargos do Motorista.`;
        const percentageClauseText = `CLÁUSULA QUINTA (Remuneração)
A remuneração do Motorista terá como referência a facturação líquida depositada pelas plataformas eletrónicas (Uber, Bolt, etc.) na conta da Primeira Contraente. Sobre este valor incidirá uma taxa de serviço de 4% (quatro por cento) e IVA à taxa legal de 6% (seis por cento), totalizando 10% (dez por cento) que serão retidos pela Primeira Contraente. Combustível, portagens e limpeza são encargos do Motorista.`;

        const remunerationClause = formData.MODALIDADE_PERCENTAGEM === 'true' ? percentageClauseText : fixedFeeClauseText;
        rawContent = rawContent.replace('{{CLAUSULA_QUINTA_REMUNERACAO}}', remunerationClause);
    }
    
    Object.entries(allData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
         if (contractType === 'aluguer' && formData.MODALIDADE_50_50 === 'true' && key === 'VALOR_RENDA') return;
         if (contractType === 'prestacao' && formData.MODALIDADE_PERCENTAGEM === 'true' && key === 'VALOR_TAXA') return;
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
    const signatureWidth = 60;
    const signatureHeight = 20;
    const spaceBeforeSignatures = 10;
    const signerNameFontSize = contractType === 'uber' ? 8 : 8.5;
    const textLineHeightFactor = contractType === 'uber' ? 3.0 : 3.5;
    const spaceAfterSignature = contractType === 'uber' ? 5 : 7;
    const spaceBetweenImageAndText = 2;

    // --- Dynamic Height Calculation ---
    let calculatedTotalSignaturesHeight = 0;
    doc.setFontSize(signerNameFontSize);
    doc.setFont('times', 'normal');

    const getSignatureBlockText = (signerName: string): string => {
        if (signerName === 'NOME_PROPRIETARIO') {
            return `Pelo Proprietário do Veículo:\n${allData.NOME_PROPRIETARIO}`;
        }
        if (signerName === 'REPRESENTANTE_NOME') {
            if (contractType === 'comodato') {
                return `Pelo Operador: ${allData.NOME_OPERADOR}\n(Representado por: ${allData.REPRESENTANTE_NOME})`;
            }
            if (contractType === 'uber') {
                return `Pelo Operador TVDE:\n${allData.REPRESENTANTE_NOME}`;
            }
            return `Pela Primeira Contraente:\n${allData.REPRESENTANTE_NOME}`;
        }
        if (signerName === 'NOME_MOTORISTA') {
            return `Pelo Motorista:\n${allData.NOME_MOTORISTA}`;
        }
        return '';
    };

    template.signatures.forEach((signerName) => {
        const signatureBlockText = getSignatureBlockText(signerName);
        const textLines = doc.splitTextToSize(signatureBlockText, pageWidth - (config.margin * 2));
        const textHeight = textLines.length * textLineHeightFactor;
        
        const singleBlockHeight = signatureHeight + spaceBetweenImageAndText + textHeight + spaceAfterSignature;
        calculatedTotalSignaturesHeight += singleBlockHeight;
    });

    // --- Page Break Decision ---
    if (y + spaceBeforeSignatures + calculatedTotalSignaturesHeight > pageHeight - config.margin) {
        doc.addPage();
        y = config.yStart; // Reset y for the new page
    }
    
    y += spaceBeforeSignatures;

    // --- Render Signatures ---
    template.signatures.forEach((signerName) => {
        const signatureDataUrl = signatures[signerName];
        const signatureBlockText = getSignatureBlockText(signerName);
        const textLines = doc.splitTextToSize(signatureBlockText, pageWidth - (config.margin * 2));
        
        const centeredSignatureX = (pageWidth - signatureWidth) / 2;
        const textY = y + signatureHeight + spaceBetweenImageAndText;
        
        doc.setFontSize(signerNameFontSize);
        doc.setFont('times', 'normal');
        
        if (signatureDataUrl) {
            try {
                doc.addImage(signatureDataUrl, 'PNG', centeredSignatureX, y, signatureWidth, signatureHeight);
            } catch (e) {
                console.warn('Error adding signature image, drawing placeholder:', e);
                doc.rect(centeredSignatureX, y, signatureWidth, signatureHeight, 'S');
                doc.text('Erro na Imagem', centeredSignatureX + 5, y + 15);
            }
        } else {
             doc.rect(centeredSignatureX, y, signatureWidth, signatureHeight, 'S');
        }

        doc.text(textLines, pageWidth / 2, textY, { align: 'center' });
        y = textY + (textLines.length * textLineHeightFactor) + spaceAfterSignature;
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
    
    // --- Reliable Download Logic ---
    const pdfBlob = doc.output('blob');
    const pdfDataUri = doc.output('datauristring');
    const fileName = `${template.title.replace(/\s+/g, '_')}_${formData.DATA_ASSINATURA || new Date().toISOString().split('T')[0]}.pdf`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    return { pdfBlob, pdfDataUri };
};