export enum Step {
    Dashboard,
    Select,
    Form,
    Preview,
    Sign,
    Manage,
}

export type ContractType = 'prestacao' | 'aluguer' | 'uber' | 'comodato' | 'aluguer_proprietario' | 'aluguer_parceiro';

export type FieldCategory = 'empresa' | 'motorista' | 'financeiro' | 'veiculo' | 'proprietario' | 'operadora' | 'operador' | 'geral' | 'proprietario_singular' | 'proprietario_coletivo' | 'responsabilidades';

export interface ContractField {
    name: string;
    label: string;
    type: string;
    required: boolean;
    category: FieldCategory;
    default?: string | number | boolean;
}

export interface ContractTemplate {
    title: string;
    fields: ContractField[];
    template: string;
    signatures: string[];
}

export type FormData = Record<string, string>;

export type Signatures = Record<string, string>; // signerName -> dataURL

export type ContractStatus = 'pending_signature' | 'completed';

export interface SavedContract {
    id: string;
    type: ContractType;
    title: string;
    data: FormData;
    signatures: Signatures;
    createdAt: string; // ISO String
    adminUid: string;
    status: ContractStatus;
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

export type UserRole = 'admin' | 'driver';

export interface UserProfile {
    uid: string;
    email: string;
    role: UserRole;
}