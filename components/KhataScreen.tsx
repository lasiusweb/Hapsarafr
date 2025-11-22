
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

const CalculatorInput: React.FC<{
    onConfirm: (amount: number, notes: string, dueDate: string) => void;
    mode: 'CREDIT' | 'PAYMENT';
    onCancel: () => void;
    farmerName: string;
}> = ({ onConfirm, mode, onCancel, farmerName }) => {
    const [amountStr, setAmountStr] = useState('');
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState('');
    
    const handlePress = (val: string) => {
        if (val === 'back') setAmountStr(prev => prev.slice(0, -1));
        else if (val === '.') { if (!amountStr.includes('.')) setAmountStr(prev => prev + val); }
        else setAmountStr(prev => prev + val);
    };
    
    const quickNotes = mode === 'CREDIT' 
        ? ['Fertilizer', 'Seeds', 'Pesticides', 'Equipment'] 
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
                
                <div className="space-y-3 mb-4">
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note..." className="w-full p-2 bg-gray-50 rounded-md border border-gray-200 text-sm" />
                    {mode === 'CREDIT' && (
                        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-md border border-gray-200">
                            <label className="text-xs font-bold text-gray-500 whitespace-nowrap">Due Date:</label>
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-transparent text-sm text-gray-700 outline-none" />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-3 flex-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map(num => (
                        <button key={num} onClick={() => handlePress(String(num))} className="rounded-lg bg-gray-50 hover:bg-gray-100 text-xl font-bold text-gray-700 shadow-sm border border-gray-100">{num}</button>
                    ))}
                     <button onClick={() => handlePress('back')} className="rounded-lg bg-gray-100 hover:bg-gray-200 text-xl font-bold text-gray-600 shadow-sm border border-gray-200">⌫</button>
                </div>

                <button onClick={() => onConfirm(parseFloat(amountStr), notes, dueDate)} disabled={!amountStr || parseFloat(amountStr) <= 0} className={`w-full mt-4 py-4 rounded-lg text-white font-bold text-lg shadow-md bg-${themeColor}-600 hover:bg-${themeColor}-700 disabled:bg-gray-300`}>
                    CONFIRM {mode === 'CREDIT' ? 'DEBT' : 'PAYMENT'}
                </button>
            </div>
        </div>
    );
};

