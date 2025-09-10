
import React from 'react';
import { Step } from '../types';

interface StepIndicatorProps {
    currentStep: Step;
    goToStep: (step: Step) => void;
    completedSteps: Set<Step>;
}

const stepsConfig = [
    { id: Step.Select, label: 'Seleção', num: 1 },
    { id: Step.Form, label: 'Formulário', num: 2 },
    { id: Step.Preview, label: 'Revisão', num: 3 },
    { id: Step.Sign, label: 'Assinatura', num: 4 },
];

const getStepClass = (stepId: Step, currentStep: Step, completedSteps: Set<Step>) => {
    if (stepId === currentStep) {
        return 'step-active bg-gradient-to-r from-blue-600 to-blue-700 text-white';
    }
    if (completedSteps.has(stepId)) {
        return 'step-completed bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800';
    }
    return 'bg-gray-700 text-gray-400 cursor-not-allowed';
};

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, goToStep, completedSteps }) => {
    return (
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4">
            {stepsConfig.map((step) => (
                <button
                    key={step.id}
                    onClick={() => completedSteps.has(step.id) && goToStep(step.id)}
                    disabled={!completedSteps.has(step.id)}
                    className={`px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${getStepClass(step.id, currentStep, completedSteps)}`}
                >
                    <span className={`w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm font-bold`}>
                        {step.num}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                </button>
            ))}
        </div>
    );
};

export default StepIndicator;
