import React, { useState } from 'react';

interface LoginScreenProps {
  supabase: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ supabase }) => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [view, setView] = useState<'email' | 'otp'>('email');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        const { error } = await supabase.auth.signInWithOtp({ email });

        setIsLoading(false);
        if (error) {
            setError(error.message);
        } else {
            setView('otp');
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
        
        setIsLoading(false);
        if (error) {
            setError(error.message);
        }
        // On success, the onAuthStateChange listener in App.tsx will handle the login.
    };
    
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-lg shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="flex justify-center items-center gap-3 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 001.09-.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/>
                        </svg>
                        <h1 className="text-3xl font-bold text-gray-800">Hapsara</h1>
                    </div>
                </div>

                {view === 'email' ? (
                    <div>
                        <h2 className="text-center text-xl font-semibold text-gray-700 mb-1">Sign In / Sign Up</h2>
                        <p className="text-center text-sm text-gray-500 mb-6">Enter your email to receive a login code.</p>
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="you@example.com"
                                    className="mt-1 w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                />
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-300">
                                {isLoading ? 'Sending...' : 'Continue with Email'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div>
                        <p className="text-center text-gray-600 mb-4">A 6-digit code has been sent to <br/><strong className="text-gray-800">{email}</strong></p>
                        <form onSubmit={handleOtpSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Login Code</label>
                                <input
                                    id="otp"
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                    maxLength={6}
                                    placeholder="123456"
                                    className="mt-1 w-full p-2.5 text-center tracking-[1em] font-mono bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                                />
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-green-300">
                                {isLoading ? 'Verifying...' : 'Sign In'}
                            </button>
                        </form>
                        <div className="text-center mt-4">
                             <button onClick={() => setView('email')} className="text-sm text-gray-600 hover:underline">Use a different email</button>
                         </div>
                    </div>
                )}
                {error && <p className="mt-4 text-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            </div>
             <footer className="mt-12 text-sm text-gray-500">
                <p>&copy; {new Date().getFullYear()} Hapsara. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default LoginScreen;