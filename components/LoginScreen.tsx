import React, { useState } from 'react';

// Supabase client is passed as a prop, using 'any' as it's from a CDN.
interface SupabaseLoginProps {
  supabase: any; 
  onSignUp: (name: string, email: string, password: string) => void;
  onAcceptInvitationClick: () => void;
}

const LoginScreen: React.FC<SupabaseLoginProps> = ({ supabase, onSignUp, onAcceptInvitationClick }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                if (!name.trim()) {
                    setError('Please enter your full name.');
                    setLoading(false);
                    return;
                }
                // Pass details to parent component to handle sign-up
                onSignUp(name, email, password);
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // onAuthStateChange in App.tsx will handle successful login.
            }
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-3 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 00-1.09.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/>
                        </svg>
                        <h1 className="text-3xl font-bold text-gray-800">Hapsara</h1>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-700">{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                    {isSignUp && (
                         <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg"/>
                        </div>
                    )}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg"/>
                    </div>
                     <div>
                        <label htmlFor="password"className="block text-sm font-medium text-gray-700">Password</label>
                        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 w-full p-2.5 border border-gray-300 rounded-lg"/>
                    </div>
                    
                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    {message && <p className="text-sm text-green-600 text-center">{message}</p>}
                    
                    <button type="submit" disabled={loading} className="w-full mt-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-300">
                        {loading ? 'Processing...' : (isSignUp ? 'Continue' : 'Log In')}
                    </button>
                </form>
                 <div className="text-center mt-4">
                    <p className="text-sm text-gray-500">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold text-green-600 hover:underline">
                           {isSignUp ? 'Log In' : "Sign Up"}
                        </button>
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Have an invitation?{' '}
                         <button onClick={onAcceptInvitationClick} className="font-semibold text-green-600 hover:underline">
                           Accept it here
                        </button>
                    </p>
                </div>
            </div>
             <footer className="mt-12 text-sm text-gray-500">
                <p>&copy; {new Date().getFullYear()} Hapsara. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LoginScreen;