import React, { useState, useMemo } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, ServicePointModel, CollectionAppointmentModel, ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, ActivityType } from '../types';
import CustomSelect from './CustomSelect';

const AppointmentScheduler: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState('');
    const [selectedServicePointId, setSelectedServicePointId] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Data fetching
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('tenant_id', currentUser.tenantId)), [database, currentUser.tenantId]));
    const servicePoints = useQuery(useMemo(() => database.get<ServicePointModel>('service_points').query(Q.where('tenant_id', currentUser.tenantId)), [database, currentUser.tenantId]));

    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);
    const servicePointOptions = useMemo(() => servicePoints.map(sp => ({ value: sp.id, label: sp.name })), [servicePoints]);

    // This simulates the backend's "Weighted Scoring Model" for the UI
    const timeSlots = useMemo(() => {
        // In a real app, this would be an API call based on date and service point
        return [
            { time: '09:00', recommended: true }, { time: '09:30', recommended: false },
            { time: '10:00', recommended: false }, { time: '10:30', recommended: true },
            { time: '11:00', recommended: false }, { time: '11:30', recommended: false },
            { time: '14:00', recommended: true }, { time: '14:30', recommended: false },
            { time: '15:00', recommended: false }, { time: '15:30', recommended: false },
        ];
    }, [selectedDate, selectedServicePointId]);
    
    const handleBookAppointment = async () => {
        if (!selectedFarmerId || !selectedServicePointId || !selectedSlot) {
            alert("Please select a farmer, service point, and time slot.");
            return;
        }
        setIsSubmitting(true);
        try {
            await database.write(async () => {
                const [hour, minute] = selectedSlot.split(':').map(Number);
                const startTime = new Date(selectedDate);
                startTime.setUTCHours(hour, minute, 0, 0);
                const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 min slot

                await database.get<CollectionAppointmentModel>('collection_appointments').create(app => {
                    app.farmerId = selectedFarmerId;
                    app.servicePointId = selectedServicePointId;
                    app.startTime = startTime;
                    app.endTime = endTime;
                    app.status = 'scheduled';
                    app.syncStatusLocal = 'pending';
                });

                 await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = selectedFarmerId;
                    log.activityType = ActivityType.COLLECTION_APPOINTMENT_BOOKED;
                    log.description = `Booked collection appointment for ${startTime.toLocaleString()}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
            alert('Appointment booked successfully!');
            // Reset form
            setSelectedSlot('');
        } catch (error) {
            console.error("Failed to book appointment:", error);
            alert("An error occurred while booking.");
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Book a Collection Center Appointment</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <CustomSelect label="1. Select Farmer" options={farmerOptions} value={selectedFarmerId} onChange={setSelectedFarmerId} placeholder="-- Choose a Farmer --" />
                 <CustomSelect label="2. Select Service Point" options={servicePointOptions} value={selectedServicePointId} onChange={setSelectedServicePointId} placeholder="-- Choose a Center --" />
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">3. Select Date</label>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm" />
                 </div>
            </div>

            {selectedFarmerId && selectedServicePointId && (
                <div className="mt-6">
                    <h3 className="font-semibold text-gray-700 mb-2">4. Select an Available Time Slot</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {timeSlots.map(slot => (
                            <button
                                key={slot.time}
                                onClick={() => setSelectedSlot(slot.time)}
                                className={`p-3 rounded-lg border-2 text-center font-semibold transition-all ${selectedSlot === slot.time ? 'bg-green-600 text-white border-green-700' : 'bg-white hover:border-green-400'}`}
                            >
                                {slot.time}
                                {slot.recommended && <span title="Recommended slot" className="text-yellow-400 ml-1">★</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="mt-8 pt-6 border-t flex justify-end">
                <button
                    onClick={handleBookAppointment}
                    disabled={!selectedSlot || isSubmitting}
                    className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
                >
                    {isSubmitting ? 'Booking...' : 'Confirm Appointment'}
                </button>
            </div>
        </div>
    );
};

export default AppointmentScheduler;