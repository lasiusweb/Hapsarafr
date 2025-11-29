
import { IoTDeviceType, IoTDeviceStatus } from '../types';

// Simulated random telemetry data
export const simulateTelemetry = (type: IoTDeviceType) => {
    const now = new Date().toISOString();
    
    switch(type) {
        case IoTDeviceType.SOIL_SENSOR:
            return {
                sensorType: 'MOISTURE',
                value: Math.floor(Math.random() * 60) + 20, // 20-80%
                unit: '%',
                recordedAt: now
            };
        case IoTDeviceType.WEATHER_STATION:
            return {
                sensorType: 'TEMPERATURE',
                value: Math.floor(Math.random() * 15) + 25, // 25-40C
                unit: '°C',
                recordedAt: now
            };
        case IoTDeviceType.SMART_TRAP:
            return {
                sensorType: 'PEST_COUNT',
                value: Math.floor(Math.random() * 10), // 0-10 pests
                unit: 'count',
                recordedAt: now
            };
        default:
            return null;
    }
};

export const generateDeviceHealth = () => {
    const batteryLevel = Math.floor(Math.random() * 100);
    let status = IoTDeviceStatus.ACTIVE;
    
    if (batteryLevel < 10) status = IoTDeviceStatus.INACTIVE;
    if (Math.random() > 0.95) status = IoTDeviceStatus.ERROR; // 5% chance of error

    return { status, batteryLevel };
};
