import React, { useState } from 'react';
import { ContractTemplate, FormData, FieldCategory } from '../types';
import { empresaData } from '../constants';

interface ContractFormProps {
    template: ContractTemplate;
    onBack: () => void;
    onNext: (data: FormData) => void;
    initialData: FormData;
}

const categories: Record<FieldCategory, { title: string }> = {
    empresa: { title: '🏢 Dados da Empresa/Operadora' },
    proprietario: { title: '👤 Dados do Proprietário' },
    operadora: { title: '🏢 Dados da Operadora' },
    operador: { title: '🏢 Dados do Operador' },
    motorista: { title: '👤 Dados do Motorista' },
    veiculo: { title: '🚗 Dados do Veículo' },
    financeiro: { title: '💰 Dados Financeiros' },
    geral: { title: '📅 Informações Gerais' }
};

const ContractForm: React.FC<ContractFormProps> = ({ template, onBack, onNext, initialData }) => {
    const [formData, setFormData] = useState<FormData>(() => {
        const fullData: FormData = { ...empresaData, ...initialData };
        template.fields.forEach(field => {
             if(!fullData[field.name]) {
                fullData[field.name] = (field.default || '').toString();
             }
        });
        return fullData;
    });

    const [errors, setErrors] = useState<Record<string, boolean>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked.toString() : value;
        
        setFormData(prev => {
            const newData = { ...prev, [name]: newValue };
            if (name === 'MODALIDADE_50_50' && checked) {
                newData['VALOR_RENDA'] = ''; 
            }
            return newData;
        });
        
        if (errors[name]) {
            setErrors({ ...errors, [name]: false });
        }
    };

    const handleSubmit = () => {
        const newErrors: Record<string, boolean> = {};
        let hasError = false;
        const is5050 = formData.MODALIDADE_50_50 === 'true';

        template.fields.forEach(field => {
            if (is5050 && field.name === 'VALOR_RENDA') {
                return;
            }
            if (field.required && !formData[field.name]?.trim()) {
                newErrors[field.name] = true;
                hasError = true;
            }
        });
        setErrors(newErrors);
        if (!hasError) {
            const dataToSend = { ...formData };
            if (is5050) {
                dataToSend.VALOR_RENDA = 'N/A';
            }
            onNext(dataToSend);
        } else {
            alert('⚠️ Por favor, preencha todos os campos obrigatórios marcados com *');
        }
    };

    const groupedFields = template.fields.reduce((acc, field) => {
        (acc[field.category] = acc[field.category] || []).push(field);
        return acc;
    }, {} as Record<FieldCategory, typeof template.fields>);

    const is5050mode = formData.MODALIDADE_50_50 === 'true';

    return (
        <div className="glass-effect rounded-xl p-8 fade-in">
            <h2 className="text-3xl font-bold mb-2 text-gray-100">{template.title}</h2>
            <p className="text-gray-400 mb-8">Preencha todos os campos obrigatórios para gerar o contrato.</p>

            <div className="space-y-8">
                {(Object.keys(groupedFields) as FieldCategory[]).map(categoryKey => (
                    <div key={categoryKey} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                         <h3 className="font-bold text-xl mb-4 text-gray-100 border-l-4 border-blue-500 pl-4">{categories[categoryKey].title}</h3>
                         <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                            {groupedFields[categoryKey].map(field => {
                                const isPreFilled = empresaData[field.name] !== undefined;
                                const hasError = errors[field.name];

                                if (field.type === 'checkbox') {
                                    return (
                                        <div key={field.name} className="md:col-span-2 flex items-center space-x-3 pt-2">
                                            <input
                                                type="checkbox"
                                                id={`field-${field.name}`}
                                                name={field.name}
                                                checked={formData[field.name] === 'true'}
                                                onChange={handleChange}
                                                className="h-5 w-5 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <label htmlFor={`field-${field.name}`} className="text-sm font-semibold text-gray-300 cursor-pointer">
                                                {field.label}
                                            </label>
                                        </div>
                                    );
                                }

                                return (
                                <div key={field.name}>
                                    <label htmlFor={`field-${field.name}`} className="block text-sm font-semibold text-gray-300 mb-2">
                                        {field.label} {field.required && <span className="text-red-400">*</span>}
                                        {isPreFilled && <span className="text-green-400 text-xs ml-2">✓ Pré-preenchido</span>}
                                    </label>
                                    <input
                                        type={field.type}
                                        id={`field-${field.name}`}
                                        name={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={handleChange}
                                        disabled={isPreFilled || (field.name === 'VALOR_RENDA' && is5050mode)}
                                        className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${(isPreFilled || (field.name === 'VALOR_RENDA' && is5050mode)) ? 'border-gray-600 text-gray-500 cursor-not-allowed bg-gray-800' : 'border-gray-600'} ${hasError ? 'border-red-500 ring-red-500' : ''}`}
                                    />
                                </div>
                                )
                            })}
                         </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between mt-10">
                <button onClick={onBack} className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    <span>Voltar</span>
                </button>
                <button onClick={handleSubmit} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2">
                    <span>Gerar Pré-visualização</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
        </div>
    );
};

export default ContractForm;