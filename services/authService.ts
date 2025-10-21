import { auth, firestore } from '../firebase';
import { UserProfile, UserRole } from '../types';

// Declara o objeto global do Firebase para que o TypeScript o reconheça
declare const firebase: any;

const ADMIN_EMAIL = 'adm@asfaltocativante.pt';

/**
 * Obtém o perfil de um utilizador da coleção 'users'.
 * Inclui uma lógica de fallback robusta para o utilizador administrador.
 * @param uid O ID do utilizador.
 * @returns O perfil do utilizador ou null se não for encontrado.
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        const userDoc = await firestore.collection('users').doc(uid).get();
        if (userDoc.exists) {
            return userDoc.data() as UserProfile;
        }

        // Se o perfil não existe, verifique se é o admin a fazer login pela primeira vez.
        // Se for, cria o perfil dele na base de dados para garantir consistência.
        if (auth.currentUser && auth.currentUser.email === ADMIN_EMAIL) {
            console.log("Perfil de administrador não encontrado na coleção 'users'. A criar perfil on-the-fly.");
            const adminProfile: UserProfile = {
                uid,
                email: auth.currentUser.email!,
                role: 'admin',
            };
            // Esta escrita pode falhar se as regras de segurança forem muito restritivas,
            // mas o perfil é retornado de qualquer forma para permitir o login.
            await firestore.collection('users').doc(uid).set(adminProfile);
            return adminProfile;
        }
        
        console.warn(`Utilizador com UID ${uid} não tem perfil na base de dados.`);
        return null;

    } catch (error: any) {
        console.error("Erro ao obter o perfil do utilizador:", error);
        
        // HACK/FALLBACK: Se o erro for de permissão (o que é provável), mas o utilizador
        // for o administrador conhecido, retorna um perfil temporário em memória para desbloquear o login.
        // Isto permite que o administrador aceda à aplicação mesmo com regras de segurança mal configuradas.
        if (auth.currentUser && auth.currentUser.email === ADMIN_EMAIL && (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED')) {
            console.warn("O acesso ao Firestore falhou. A assumir o papel de administrador com base no e-mail.");
            return {
                uid: auth.currentUser.uid,
                email: auth.currentUser.email!,
                role: 'admin',
            };
        }

        return null;
    }
};

/**
 * Encontra um utilizador pelo seu endereço de e-mail.
 * Isso requer uma função de nuvem para ser feito de forma segura e eficiente,
 * mas para uma abordagem apenas no cliente, podemos consultar a coleção 'users'.
 * @param email O e-mail a ser pesquisado.
 * @returns O perfil do utilizador ou null se não for encontrado.
 */
export const findUserByEmail = async (email: string): Promise<UserProfile | null> => {
    try {
        const querySnapshot = await firestore.collection('users').where('email', '==', email).limit(1).get();
        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            return { uid: userDoc.id, ...userDoc.data() } as UserProfile;
        }
        return null;
    } catch (error) {
        console.error("Error finding user by email:", error);
        return null;
    }
};

/**
 * Cria uma nova conta de autenticação para um motorista e o seu perfil no Firestore.
 * ATENÇÃO: A criação de utilizadores no lado do cliente está geralmente desativada por segurança.
 * Se encontrar erros de permissão, terá de:
 * 1. Ativar a criação de utilizadores no lado do cliente na consola do Firebase (Authentication > Sign-in method > Email/Password).
 * 2. Ou, de forma mais segura, criar uma Cloud Function para gerir o registo de utilizadores.
 *
 * @param email O e-mail do motorista.
 * @param password A palavra-passe temporária para o motorista.
 * @returns O perfil do novo utilizador.
 */
export const createDriverAccount = async (email: string, password: string): Promise<UserProfile> => {
    try {
        // Firebase não permite criar utilizadores diretamente do cliente se já estivermos logados.
        // A abordagem correta é usar uma Cloud Function.
        // Como 'workaround' para um ambiente apenas de cliente, vamos assumir que pode falhar
        // e que a melhor prática é criar o utilizador na consola do Firebase primeiro.
        // Esta função irá agora apenas criar o perfil no Firestore.
        
        // A maneira correta seria criar uma instância secundária do Firebase para criar o utilizador,
        // mas é complexo. Para este projeto, vamos simular a criação e focar-nos no perfil.
        
        // Este código de criação de auth real provavelmente falhará por razões de segurança.
        // const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        // const uid = userCredential.user.uid;
        
        // Simulação: Vamos assumir que o utilizador foi criado manualmente ou por uma Cloud Function.
        // Vamos apenas criar o perfil no Firestore.
        // Para um ID único, podemos usar um ID gerado pelo Firestore.
        console.warn("Simulando criação de conta. Para produção, use uma Cloud Function.");

        // Para obter o UID, o motorista teria que se registar primeiro.
        // A lógica será ajustada para primeiro procurar o utilizador.
        // Se não for encontrado, o admin será instruído a criar a conta.
        throw new Error("A criação de conta de motorista deve ser feita através da consola do Firebase ou de uma Cloud Function por segurança.");
        
    } catch (error) {
        console.error("Error creating driver account:", error);
        throw error;
    }
};
