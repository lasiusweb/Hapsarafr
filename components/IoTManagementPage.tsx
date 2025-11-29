
import React, { useState, useMemo, useEffect } from 'react';
import { User, IoTDevice, IoTDeviceType, IoTDeviceStatus, Farmer } from '../types';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { IoTDeviceModel, FarmerModel, FarmPlotModel, SensorReadingModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import CustomSelect from './CustomSelect';
import { simulateTelemetry, generateDeviceHealth } from '../lib/iotEngine';

interface IoTManagementPageProps {
    onBack: () => void;
    currentUser: User;
}

const DeviceCard: React.FC<{ device: IoTDevice; onSelect: () => void; farmerName?: string }> = ({ device, onSelect, farmerName }) => {
    const isOnline = device.status === IoTDeviceStatus.ACTIVE;
    const isLowBattery = device.batteryLevel < 20;

    return (
        <div onClick={onSelect} className="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors relative overflow-hidden group">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">{device.type.replace('_', ' ')}</p>
                    <h3 className="text-white font-mono text-lg mt-1">{device.serialNumber}</h3>
                    <p className="text-sm text-gray-400 mt-1">{farmerName ? `Linked: ${farmerName}` : 'Unassigned'}</p>
                </div>
                <div className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
            </div>
            
            <div className="mt-4 flex items-center gap-4 text-xs text-gray-300">
                <div className="flex items-center gap-1">
                    <span className={`${isLowBattery ? 'text-red-400' : 'text-green-400'}`}>
                        {device.batteryLevel}% Batt
                    </span>
                </div>
                <div>Last: {new Date(device.lastHeartbeat).toLocaleTimeString()}</div>
            </div>
            
            {/* Scanning Line Effect */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-green-500/10 to-transparent opacity-0 group-hover:opacity-100 translate-y-[-100%] group-hover:translate-y-[100%] transition-all duration-1000 pointer-events-none"></div>
        </div>
    );
};

const LiveMonitor: React.FC<{ device: IoTDeviceModel }> = ({ device }) => {
    const database = useDatabase();
    const [readings, setReadings] = useState<any[]>([]);
    
    useEffect(() => {
        const fetchReadings = async () => {
            const data = await database.get<SensorReadingModel>('sensor_readings').query(
                Q.where('device_id', device.id),
                Q.sortBy('recorded_at', 'desc'),
                Q.take(10)
            ).fetch();
            setReadings(data.reverse().map(r => r._raw));
        };
        
        fetchReadings();
        const interval = setInterval(fetchReadings, 2000);
        return () => clearInterval(interval);
    }, [device, database]);

    return (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="animate-pulse text-green-500">●</span> Live Telemetry: {device.serialNumber}
                </h2>
                <span className="text-xs font-mono text-gray-400">Last 20s</span>
            </div>
            
            <div className="h-48 flex items-end gap-1 border-b border-l border-gray-700 p-2 relative">
                 {/* Grid Lines */}
                 <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                     <div className="border-t border-gray-500 w-full"></div>
                     <div className="border-t border-gray-500 w-full"></div>
                     <div className="border-t border-gray-500 w-full"></div>
                 </div>

                {readings.map((reading, idx) => (
                    <div key={idx} className="flex-1 bg-green-500/50 hover:bg-green-500 transition-colors rounded-t-sm relative group" style={{ height: `${Math.min(reading.value, 100)}%` }}>
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {reading.value} {reading.unit}
                        </div>
                    </div>
                ))}
                {readings.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-gray-500">Waiting for data stream...</p>}
            </div>
        </div>
    );
};

const IoTManagementPage: React.FC<IoTManagementPageProps> = ({ onBack, currentUser }) => {
    const database = useDatabase();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<IoTDeviceModel | null>(null);

    const devices = useQuery(useMemo(() => database.get<IoTDeviceModel>('iot_devices').query(Q.where('tenant_id', currentUser.tenantId)), [database, currentUser.tenantId]));
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(), [database]));
    const plots = useQuery(useMemo(() => database.get<FarmPlotModel>('farm_plots').query(), [database]));

    const farmerMap = useMemo(() => {
        const map = new Map<string, string>();
        plots.forEach(p => {
             const farmer = farmers.find(f => f.id === p.farmerId);
             if (farmer) map.set(p.id, farmer.fullName);
        });
        return map;
    }, [plots, farmers]);

    const plotOptions = useMemo(() => plots.map(p => ({ value: p.id, label: `${p.name} (${farmerMap.get(p.id)})` })), [plots, farmerMap]);

    // Handlers
    const handleAddDevice = async (data: any) => {
        await database.write(async () => {
            await database.get<IoTDeviceModel>('iot_devices').create(d => {
                d.serialNumber = data.serialNumber;
                d.type = data.type;
                d.status = IoTDeviceStatus.ACTIVE;
                d.batteryLevel = 100;
                d.lastHeartbeat = new Date().toISOString();
                d.farmPlotId = data.farmPlotId || undefined;
                d.tenantId = currentUser.tenantId;
                d.syncStatusLocal = 'pending';
            });
        });
        setIsAddModalOpen(false);
    };

    const handleSimulate = async () => {
        if (!selectedDevice) return;
        const telemetry = simulateTelemetry(selectedDevice.type as IoTDeviceType);
        if (telemetry) {
            await database.write(async () => {
                await database.get<SensorReadingModel>('sensor_readings').create(r => {
                    r.deviceId = selectedDevice.id;
                    r.farmPlotId = selectedDevice.farmPlotId || 'unknown';
                    r.sensorType = telemetry.sensorType;
                    r.value = telemetry.value;
                    r.unit = telemetry.unit;
                    r.recordedAt = telemetry.recordedAt;
                    r.source = 'IOT_SIMULATOR';
                    r.tenantId = currentUser.tenantId;
                });
                
                const health = generateDeviceHealth();
                await selectedDevice.update(d => {
                    d.batteryLevel = health.batteryLevel;
                    d.status = health.status;
                    d.lastHeartbeat = new Date().toISOString();
                });
            });
        }
    };

    return (
        <div className="min-h-full bg-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                 <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                             <div className="p-2 bg-green-900/50 rounded-lg border border-green-500/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                             </div>
                             Hapsara Pulse
                        </h1>
                        <p className="text-gray-400 mt-1">IoT Command & Control Center</p>
                    </div>
                    <button onClick={onBack} className="px-4 py-2 bg-gray-800 border border-gray-600 rounded hover:bg-gray-700 transition">Exit Console</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Device List */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-300">Active Fleet ({devices.length})</h3>
                            <button onClick={() => setIsAddModalOpen(true)} className="text-xs bg-green-600 px-3 py-1.5 rounded hover:bg-green-700 font-bold">+ Provision Device</button>
                        </div>
                        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                            {devices.map(d => (
                                <DeviceCard 
                                    key={d.id} 
                                    device={d._raw as unknown as IoTDevice} 
                                    onSelect={() => setSelectedDevice(d)} 
                                    farmerName={farmerMap.get(d.farmPlotId)}
                                />
                            ))}
                            {devices.length === 0 && <div className="text-center p-8 text-gray-600 border border-gray-800 rounded-lg bg-gray-800/50">No devices provisioned.</div>}
                        </div>
                    </div>

                    {/* Right: Monitor */}
                    <div className="lg:col-span-2 space-y-6">
                        {selectedDevice ? (
                            <>
                                <LiveMonitor device={selectedDevice} />
                                
                                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                                    <h3 className="font-bold mb-4">Device Controls</h3>
                                    <div className="flex gap-4">
                                        <button onClick={handleSimulate} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold shadow-lg transition flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            Ping Device (Simulate Data)
                                        </button>
                                        <button className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-gray-300">
                                            Reboot
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                             <div className="h-full flex items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
                                Select a device to view telemetry stream.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isAddModalOpen && (
                <AddDeviceModal 
                    onClose={() => setIsAddModalOpen(false)} 
                    onSave={handleAddDevice}
                    plotOptions={plotOptions}
                />
            )}
        </div>
    );
};

const AddDeviceModal: React.FC<{ onClose: () => void, onSave: (data: any) => void, plotOptions: any[] }> = ({ onClose, onSave, plotOptions }) => {
    const [formData, setFormData] = useState({
        serialNumber: `IOT-${Date.now().toString().slice(-6)}`,
        type: IoTDeviceType.SOIL_SENSOR,
        farmPlotId: ''
    });

    return (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[90]">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
                <div className="p-6 border-b border-gray-700"><h2 className="text-xl font-bold text-white">Provision New Device</h2></div>
                <div className="p-8 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Serial Number</label>
                        <input value={formData.serialNumber} onChange={e => setFormData({...formData, serialNumber: e.target.value})} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white font-mono" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400">Device Type</label>
                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white">
                            {Object.values(IoTDeviceType).map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Link to Plot (Optional)</label>
                        <CustomSelect 
                            options={plotOptions} 
                            value={formData.farmPlotId} 
                            onChange={v => setFormData({...formData, farmPlotId: v})} 
                            placeholder="Unassigned"
                            className="text-black" // Override text color for select inside dark modal if needed, or use custom dark styles
                        />
                    </div>
                </div>
                <div className="bg-gray-900 p-4 flex justify-end gap-4 rounded-b-lg border-t border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={() => onSave(formData)} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-bold">Activate</button>
                </div>
            </div>
        </div>
    );
}

export default IoTManagementPage;
