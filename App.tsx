import React, { useState, useEffect } from 'react';
import { UserProfile } from './types';
import { auth } from './firebase';
import { getUserProfile } from './services/authService';
import Login from './components/Login';
import LoadingSpinner from './components/LoadingSpinner';
import AdminDashboard from './components/AdminDashboard';
import RemoteSign from './components/RemoteSign';

const Footer = () => (
    <footer className="text-center py-4 shrink-0">
        <p className="text-xs text-gray-500">
            Copyright © 2025 <a href="https://www.instagram.com/naldo_dicouto/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-400 transition-colors">Dicouto</a>. Todos os direitos reservados.
        </p>
    </footer>
);

const AccessDenied = ({ onLogout }: { onLogout: () => void }) => (
    <div className="flex-grow flex flex-col justify-center items-center text-center p-4">
        <div className="text-5xl mb-4">🚫</div>
        <h1 className="text-3xl font-bold text-red-400 mb-2">Acesso Negado</h1>
        <p className="text-lg text-gray-300 max-w-md mb-6">A sua conta não tem permissão para aceder a esta plataforma.</p>
        <button onClick={onLogout} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold">
            Terminar Sessão
        </button>
    </div>
);


const App: React.FC = () => {
    const [user, setUser] = useState<any | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    const hash = window.location.hash.substring(1);
    const hashSearchParams = new URLSearchParams(hash.startsWith('?') ? hash.substring(1) : hash);
    const isRemoteSignFlow = hashSearchParams.has('sign');

    useEffect(() => {
        if (!auth) {
            setLoadingAuth(false);
            return;
        }

        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any | null) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                const profile = await getUserProfile(firebaseUser.uid);
                // ATENÇÃO: Se for o primeiro login do admin, o perfil pode não existir.
                // O getUserProfile agora tem uma lógica para criar o perfil de admin 'on-the-fly'.
                // Para motoristas, o perfil deve ser criado pelo admin.
                if (profile) {
                    setUserProfile(profile);
                } else {
                     // Este caso pode acontecer se um motorista tentar fazer login antes de um contrato ser atribuído
                     console.warn("Utilizador autenticado mas sem perfil definido no Firestore.");
                     setUserProfile(null); // Garante que não mostra um dashboard errado
                }
            } else {
                setUser(null);
                setUserProfile(null);
            }
            setLoadingAuth(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = () => {
        if (auth) {
            auth.signOut();
        }
    };
    
    const renderContent = () => {
        if (loadingAuth) {
            return <LoadingSpinner />;
        }

        if (!user || !userProfile) {
            return <Login />;
        }

        if (userProfile.role === 'admin') {
            return <AdminDashboard user={user} onLogout={handleLogout} userProfile={userProfile} />;
        }
        
        return <AccessDenied onLogout={handleLogout} />;
    };

    if (isRemoteSignFlow) {
        return <RemoteSign />;
    }

    return (
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen text-gray-100 font-sans flex flex-col">
             <style>{`.fade-in { animation: fadeIn 0.5s ease-in-out; } @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } } .glass-effect { backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%); background-color: rgba(31, 41, 55, 0.75); border: 1px solid rgba(255, 255, 255, 0.125); }`}</style>
            <main className="flex-grow flex flex-col">
                {renderContent()}
            </main>
            <Footer />
        </div>
    );
};

export default App;