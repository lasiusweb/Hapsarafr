import React, { useState, useMemo, useEffect } from 'react';
import { User, Farmer, KhataRecord, KhataTransactionType } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { KhataRecordModel, FarmerModel, VendorModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { calculateBalance, getDebtAging, generateSmartReminder } from '../lib/khataEngine';
import { formatCurrency, generateWhatsAppLink } from '../lib/utils';
import CustomSelect from './CustomSelect';

interface KhataScreenProps {
    currentUser: User;
    vendor: VendorModel;
}

// --- Sub-Components ---

const PinLock: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);

    const handlePress = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                if (newPin === '1234') {
                    onUnlock();
                } else {
                    setError(true);
                    setTimeout(() => {
                        setPin('');
                        setError(false);
                    }, 500);
                }
            }
        }
    };

    const handleDelete = () => setPin(prev => prev.slice(0, -1));

    return (
        <div className="flex flex-col items-center justify-center h-[600px] bg-gray-900 text-white rounded-xl p-6">
            <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h2 className="text-xl font-bold">Khata Vault</h2>
                <p className="text-gray-400 text-sm">Enter PIN to access ledger</p>
            </div>

            <div className="flex gap-4 mb-8">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`w-4 h-4 rounded-full ${i < pin.length ? (error ? 'bg-red-500' : 'bg-indigo-500') : 'bg-gray-700'}`}></div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-6 w-full max-w-xs">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button key={num} onClick={() => handlePress(String(num))} className="h-16 w-16 rounded-full bg-gray-800 hover:bg-gray-700 font-bold text-xl flex items-center justify-center transition-colors">
                        {num}
                    </button>
                ))}
                <div className="h-16 w-16"></div>
                <button onClick={() => handlePress('0')} className="h-16 w-16 rounded-full bg-gray-800 hover:bg-gray-700 font-bold text-xl flex items-center justify-center transition-colors">0</button>
                <button onClick={handleDelete} className="h-16 w-16 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>⌫
                </button>
            </div>
            <p className="mt-8 text-xs text-gray-600">Default PIN: 1234</p>
        </div>
    );
};

