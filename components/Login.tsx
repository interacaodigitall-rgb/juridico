
import React, { useState } from 'react';
import { auth } from '../firebase';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (err: any) {
            switch (err.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    setError('E-mail ou palavra-passe inválidos.');
                    break;
                case 'auth/invalid-email':
                    setError('Formato de e-mail inválido.');
                    break;
                default:
                    setError('Ocorreu um erro. Tente novamente.');
                    break;
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen flex items-center justify-center p-4">
            <style>{`.glass-effect { backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%); background-color: rgba(31, 41, 55, 0.75); border: 1px solid rgba(255, 255, 255, 0.125); }`}</style>
             <div className="w-full max-w-md">
                 <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                        Sistema Jurídico TVDE
                    </h1>
                    <p className="text-gray-400 text-lg mt-2">Acesso Restrito</p>
                </div>

                <div className="glass-effect rounded-xl p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
                                E-mail
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                                placeholder="utilizador@asfaltocativante.pt"
                            />
                        </div>
                        <div>
                            <label htmlFor="password"className="block text-sm font-semibold text-gray-300 mb-2">
                                Palavra-passe
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                                placeholder="••••••••"
                            />
                        </div>
                        
                        {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
                            >
                                {loading ? 'Aguarde...' : 'Entrar'}
                            </button>
                        </div>
                    </form>
                </div>
             </div>
        </div>
    );
};

export default Login;