import React from 'react';
import { PRICING_MODEL } from '../data/subscriptionPlans';
import { AppContent } from '../types';

interface LandingPageProps {
  onLaunch: () => void;
  appContent: Partial<AppContent> | null;
}

// Reusable Feature Card Component
const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white mb-4">
            {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
    </div>
);

// Main Landing Page Component
const LandingPage: React.FC<LandingPageProps> = ({ onLaunch, appContent }) => {
  const defaultContent = {
    heroTitle: "Empowering Agriculture Through Technology",
    heroSubtitle: "The complete SaaS platform for farmer management. Streamline registrations, track progress, and manage subsidies with our robust, offline-first solution.",
    aboutUs: `<p class="text-gray-600 mb-4">Hapsara is designed to bridge the gap between agricultural administration and on-the-ground reality. Our mission is to provide a seamless, reliable, and user-friendly platform for government agencies and organizations to manage large-scale agricultural missions efficiently.</p><p class="text-gray-600">Built with cutting-edge technology, our offline-first approach ensures that fieldwork is never interrupted, even in the most remote areas. Data is securely stored locally and synchronized with the central server whenever a connection is available, ensuring data integrity and real-time insights.</p>`,
  };

  return (
    <div className="bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-md fixed w-full z-30">
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor"><path d="M17.721 1.256a.75.75 0 01.316 1.018l-3.208 5.05a.75.75 0 01-1.09.213l-2.103-1.752a.75.75 0 00-1.09.213l-3.208 5.05a.75.75 0 01-1.127.039L1.96 6.544a.75.75 0 01.173-1.082l4.478-3.183a.75.75 0 01.916.027l2.458 2.048a.75.75 0 001.09-.213l3.208-5.05a.75.75 0 011.018-.316zM3.5 2.75a.75.75 0 00-1.5 0v14.5a.75.75 0 001.5 0V2.75z"/></svg>
            <h1 className="text-xl font-bold text-gray-800">Hapsara</h1>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#about" className="text-gray-600 hover:text-green-600 transition">About Us</a>
            <a href="#features" className="text-gray-600 hover:text-green-600 transition">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-green-600 transition">Pricing</a>
            <a href="#contact" className="text-gray-600 hover:text-green-600 transition">Contact</a>
          </nav>
          <button
            onClick={onLaunch}
            className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
          >
            Launch App
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section id="home" className="relative pt-32 pb-20 text-center text-white bg-gray-800">
             <div 
                className="absolute inset-0 bg-cover bg-center z-0 opacity-30"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2070&auto=format&fit=crop')" }}
            ></div>
            <div className="absolute inset-0 bg-black/50 z-10"></div>
            <div className="container mx-auto px-6 relative z-20">
                <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">{appContent?.landing_hero_title || defaultContent.heroTitle}</h2>
                <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                    {appContent?.landing_hero_subtitle || defaultContent.heroSubtitle}
                </p>
                <button
                    onClick={onLaunch}
                    className="px-8 py-3 bg-green-600 text-white font-bold text-lg rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105"
                >
                    Get Started
                </button>
            </div>
        </section>

        {/* About Us Section */}
        <section id="about" className="py-20 bg-white">
            <div className="container mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                <div>
                    <img src="https://images.unsplash.com/photo-1580910223797-9099403d98aa?q=80&w=1974&auto=format&fit=crop" alt="Farmers in a field" className="rounded-lg shadow-xl" />
                </div>
                <div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-4">About Hapsara</h3>
                    <div dangerouslySetInnerHTML={{ __html: appContent?.landing_about_us || defaultContent.aboutUs }} />
                </div>
            </div>
        </section>

        {/* Why Choose Us Section */}
        <section id="features" className="py-20 bg-gray-50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                    <h3 className="text-3xl font-bold text-gray-800">Why Choose Our Platform?</h3>
                    <p className="text-gray-600 mt-2">Key features that make farmer management effortless and efficient.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <FeatureCard
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                        title="Offline-First"
                        description="Work without an internet connection. All data is saved locally and syncs automatically when you're back online."
                    />
                    <FeatureCard
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        title="Intelligent Forms"
                        description="Accelerate registrations with smart forms, automatic ID generation, and built-in data validation."
                    />
                    <FeatureCard
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                        title="Secure & Scalable"
                        description="Enterprise-grade security with a flexible pay-as-you-go model that grows with your organization's needs."
                    />
                     <FeatureCard
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                        title="Advanced Reporting"
                        description="Gain insights from your data. Export reports to Excel/CSV or generate printable PDFs for individual records."
                    />
                </div>
            </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 bg-white">
            <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                    <h3 className="text-3xl font-bold text-gray-800">Simple, Transparent Pricing</h3>
                    <p className="text-gray-600 mt-2">Pay only for what you use. No hidden fees, no complex tiers.</p>
                </div>
                
                <div className="max-w-2xl mx-auto bg-gray-50/50 border border-gray-200 rounded-lg p-8">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="text-center">
                            <p className="text-5xl font-extrabold text-gray-900">₹{PRICING_MODEL.PER_USER_COST_INR}</p>
                            <p className="text-lg font-semibold text-gray-800">Per User</p>
                            <p className="text-gray-500">per month</p>
                        </div>
                        <div className="text-center">
                            <p className="text-5xl font-extrabold text-gray-900">₹{PRICING_MODEL.PER_RECORD_COST_INR}</p>
                            <p className="text-lg font-semibold text-gray-800">Per Farmer Record</p>
                            <p className="text-gray-500">per month</p>
                        </div>
                    </div>
                    <div className="text-center mt-8 pt-6 border-t border-gray-200">
                        <p className="text-gray-600">
                            Your total monthly cost is a simple sum of both charges. <br />
                            For example: 10 users and 500 records would be (10 × ₹99) + (500 × ₹1) = ₹1490 per month.
                        </p>
                    </div>
                </div>

                <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-lg shadow-lg border">
                    <h4 className="text-xl font-semibold text-center mb-6 text-gray-800">All Features Included</h4>
                     <ul className="space-y-4">
                        {PRICING_MODEL.FEATURES.map((feature) => (
                            <li key={feature} className="flex items-start">
                                <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="ml-3 text-sm text-gray-600">{feature}</span>
                            </li>
                        ))}
                    </ul>
                     <button
                        onClick={onLaunch}
                        className="mt-8 block w-full py-3 px-4 text-lg font-semibold text-center rounded-md bg-green-600 text-white hover:bg-green-700 transition"
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </section>


        {/* Contact Us Section */}
        <section id="contact" className="py-20 bg-gray-50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-12">
                    <h3 className="text-3xl font-bold text-gray-800">Get In Touch</h3>
                    <p className="text-gray-600 mt-2">Have questions or want to learn more? Reach out to us.</p>
                </div>
                <div className="bg-white p-8 rounded-lg shadow-lg grid md:grid-cols-2 gap-10">
                    <div>
                        <h4 className="text-xl font-semibold text-gray-800 mb-4">Contact Information</h4>
                        <div className="space-y-4 text-gray-600">
                             <p className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 mt-1 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span>N-Heights, 6th floor, opp to Tech Mahindra, Hi-tech City, Telangana, India-81</span>
                            </p>
                             <p className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                <span>+91 88 97 66 44 03</span>
                            </p>
                             <p className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                <span>support@hapsara.com</span>
                            </p>
                        </div>
                    </div>
                    <form onSubmit={(e) => { e.preventDefault(); alert('Thank you for your message!'); }}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="sr-only">Name</label>
                                <input type="text" name="name" id="name" required className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Your Name" />
                            </div>
                            <div>
                                <label htmlFor="email" className="sr-only">Email</label>
                                <input type="email" name="email" id="email" required className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Your Email" />
                            </div>
                            <div>
                                <label htmlFor="message" className="sr-only">Message</label>
                                <textarea name="message" id="message" rows={4} required className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Your Message"></textarea>
                            </div>
                            <button type="submit" className="w-full py-3 px-6 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition">Send Message</button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-6 text-center">
            <p>&copy; {new Date().getFullYear()} Hapsara. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;