import React from 'react';
import { ContractTemplate, FormData, ContractType } from '../types';

interface PreviewContractProps {
    template: ContractTemplate;
    formData: FormData;
    onBack: () => void;
    onNext: () => void;
    contractType: ContractType | null;
}

const PreviewContract: React.FC<PreviewContractProps> = ({ template, formData, onBack, onNext, contractType }) => {
    
    let previewContent = template.template;

    if (contractType === 'aluguer' && formData.MODALIDADE_50_50 === 'true') {
        const fixedRentClause = `O Segundo Contraente obriga-se a pagar à Primeira Contraente uma renda semanal mínima de {{VALOR_RENDA}} €, liquidada antecipadamente, até à segunda-feira de cada semana. O valor inclui utilização da viatura devidamente licenciada, seguro automóvel obrigatório, seguro de acidentes pessoais e manutenção periódica. O atraso superior a 3 dias úteis no pagamento confere à Primeira Contraente o direito de suspender o contrato e recolher de imediato a viatura.`;
        const fiftyFiftyClause = `A remuneração será partilhada em regime de 50/50% da faturação líquida semanal, após a dedução de todas as taxas das plataformas (Uber, Bolt, etc.) e impostos aplicáveis. As despesas de combustível, portagens e limpeza da viatura são da responsabilidade do Segundo Contraente. Os pagamentos serão efetuados semanalmente por transferência bancária, acompanhados de um extrato detalhado da faturação.`;
        previewContent = previewContent.replace(fixedRentClause, fiftyFiftyClause);
    }

    if (contractType === 'prestacao') {
        const fixedFeeClauseText = `CLÁUSULA QUINTA (Remuneração)
A remuneração do Motorista terá como referência a facturação líquida efectivamente obtida com os serviços prestados, deduzidas as taxas das plataformas, impostos aplicáveis e a taxa de utilização da viatura e gestão de frota fixada em {{VALOR_TAXA}} €/semana. Combustível, portagens e limpeza são encargos do Motorista.`;
        const percentageClauseText = `CLÁUSULA QUINTA (Remuneração)
A remuneração do Motorista terá como referência a facturação líquida depositada pelas plataformas eletrónicas (Uber, Bolt, etc.) na conta da Primeira Contraente. Sobre este valor incidirá uma taxa de serviço de 4% (quatro por cento) e IVA à taxa legal de 6% (seis por cento), totalizando 10% (dez por cento) que serão retidos pela Primeira Contraente. Combustível, portagens e limpeza são encargos do Motorista.`;
        
        const remunerationClause = formData.MODALIDADE_PERCENTAGEM === 'true' ? percentageClauseText : fixedFeeClauseText;
        previewContent = previewContent.replace('{{CLAUSULA_QUINTA_REMUNERACAO}}', remunerationClause);
    }

    Object.entries(formData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        if (contractType === 'aluguer' && formData.MODALIDADE_50_50 === 'true' && key === 'VALOR_RENDA') return;
        if (contractType === 'prestacao' && formData.MODALIDADE_PERCENTAGEM === 'true' && key === 'VALOR_TAXA') return;
        previewContent = previewContent.replace(regex, value || `[${key}]`);
    });
    
    const formattedContent = previewContent.replace(/\n/g, '<br />');

    return (
        <div className="glass-effect rounded-xl p-8 fade-in">
            <h2 className="text-3xl font-bold mb-8 text-gray-100">Revisão do Documento</h2>
            <div className="bg-white rounded-lg p-8 mb-8 max-h-[60vh] overflow-y-auto shadow-lg">
                <div 
                    className="text-black selection:bg-yellow-300"
                    style={{ fontFamily: "'Times New Roman', serif", lineHeight: 1.8, fontSize: '13px', textAlign: 'justify' }}
                    dangerouslySetInnerHTML={{ __html: formattedContent }}
                />
            </div>
            <div className="flex justify-between">
                <button onClick={onBack} className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"></path></svg>
                    <span>Editar Dados</span>
                </button>
                <button onClick={onNext} className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2">
                    <span>Prosseguir para Assinatura</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
        </div>
    );
};

export default PreviewContract;