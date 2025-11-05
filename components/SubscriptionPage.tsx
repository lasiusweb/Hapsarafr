import React from 'react';
import { SubscriptionTier } from '../types';
import { PLANS } from '../data/subscriptionPlans';

interface SubscriptionPageProps {
    onSelectPlan: (tier: SubscriptionTier) => void;
    onBack: () => void;
}

const CheckIcon = () => (
    <svg className="h-6 w-6 text-green-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
);


const SubscriptionPage: React.FC<SubscriptionPageProps> = ({ onSelectPlan, onBack }) => {
    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Choose the plan that's right for you
                    </h2>
                    <p className="mt-4 text-lg text-gray-500">
                        Start for free and scale as you grow.
                    </p>
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {PLANS.map((plan) => (
                        <div key={plan.name} className={`relative border rounded-lg shadow-sm flex flex-col ${plan.isPopular ? 'border-green-500 border-2' : 'border-gray-200'}`}>
                            {plan.isPopular && (
                                <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                                    <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase">Most Popular</span>
                                </div>
                            )}
                            <div className="p-6 bg-white rounded-t-lg">
                                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                                <p className="mt-6">
                                    <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                                </p>
                            </div>
                            <div className="pt-6 pb-8 px-6 flex-1 flex flex-col justify-between">
                                <ul className="space-y-4">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start">
                                            <CheckIcon />
                                            <span className="ml-3 text-sm text-gray-500">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => onSelectPlan(plan.tier)}
                                    className={`mt-8 block w-full py-2 px-4 text-sm font-semibold text-center rounded-md ${
                                        plan.isPopular 
                                        ? 'bg-green-600 text-white hover:bg-green-700' 
                                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                                    }`}
                                >
                                    Select {plan.name}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 text-center">
                    <button onClick={onBack} className="text-sm font-semibold text-gray-600 hover:text-gray-900">
                        &larr; Go back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;