const KhataScreen: React.FC<KhataScreenProps> = ({ currentUser, vendor }) => {
    const database = useDatabase();
    const [view, setView] = useState<'LIST' | 'CALCULATOR' | 'LEDGER'>('LIST');
    const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
    const [entryMode, setEntryMode] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
    
    const allFarmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.sortBy('full_name', 'asc')), [database]));
    const allRecords = useQuery(useMemo(() => database.get<KhataRecordModel>('khata_records').query(Q.where('dealer_id', vendor.id)), [database, vendor.id]));
    
    const farmerMap = useMemo(() => new Map(allFarmers.map(f => [f.id, f])), [allFarmers]);

    const farmerSummaries = useMemo(() => {
        const summaries: Record<string, { farmer: FarmerModel, balance: number, lastTx: string | null }> = {};
        allFarmers.forEach(f => { summaries[f.id] = { farmer: f, balance: 0, lastTx: null }; });

        const recordsByFarmer: Record<string, KhataRecord[]> = {};
        allRecords.forEach(r => {
            const pid = r.farmerId;
            if (!recordsByFarmer[pid]) recordsByFarmer[pid] = [];
            recordsByFarmer[pid].push(r._raw as unknown as KhataRecord);
        });

        Object.entries(recordsByFarmer).forEach(([fid, records]) => {
            if (summaries[fid]) {
                summaries[fid].balance = calculateBalance(records);
                const sorted = records.sort((a,b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
                summaries[fid].lastTx = sorted[0]?.transactionDate || null;
            }
        });

        return Object.values(summaries).filter(s => s.balance !== 0).sort((a, b) => b.balance - a.balance);
    }, [allFarmers, allRecords]);
    
    const totalOutstanding = farmerSummaries.reduce((sum, s) => sum + s.balance, 0);
    const agingStats = useMemo(() => getDebtAging(allRecords.map(r => r._raw as unknown as KhataRecord)), [allRecords]);

    const handleTransaction = async (amount: number, notes: string, dueDate: string) => {
        if (!selectedFarmerId) return;
        await database.write(async () => {
            await database.get<KhataRecordModel>('khata_records').create(r => {
                r.dealerId = vendor.id;
                r.farmerId = selectedFarmerId;
                r.amount = amount;
                r.transactionType = entryMode === 'CREDIT' ? KhataTransactionType.CREDIT_GIVEN : KhataTransactionType.PAYMENT_RECEIVED;
                r.description = notes || (entryMode === 'CREDIT' ? 'Credit' : 'Payment');
                r.transactionDate = new Date().toISOString();
                r.dueDate = dueDate || undefined;
                r.status = 'SYNCED';
                r.syncStatusLocal = 'pending';
            });
        });

        const farmer = farmerMap.get(selectedFarmerId);
        if (farmer) {
            const newBalance = calculateBalance(allRecords.map(r => r._raw as any).filter(r => r.farmerId === selectedFarmerId)) + (entryMode === 'CREDIT' ? amount : -amount);
            let msg = `🧾 *Hapsara Khata Alert*\n\nNamaste ${farmer.fullName},\n\n${entryMode === 'CREDIT' ? 'Added Credit' : 'Payment Received'}: *${formatCurrency(amount)}*\nNote: ${notes || '-'}`;
            if (dueDate) msg += `\n📅 Due Date: ${new Date(dueDate).toLocaleDateString()}`;
            msg += `\n\n💰 Net Balance: *${formatCurrency(newBalance)}*`;
            
            window.open(generateWhatsAppLink(farmer.mobileNumber, msg), '_blank');
        }
        setView('LIST');
        setSelectedFarmerId('');
    };

    const handleSendReminder = (farmer: FarmerModel, balance: number) => {
        const { message } = generateSmartReminder((farmer as any)._raw as unknown as Farmer, balance);
        if (message) window.open(generateWhatsAppLink(farmer.mobileNumber, message), '_blank');
        else alert("No urgent reminder needed.");
    };

    if (view === 'CALCULATOR') {
        return <CalculatorInput onConfirm={handleTransaction} mode={entryMode} onCancel={() => setView('LIST')} farmerName={farmerMap.get(selectedFarmerId)?.fullName || 'Unknown'} />;
    }

    if (view === 'LEDGER' && selectedFarmerId) {
        const farmer = farmerMap.get(selectedFarmerId)!;
        const records = allRecords.filter(r => r.farmerId === selectedFarmerId).sort((a,b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
        const balance = calculateBalance(records.map(r => (r as any)._raw as any));
        const aging = getDebtAging(records.map(r => (r as any)._raw as any));
        const reminder = generateSmartReminder((farmer as any)._raw as unknown as Farmer, balance);

        return (
            <div className="bg-white rounded-xl shadow-md h-[600px] flex flex-col">
                <div className="p-4 border-b flex items-center gap-4">
                    <button onClick={() => setView('LIST')} className="p-2 hover:bg-gray-100 rounded-full">←</button>
                    <div className="flex-1">
                        <h2 className="font-bold text-lg text-gray-800">{farmer.fullName}</h2>
                        <p className="text-xs text-gray-500">{farmer.mobileNumber}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">Balance</p>
                        <p className={`font-bold text-xl ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(balance)}</p>
                    </div>
                </div>

                {balance > 0 && (
                    <div className="bg-gray-50 p-3 border-b">
                        <div className="flex text-xs text-gray-500 mb-1 justify-between"><span>Aging</span><span>Risk: {aging.days90Plus > 0 ? 'High' : 'Low'}</span></div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 w-full">
                            <div style={{ width: `${(aging.current/balance)*100}%` }} className="bg-green-500 h-full"></div>
                            <div style={{ width: `${(aging.days30/balance)*100}%` }} className="bg-yellow-400 h-full"></div>
                            <div style={{ width: `${(aging.days90Plus/balance)*100}%` }} className="bg-red-600 h-full"></div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2 p-3">
                     <button onClick={() => { setEntryMode('CREDIT'); setView('CALCULATOR'); }} className="py-3 bg-red-50 text-red-700 font-bold rounded-lg border border-red-200 hover:bg-red-100">+ Give Credit</button>
                     <button onClick={() => { setEntryMode('PAYMENT'); setView('CALCULATOR'); }} className="py-3 bg-green-50 text-green-700 font-bold rounded-lg border border-green-200 hover:bg-green-100">- Accept Payment</button>
                </div>

                {reminder.shouldRemind && (
                    <div className="mx-3 mb-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center">
                        <div className="text-xs text-indigo-800"><p className="font-bold">Harvest Season</p><p>Good time to collect.</p></div>
                        <button onClick={() => handleSendReminder(farmer, balance)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700">Send Reminder</button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                    {records.map(r => (
                        <div key={r.id} className="bg-white p-3 rounded border border-gray-200 flex justify-between">
                            <div><p className="text-sm font-semibold text-gray-800">{r.description}</p><p className="text-xs text-gray-500">{new Date(r.transactionDate).toLocaleDateString()} {r.dueDate ? `| Due: ${new Date(r.dueDate).toLocaleDateString()}` : ''}</p></div>
                            <span className={`font-bold ${r.transactionType.includes('CREDIT') ? 'text-red-600' : 'text-green-600'}`}>{r.transactionType.includes('CREDIT') ? '+' : '-'}{formatCurrency(r.amount)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-6 text-white shadow-lg">
                <p className="text-sm text-gray-400 font-medium uppercase">Total Receivables</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(totalOutstanding)}</p>
                <div className="mt-4 flex h-3 rounded-full overflow-hidden bg-gray-700 w-full">
                    <div style={{ width: `${(agingStats.current/totalOutstanding)*100}%` }} className="bg-green-500 h-full"></div>
                    <div style={{ width: `${(agingStats.days90Plus/totalOutstanding)*100}%` }} className="bg-red-600 h-full"></div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Current</span><span>90+ Days</span></div>
            </div>

            <div className="bg-white p-2 rounded-lg shadow-sm border"><CustomSelect options={allFarmers.map(f => ({ value: f.id, label: f.fullName }))} value="" onChange={(id) => { setSelectedFarmerId(id); setView('LEDGER'); }} placeholder="🔍 Search Farmer Ledger..." /></div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden divide-y">
                <div className="p-4 border-b bg-gray-50"><h3 className="font-bold text-gray-700">Outstanding Balances</h3></div>
                {farmerSummaries.map(({ farmer, balance, lastTx }) => (
                    <button key={farmer.id} onClick={() => { setSelectedFarmerId(farmer.id); setView('LEDGER'); }} className="w-full text-left p-4 hover:bg-gray-50 flex justify-between items-center transition-colors">
                        <div><p className="font-bold text-gray-800">{farmer.fullName}</p><p className="text-xs text-gray-500">Last: {lastTx ? new Date(lastTx).toLocaleDateString() : 'Never'}</p></div>
                        <div className="text-right"><p className="font-bold text-red-600">{formatCurrency(balance)}</p></div>
                    </button>
                ))}
                {farmerSummaries.length === 0 && <div className="p-8 text-center text-gray-500">No outstanding debts.</div>}
            </div>
            
            <button onClick={() => { setSelectedFarmerId(''); setEntryMode('CREDIT'); setView('CALCULATOR'); }} className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-lg text-white flex items-center justify-center text-3xl font-bold hover:bg-indigo-700 hover:scale-105 transition-transform z-20">+</button>
        </div>
    );
};

export default KhataScreen;
