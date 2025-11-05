import React from 'react';

interface LandingPageProps {
  onLaunch: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg text-center border border-white/20 h-full">
        <div className="flex justify-center mb-4 text-green-300">{icon}</div>
        <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
        <p className="text-gray-300 text-sm">{description}</p>
    </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
  return (
    <div className="relative min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 overflow-hidden">
        {/* Background Image */}
        <div 
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2070&auto=format&fit=crop')" }}
        ></div>
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 z-10"></div>

        <div className="relative z-20 text-center max-w-5xl mx-auto">
            {/* Main Content */}
            <div className="mb-12">
                <div className="flex justify-center items-center gap-4 mb-4">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 001.09-.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/>
                    </svg>
                    <h1 className="text-5xl font-bold tracking-tight">Hapsara Farmer Registration</h1>
                </div>
                <p className="text-lg text-gray-300 mt-4 max-w-3xl mx-auto">
                    A comprehensive offline-capable web application for the Oil Palm Mission that manages farmer registrations, tracks plantation progress, and monitors subsidy payments.
                </p>
                <button
                    onClick={onLaunch}
                    className="mt-8 px-10 py-4 bg-green-600 text-white font-bold text-lg rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-green-500/50"
                >
                    Launch Dashboard
                </button>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureCard 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                    title="Offline Capable"
                    description="Register and manage farmers even without an internet connection. Data syncs automatically when you're back online."
                />
                <FeatureCard 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    title="Streamlined Data Entry"
                    description="An intuitive form with built-in validation and automatic ID generation to ensure data accuracy and speed up registrations."
                />
                 <FeatureCard 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                    title="Powerful Exports"
                    description="Easily export your farmer data to Excel, CSV, or generate printable PDFs for individual records, streamlining reporting."
                />
            </div>
             <footer className="mt-12 text-sm text-gray-400">
                <p>&copy; {new Date().getFullYear()} Hapsara. All rights reserved.</p>
            </footer>
        </div>
    </div>
  );
};

export default LandingPage;