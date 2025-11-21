
import React, { useMemo, useState } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, OrderModel } from '../db';
import { CustomerSegment, getCustomerSegments } from '../lib/businessIntelligence';
import { formatCurrency, generateWhatsAppLink } from '../lib/utils';
import { Q } from '@nozbe/watermelondb';

interface CustomerSegmentsViewProps {
    dealerMandal?: string;
}

const SegmentCard: React.FC<{ segment: CustomerSegment, isActive: boolean, onClick: () => void }> = ({ segment, isActive, onClick }) => (
    <div 
        onClick={onClick}
        className={`p-4 rounded-xl border cursor-pointer transition-all shadow-sm hover:shadow-md ${isActive ? `ring-2 ring-offset-1 ring-indigo-500 ${segment.color}` : 'bg-white border-gray-200 hover:border-indigo-300'}`}
    >
        <div className="flex justify-between items-start mb-2">
            <span className="text-2xl">{segment.icon}</span>
            <span className="text-lg font-bold">{segment.farmers.length}</span>
        </div>
        <h4 className="font-bold text-sm mb-1">{segment.label}</h4>
        <p className="text-xs opacity-80 line-clamp-2 mb-2">{segment.description}</p>
        <div className="text-xs font-mono opacity-70">
            Avg. LTV: {formatCurrency(segment.avgSpend)}
        </div>
    </div>
);

const CustomerSegmentsView: React.FC<CustomerSegmentsViewProps> = ({ dealerMandal }) => {
    const database = useDatabase();
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

    // Fetch Data
    const allFarmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const allOrders = useQuery(useMemo(() => database.get<OrderModel>('orders').query(), [database]));

    const segments = useMemo(() => {
        // Filter farmers by dealer region if specified
        const localFarmers = dealerMandal ? allFarmers.filter(f => f.mandal === dealerMandal) : allFarmers;
        // Filter orders belonging to these farmers (simplified, ideally filter orders by dealerId if available)
        // For MVP Samridhi, assume all orders are relevant for intelligence
        return getCustomerSegments(localFarmers, allOrders);
    }, [allFarmers, allOrders, dealerMandal]);

    const selectedSegment = useMemo(() => segments.find(s => s.id === selectedSegmentId), [segments, selectedSegmentId]);

    const handleBroadcast = (segment: CustomerSegment) => {
        let message = "";
        if (segment.id === 'WHALES') message = "Namaste! As a valued premium partner, we have exclusive bulk deals for you this week. Visit our store for priority service.";
        else if (segment.id === 'DORMANT') message = "Namaste! It's been a while. We have new stock of high-quality fertilizers. Come visit us for a special discount!";
        else if (segment.id === 'PROSPECTS') message = "Namaste! Start your journey with high-yield inputs. Visit our store for a free consultation on your first purchase.";
        else message = "Namaste! Check out our latest arrivals in the Agri-Store.";

        const confirmMsg = `Broadcast to ${segment.farmers.length} farmers in "${segment.label}"?\n\nMessage Preview:\n"${message}"`;
        if (confirm(confirmMsg)) {
            // In reality, this would trigger a backend job. 
            // For demo, we'll just open the first one or show alert.
            alert(`Broadcast simulated! Messages queued for ${segment.farmers.length} farmers.`);
        }
    };

    const handleContact = (mobile: string, name: string) => {
        const link = generateWhatsAppLink(mobile, `Namaste ${name}, contacting you from Hapsara Mitra store.`);
        window.open(link, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-bold text-gray-800 mb-2">Customer Segmentation</h2>
                <p className="text-sm text-gray-500 mb-6">AI-driven grouping of your customer base to help you target the right offer to the right farmer.</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {segments.map(seg => (
                        <SegmentCard 
                            key={seg.id} 
                            segment={seg} 
                            isActive={selectedSegmentId === seg.id} 
                            onClick={() => setSelectedSegmentId(seg.id)} 
                        />
                    ))}
                </div>

                {selectedSegment ? (
                    <div className={`rounded-lg border p-4 ${selectedSegment.color.replace('text-', 'border-').replace('bg-', 'bg-opacity-10 ')}`}>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="font-bold text-lg">{selectedSegment.label} List</h3>
                                <p className="text-sm opacity-80">{selectedSegment.suggestedAction}</p>
                            </div>
                            <button 
                                onClick={() => handleBroadcast(selectedSegment)}
                                className="px-4 py-2 bg-white border border-current rounded-md text-sm font-bold shadow-sm hover:bg-opacity-50 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                Broadcast Offer
                            </button>
                        </div>

                        <div className="bg-white rounded-md border overflow-hidden max-h-80 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Village</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {selectedSegment.farmers.map(f => (
                                        <tr key={f.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{f.fullName}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{f.village}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 font-mono">{f.mobileNumber}</td>
                                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm">
                                                <button 
                                                    onClick={() => handleContact(f.mobileNumber, f.fullName)}
                                                    className="text-green-600 hover:text-green-900 font-semibold"
                                                >
                                                    Chat
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                        <p className="text-gray-500">Select a segment above to view details and take action.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerSegmentsView;
