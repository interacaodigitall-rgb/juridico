export enum Step {
    Select,
    Form,
    Preview,
    Sign,
    Manage,
}

export type ContractType = 'prestacao' | 'aluguer' | 'uber' | 'comodato';

export type FieldCategory = 'empresa' | 'motorista' | 'financeiro' | 'veiculo' | 'proprietario' | 'operadora' | 'operador' | 'geral';

export interface ContractField {
    name: string;
    label: string;
    type: string;
    required: boolean;
    category: FieldCategory;
    default?: string | number;
}

export interface ContractTemplate {
    title: string;
    fields: ContractField[];
    template: string;
    signatures: string[];
}

export type FormData = Record<string, string>;

export type Signatures = Record<string, string>; // signerName -> dataURL

export interface SavedContract {
    id: string;
    type: ContractType;
    title: string;
    data: FormData;
    signatures: Signatures;
    createdAt: string;
}

export interface SignatureRequest {
    id: string;
    userId: string;
    contractType: ContractType;
    formData: FormData;
    signatures: Signatures;
    signers: string[];
    status: 'pending' | 'completed';
    createdAt: any; // Firestore Timestamp
    expiresAt: any; // Firestore Timestamp
}
