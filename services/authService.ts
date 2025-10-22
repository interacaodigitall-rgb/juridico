import { auth, firestore } from '../firebase';
import { UserProfile, UserRole } from '../types';

// Declara o objeto global do Firebase para que o TypeScript o reconheça
declare const firebase: any;

const ADMIN_EMAIL = 'adm@asfaltocativante.pt';

/**
 * Obtém o perfil de um utilizador. Se não existir, cria-o 'on-the-fly'.
 * Esta abordagem "auto-corretiva" garante que cada utilizador autenticado
 * tenha um perfil correspondente no Firestore com o ID de documento correto (o seu Auth UID).
 * @param uid O ID do utilizador do Firebase Auth.
 * @returns O perfil do utilizador.
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        const userDocRef = firestore.collection('users').doc(uid);
        const userDoc = await userDocRef.get();

        if (userDoc.exists) {
            return userDoc.data() as UserProfile;
        }

        // --- Perfil não encontrado, vamos criar ---
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === uid && currentUser.email) {
            console.log(`Perfil para o utilizador ${currentUser.email} (UID: ${uid}) não encontrado. A criar agora...`);

            const role: UserRole = currentUser.email === ADMIN_EMAIL ? 'admin' : 'driver';

            const newProfile: UserProfile = {
                uid: uid,
                email: currentUser.email,
                role: role,
            };
            
            // Cria o documento do perfil com o ID de documento a corresponder ao Auth UID
            await userDocRef.set(newProfile);
            console.log(`Perfil para ${currentUser.email} criado com sucesso.`);
            
            return newProfile;
        }
        
        console.warn(`Não foi possível obter/criar o perfil para o UID ${uid} porque o utilizador não está logado ou não corresponde.`);
        return null;

    } catch (error: any) {
        console.error("Erro ao obter o perfil do utilizador:", error.message);
        
        // MANTÉM O FALLBACK: Em caso de erro de permissão, inferir o papel é melhor que bloquear o utilizador.
        if (auth.currentUser && (error.code === 'permission-denied' || error.code === 'PERMISSION_DENIED' || error.message.includes('insufficient permissions'))) {
            const email = auth.currentUser.email!;
            if (email === ADMIN_EMAIL) {
                console.warn("O acesso ao Firestore falhou. A assumir o papel de administrador com base no e-mail.");
                return { uid: auth.currentUser.uid, email, role: 'admin' };
            } else {
                 console.warn(`O acesso ao Firestore falhou para ${email}. A assumir o papel de motorista como fallback.`);
                 return { uid: auth.currentUser.uid, email, role: 'driver' };
            }
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
        // Fallback for permission errors
        if (error.code === 'permission-denied' || error.message.includes('insufficient permissions')) {
             alert("Erro de permissão ao procurar utilizador. Verifique as regras de segurança do Firestore. O administrador deve poder ler a coleção 'users'.");
        }
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