const CalculatorInput: React.FC<{
    onConfirm: (amount: number, notes: string) => void;
    mode: 'CREDIT' | 'PAYMENT';
    onCancel: () => void;
    farmerName: string;
}> = ({ onConfirm, mode, onCancel, farmerName }) => {
    const [amountStr, setAmountStr] = useState('');
    const [notes, setNotes] = useState('');
    
    const handlePress = (val: string) => {
        if (val === 'back') setAmountStr(prev => prev.slice(0, -1));
        else if (val === '.') { if (!amountStr.includes('.')) setAmountStr(prev => prev + val); }
        else setAmountStr(prev => prev + val);
    };
    
    const quickNotes = mode === 'CREDIT' 
        ? ['Fertilizer', 'Seeds', 'Pesticides', 'Equipment Rental'] 
        : ['Cash', 'UPI', 'Bank Transfer', 'Part Payment'];

    const themeColor = mode === 'CREDIT' ? 'red' : 'green';

    return (
        <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden shadow-xl">
            <div className={`p-4 text-white flex justify-between items-center bg-${themeColor}-600`}>
                <button onClick={onCancel} className="text-white/80 hover:text-white">Cancel</button>
                <h3 className="font-bold">{mode === 'CREDIT' ? 'GIVING CREDIT' : 'RECEIVING PAYMENT'}</h3>
                <div className="w-10"></div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
                <p className="text-center text-gray-500 text-sm mb-1">{farmerName}</p>
                <div className={`text-center text-4xl font-bold mb-6 text-${themeColor}-600 border-b-2 border-${themeColor}-100 pb-2`}>
                    <span className="text-2xl text-gray-400 align-top mr-1">₹</span>
                    {amountStr || '0'}
                </div>
                
                <div className="flex gap-2 overflow-x-auto mb-4 pb-2">
                    {quickNotes.map(note => (
                        <button key={note} onClick={() => setNotes(note)} className={`px-3 py-1 rounded-full text-xs border whitespace-nowrap ${notes === note ? `bg-${themeColor}-100 border-${themeColor}-500 text-${themeColor}-800` : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                            {note}
                        </button>
                    ))}
                </div>
                
                <input 
                    type="text" 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="Add a note..." 
                    className="w-full p-2 bg-gray-50 rounded-md border border-gray-200 text-sm mb-4"
                />

                <div className="grid grid-cols-3 gap-3 flex-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map(num => (
                        <button key={num} onClick={() => handlePress(String(num))} className="rounded-lg bg-gray-50 hover:bg-gray-100 text-xl font-bold text-gray-700 shadow-sm border border-gray-100">
                            {num}
                        </button>
                    ))}
                     <button onClick={() => handlePress('back')} className="rounded-lg bg-gray-100 hover:bg-gray-200 text-xl font-bold text-gray-600 shadow-sm border border-gray-200">
                        ⌫
                    </button>
                </div>

                <button 
                    onClick={() => onConfirm(parseFloat(amountStr), notes)} 
                    disabled={!amountStr || parseFloat(amountStr) <= 0}
                    className={`w-full mt-4 py-4 rounded-lg text-white font-bold text-lg shadow-md bg-${themeColor}-600 hover:bg-${themeColor}-700 disabled:bg-gray-300`}
                >
                    CONFIRM {mode === 'CREDIT' ? 'DEBT' : 'PAYMENT'}
                </button>
            </div>
        </div>
    );
};

// --- Main Component ---

const KhataScreen: React.FC<KhataScreenProps> = ({ currentUser, vendor }) => {
    const database = useDatabase();
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [view, setView] = useState<'LIST' | 'CALCULATOR' | 'LEDGER'>('LIST');
    
    // Selection State
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const [entryMode, setEntryMode] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
    
    // Data
    const allFarmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.sortBy('full_name', 'asc')), [database]));
    const allRecords = useQuery(useMemo(() => database.get<KhataRecordModel>('khata_records').query(Q.where('dealer_id', vendor.id)), [database, vendor.id]));
    
    const farmerMap = useMemo(() => new Map(allFarmers.map(f => [f.id, f])), [allFarmers]);

    // Computed Aggregates
    const farmerSummaries = useMemo(() => {
        const summaries: Record<string, { farmer: FarmerModel, balance: number, lastTx: string | null }> = {};
        
        // Init with all farmers to ensure they appear even if balance is 0
        allFarmers.forEach(f => {
            summaries[f.id] = { farmer: f, balance: 0, lastTx: null };
        });

        // Group records
        const recordsByFarmer: Record<string, KhataRecord[]> = {};
        allRecords.forEach(r => {
            const pid = r.farmerId;
            if (!recordsByFarmer[pid]) recordsByFarmer[pid] = [];
            recordsByFarmer[pid].push(r._raw as unknown as KhataRecord);
        });

        // Calculate
        Object.entries(recordsByFarmer).forEach(([fid, records]) => {
            if (summaries[fid]) {
                summaries[fid].balance = calculateBalance(records);
                const sorted = records.sort((a,b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()); // Desc
                summaries[fid].lastTx = sorted[0]?.transactionDate || null;
            }
        });

        return Object.values(summaries)
            .filter(s => s.balance !== 0) // Only show farmers with activity for cleaner list
            .sort((a, b) => b.balance - a.balance);
    }, [allFarmers, allRecords]);
    
    const totalOutstanding = farmerSummaries.reduce((sum, s) => sum + s.balance, 0);
    const agingStats = useMemo(() => {
        const allRecs = allRecords.map(r => r._raw as unknown as KhataRecord);
        return getDebtAging(allRecs);
    }, [allRecords]);

    // Handlers
    const handleTransaction = async (amount: number, notes: string) => {
        if (!selectedFarmerId) return;
        
        await database.write(async () => {
            await database.get<KhataRecordModel>('khata_records').create(r => {
                r.dealerId = vendor.id;
                r.farmerId = selectedFarmerId;
                r.amount = amount;
                r.transactionType = entryMode === 'CREDIT' ? KhataTransactionType.CREDIT_GIVEN : KhataTransactionType.PAYMENT_RECEIVED;
                r.description = notes || (entryMode === 'CREDIT' ? 'Credit' : 'Payment');
                r.transactionDate = new Date().toISOString();
                r.status = 'SYNCED'; // In offline-first, this means locally saved. Sync happens in bg.
                r.syncStatusLocal = 'pending';
            });
        });

        // Send SMS (Simulated)
        const farmer = farmerMap.get(selectedFarmerId);
        if (farmer) {
            const action = entryMode === 'CREDIT' ? 'Added Credit' : 'Received Payment';
            const msg = `Hapsara Khata: ${action} of ${formatCurrency(amount)} for ${farmer.fullName}. Current Balance: ${formatCurrency(calculateBalance(allRecords.map(r => r._raw as any).filter(r => r.farmerId === selectedFarmerId)) + (entryMode === 'CREDIT' ? amount : -amount))}.`;
            // In prod: trigger backend SMS API. Here: Alert
            // alert(`SMS Sent to ${farmer.mobileNumber}: ${msg}`);
        }

        setView('LIST');
        setSelectedFarmerId('');
    };

    const handleSendReminder = (farmer: FarmerModel, balance: number) => {
        // FIX: Cast farmer to any to access _raw property and then to Farmer
        const { message } = generateSmartReminder((farmer as any)._raw as unknown as Farmer, balance);
        if (message) {
            const link = generateWhatsAppLink(farmer.mobileNumber, message);
            window.open(link, '_blank');
        } else {
            alert("No urgent reminder necessary based on harvest data.");
        }
    };

    // --- Render ---

    if (!isUnlocked) return <PinLock onUnlock={() => setIsUnlocked(true)} />;

    if (view === 'CALCULATOR') {
        return (
            <CalculatorInput 
                onConfirm={handleTransaction} 
                mode={entryMode} 
                onCancel={() => setView('LIST')}
                farmerName={farmerMap.get(selectedFarmerId)?.fullName || 'Unknown'} 
            />
        );
    }

    if (view === 'LEDGER' && selectedFarmerId) {
        const farmer = farmerMap.get(selectedFarmerId)!;
        const records = allRecords
            .filter(r => r.farmerId === selectedFarmerId)
            .sort((a,b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
        const balance = calculateBalance(records.map(r => (r as any)._raw as any));
        const aging = getDebtAging(records.map(r => (r as any)._raw as any));
        const reminder = generateSmartReminder((farmer as any)._raw as unknown as Farmer, balance);

        return (
            <div className="bg-white rounded-xl shadow-md h-[600px] flex flex-col">
                <div className="p-4 border-b flex items-center gap-4">
                    <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-100 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex-1">
                        <h2 className="font-bold text-lg text-gray-800">{farmer.fullName}</h2>
                        <p className="text-xs text-gray-500">{farmer.mobileNumber}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Balance</p>
                        <p className={`font-bold text-xl ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(balance)}</p>
                    </div>
                </div>

                {/* Aging Bar */}
                {balance > 0 && (
                    <div className="bg-gray-50 p-3 border-b">
                        <div className="flex text-xs text-gray-500 mb-1 justify-between">
                            <span>Aging Analysis</span>
                            <span>Risk Level: {aging.days90Plus > 0 ? 'High' : aging.days60 > 0 ? 'Medium' : 'Low'}</span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 w-full">
                            <div style={{ width: `${(aging.current/balance)*100}%` }} className="bg-green-500 h-full" title="Current"></div>
                            <div style={{ width: `${(aging.days30/balance)*100}%` }} className="bg-yellow-400 h-full" title="30-60 Days"></div>
                            <div style={{ width: `${(aging.days60/balance)*100}%` }} className="bg-orange-500 h-full" title="60-90 Days"></div>
                            <div style={{ width: `${(aging.days90Plus/balance)*100}%` }} className="bg-red-600 h-full" title="90+ Days"></div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 p-3">
                     <button onClick={() => { setEntryMode('CREDIT'); setView('CALCULATOR'); }} className="py-3 bg-red-50 text-red-700 font-bold rounded-lg border border-red-200 hover:bg-red-100 flex items-center justify-center gap-2">
                        <span className="text-xl">+</span> Give Credit
                     </button>
                     <button onClick={() => { setEntryMode('PAYMENT'); setView('CALCULATOR'); }} className="py-3 bg-green-50 text-green-700 font-bold rounded-lg border border-green-200 hover:bg-green-100 flex items-center justify-center gap-2">
                        <span className="text-xl">-</span> Accept Payment
                     </button>
                </div>

                {/* Smart Reminder */}
                {reminder.shouldRemind && (
                    <div className="mx-3 mb-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center">
                        <div className="text-xs text-indigo-800">
                            <p className="font-bold">Harvest Season Detected</p>
                            <p>Farmer likely has cash flow now.</p>
                        </div>
                        <button onClick={() => handleSendReminder(farmer, balance)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.017-1.04 2.481 0 1.461 1.063 2.875 1.211 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                            Remind
                        </button>
                    </div>
                )}

                {/* Ledger History */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                    {records.map(r => (
                        <div key={r.id} className="bg-white p-3 rounded border border-gray-200 flex justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{r.description}</p>
                                <p className="text-xs text-gray-500">{new Date(r.transactionDate).toLocaleDateString()}</p>
                            </div>
                            <span className={`font-bold ${r.transactionType.includes('CREDIT') ? 'text-red-600' : 'text-green-600'}`}>
                                {r.transactionType.includes('CREDIT') ? '+' : '-'}{formatCurrency(r.amount)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Default: LIST View
    return (
        <div className="space-y-6">
            {/* Financial Health Card */}
            <div className="bg-gray-900 rounded-xl p-6 text-white shadow-lg">
                <p className="text-sm text-gray-400 font-medium uppercase">Total Receivables</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(totalOutstanding)}</p>
                
                <div className="mt-4 flex h-3 rounded-full overflow-hidden bg-gray-700 w-full">
                    <div style={{ width: `${(agingStats.current/totalOutstanding)*100}%` }} className="bg-green-500 h-full"></div>
                    <div style={{ width: `${(agingStats.days30/totalOutstanding)*100}%` }} className="bg-yellow-400 h-full"></div>
                    <div style={{ width: `${(agingStats.days60/totalOutstanding)*100}%` }} className="bg-orange-500 h-full"></div>
                    <div style={{ width: `${(agingStats.days90Plus/totalOutstanding)*100}%` }} className="bg-red-600 h-full"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Current</span>
                    <span>90+ Days</span>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-2 rounded-lg shadow-sm border">
                 <CustomSelect 
                    options={allFarmers.map(f => ({ value: f.id, label: f.fullName }))}
                    value=""
                    onChange={(id) => { setSelectedFarmerId(id); setView('LEDGER'); }}
                    placeholder="🔍 Search Farmer Ledger..."
                />
            </div>

            {/* Farmer List */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 border-b bg-gray-50"><h3 className="font-bold text-gray-700">Outstanding Balances</h3></div>
                <div className="divide-y">
                    {farmerSummaries.map(({ farmer, balance, lastTx }) => (
                        <button 
                            key={farmer.id} 
                            onClick={() => { setSelectedFarmerId(farmer.id); setView('LEDGER'); }}
                            className="w-full text-left p-4 hover:bg-gray-50 flex justify-between items-center transition-colors"
                        >
                            <div>
                                <p className="font-bold text-gray-800">{farmer.fullName}</p>
                                <p className="text-xs text-gray-500">Last: {lastTx ? new Date(lastTx).toLocaleDateString() : 'Never'}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-red-600">{formatCurrency(balance)}</p>
                                <p className="text-xs text-gray-400">Due</p>
                            </div>
                        </button>
                    ))}
                    {farmerSummaries.length === 0 && <div className="p-8 text-center text-gray-500">No outstanding debts.</div>}
                </div>
            </div>

            {/* Floating Action Button */}
            <button 
                onClick={() => { setSelectedFarmerId(''); setEntryMode('CREDIT'); setView('CALCULATOR'); }}
                className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-lg text-white flex items-center justify-center text-3xl font-bold hover:bg-indigo-700 hover:scale-105 transition-transform z-20"
            >
                +
            </button>
        </div>
    );
};

export default KhataScreen;