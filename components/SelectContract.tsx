
import React from 'react';
import { ContractType } from '../types';

interface SelectContractProps {
    onSelect: (type: ContractType) => void;
}

const contractOptions = [
    { type: 'prestacao' as ContractType, icon: '⚖️', title: 'Prestação de Serviços', desc: 'Contrato de prestação de serviços entre motorista e operadora TVDE.', tag: 'Serviços Independentes', tagColor: 'blue' },
    { type: 'aluguer' as ContractType, icon: '🚗', title: 'Aluguer de Viatura', desc: 'Contrato de aluguer com auto de entrega detalhado e caução.', tag: 'Locação Veicular', tagColor: 'purple' },
    { type: 'uber' as ContractType, icon: '📱', title: 'Autorização Uber', desc: 'Declaração tripartida para inscrição na plataforma Uber.', tag: 'Plataforma Digital', tagColor: 'green' },
    { type: 'comodato' as ContractType, icon: '🤝', title: 'Comodato Bolt', desc: 'Contrato de comodato para plataforma eletrónica Bolt.', tag: 'Plataforma Bolt', tagColor: 'yellow' },
];

const tagColors: Record<string, string> = {
    blue: 'bg-blue-600/20 text-blue-400',
    purple: 'bg-purple-600/20 text-purple-400',
    green: 'bg-green-600/20 text-green-400',
    yellow: 'bg-yellow-600/20 text-yellow-400',
}

const SelectContract: React.FC<SelectContractProps> = ({ onSelect }) => {
    return (
        <div className="glass-effect rounded-xl p-8 fade-in">
            <h2 className="text-3xl font-bold text-center mb-8 text-gray-100">Selecione o Tipo de Contrato</h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                {contractOptions.map((contract) => (
                    <div
                        key={contract.type}
                        onClick={() => onSelect(contract.type)}
                        className="cursor-pointer p-6 bg-gradient-to-br from-gray-800 to-gray-700 border border-gray-600 rounded-xl hover:border-blue-500 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10"
                    >
                        <div className="text-4xl mb-4 text-center">{contract.icon}</div>
                        <h3 className="font-bold text-xl mb-3 text-center text-gray-100">{contract.title}</h3>
                        <p className="text-gray-400 text-sm text-center leading-relaxed h-20">{contract.desc}</p>
                        <div className="mt-4 text-center">
                            <span className={`inline-block px-3 py-1 ${tagColors[contract.tagColor]} rounded-full text-xs font-semibold`}>
                                {contract.tag}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SelectContract;
