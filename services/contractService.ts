
import { jsPDF } from 'jspdf';
import { SavedContract, ContractTemplate, FormData, Signatures, ContractType } from '../types';
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
    Object.entries(allData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        rawContent = rawContent.replace(regex, value || `[${key}]`);
    });

    const contentLines = rawContent.split('\n');
    const title = contentLines.find(line => line.trim() !== '') || template.title;
    const body = contentLines.slice(contentLines.indexOf(title) + 1).join('\n');

    // Define rendering configurations to try, from default to more compact.
    const renderConfigs = [
        { id: 'default', fontSize: 12, lineHeight: 6, margin: 15, yStart: 30 },
        { id: 'compact', fontSize: 11.5, lineHeight: 5.8, margin: 15, yStart: 28 },
        { id: 'extra-compact', fontSize: 11, lineHeight: 5.5, margin: 12, yStart: 25 },
        { id: 'super-compact', fontSize: 10.5, lineHeight: 5.3, margin: 12, yStart: 25 }
    ];

    let finalDoc: jsPDF | null = null;
    let finalConfig = renderConfigs[0];
    let finalY = 0;

    // Signature block dimensions (made more compact)
    const signatureWidth = 55;
    const signatureHeight = 22;
    const singleSignatureHeight = 40; // Approx height for text + image + spacing
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
    
    y += 15; // Reduced vertical space before signatures

    template.signatures.forEach((signerName) => {
         if (y + singleSignatureHeight > pageHeight - margin) {
            doc.addPage();
            y = finalConfig.yStart; 
        }

        const signatureDataUrl = signatures[signerName];
        if (!signatureDataUrl) return;

        let signatureBlockText = '';
        doc.setFontSize(9); // Reduced font size for signer name
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
        y += (textLines.length * 3.5) + 2; // Reduced line height factor

        const centeredSignatureX = (pageWidth - signatureWidth) / 2;
        try {
            doc.addImage(signatureDataUrl, 'PNG', centeredSignatureX, y, signatureWidth, signatureHeight);
        } catch (e) {
            console.warn('Error adding signature image:', e);
            doc.rect(centeredSignatureX, y, signatureWidth, signatureHeight);
            doc.text('Signature Error', centeredSignatureX + 5, y + 15);
        }
        y += signatureHeight + 10; // Reduced spacing after signature
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