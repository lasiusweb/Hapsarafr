// components/IntellectusAlerts.tsx
import React, { useState, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { getMockWeatherData } from '../lib/climateEngine'; // This import needs to be adjusted based on its original location

const IntellectusAlerts: React.FC = () => {
    const database = useDatabase();
    const [alerts, setAlerts] = useState<{ type: 'PEST' | 'WEATHER', title: string, desc: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAlerts = async () => {
            setLoading(true);
            const newAlerts: { type: 'PEST' | 'WEATHER', title: string, desc: string }[] = [];

            // 1. Weather Check (Mocked)
            const weather = getMockWeatherData();
            if (weather.tempMax > 38) {
                newAlerts.push({ type: 'WEATHER', title: 'Extreme Heat Warning', desc: `Temps hitting ${weather.tempMax.toFixed(1)}°C. Advise farmers to irrigate young palms immediately.` });
            }

            // 2. Pest Outbreak Check (Scan logs)
            try {
                // Fetch recent logs with metadata (scan results)
                const recentScans = await database.get<ActivityLogModel>('activity_logs').query(
                    Q.where('activity_type', 'CROP_HEALTH_SCAN_COMPLETED'),
                    Q.sortBy('created_at', 'desc'),
                    Q.take(50) // Limit to last 50 scans for performance
                ).fetch();

                const diagnosisCounts: Record<string, number> = {};

                recentScans.forEach(log => {
                    if (log.metadataJson) {
                        try {
                            const meta = JSON.parse(log.metadataJson);
                            if (meta.diagnosis && meta.diagnosis !== 'Healthy' && meta.severity !== 'LOW') {
                                diagnosisCounts[meta.diagnosis] = (diagnosisCounts[meta.diagnosis] || 0) + 1;
                            }
                        } catch (e) { }
                    }
                });

                // Threshold: 3 or more scans of same disease implies outbreak risk
                Object.entries(diagnosisCounts).forEach(([disease, count]) => {
                    if (count >= 3) {
                        newAlerts.push({
                            type: 'PEST',
                            title: `Potential ${disease} Outbreak`,
                            desc: `${count} severe cases reported recently. Consider issuing a directive.`
                        });
                    }
                });

            } catch (e) {
                console.error("Failed to check pest logs", e);
            }

            setAlerts(newAlerts);
            setLoading(false);
        };
        checkAlerts();
    }, [database]);

    if (loading || alerts.length === 0) return null;

    return (
        <div className="mb-6 grid gap-4">
            {alerts.map((alert, idx) => (
                <div key={idx} className={`p-4 rounded-lg border-l-4 shadow-sm flex items-start gap-4 ${alert.type === 'PEST' ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'}`}>
                    <div className={`p-2 rounded-full ${alert.type === 'PEST' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <h4 className={`font-bold ${alert.type === 'PEST' ? 'text-red-800' : 'text-orange-800'}`}>{alert.title}</h4>
                        <p className="text-sm text-gray-700 mt-1">{alert.desc}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default IntellectusAlerts;