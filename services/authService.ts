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
