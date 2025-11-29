
import React, { useState, useMemo, useEffect } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { FarmerModel, ServicePointModel, CollectionAppointmentModel, ActivityLogModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User, ActivityType, BillableEvent, CollectionAppointment } from '../types';
import CustomSelect from './CustomSelect';
import { deductCredits } from '../lib/billing';
import { SERVICE_PRICING } from '../data/subscriptionPlans';

const AppointmentScheduler: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const database = useDatabase();
    const [selectedFarmerId, setSelectedFarmerId] = useState('');
    const [selectedServicePointId, setSelectedServicePointId] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rescheduleAppointment, setRescheduleAppointment] = useState<CollectionAppointmentModel | null>(null);
    const [delayNotification, setDelayNotification] = useState<{ appointment: CollectionAppointmentModel, message: string } | null>(null);


    // Data fetching
    const farmers = useQuery(useMemo(() => database.get<FarmerModel>('farmers').query(Q.where('tenant_id', currentUser.tenantId)), [database, currentUser.tenantId]));
    const servicePoints = useQuery(useMemo(() => 
        database.get<ServicePointModel>('service_points')
            .query(
                Q.where('tenant_id', currentUser.tenantId),
                Q.where('is_active', true)
            ), 
    [database, currentUser.tenantId]));

    // Fetch existing appointments for the selected date and point to calculate capacity
    const dailyAppointments = useQuery(useMemo(() => {
        if (!selectedDate || !selectedServicePointId) return database.get<CollectionAppointmentModel>('collection_appointments').query(Q.where('id', 'null'));
        return database.get<CollectionAppointmentModel>('collection_appointments')
            .query(Q.where('service_point_id', selectedServicePointId));
    }, [database, selectedDate, selectedServicePointId]));

    // Fetch active appointments for the selected farmer to show "My Appointments"
    const farmerAppointments = useQuery(useMemo(() => {
        if (!selectedFarmerId) return database.get<CollectionAppointmentModel>('collection_appointments').query(Q.where('id', 'null'));
        return database.get<CollectionAppointmentModel>('collection_appointments').query(
            Q.where('farmer_id', selectedFarmerId),
            Q.where('status', 'scheduled') // Only active ones
        );
    }, [database, selectedFarmerId]));


    const farmerOptions = useMemo(() => farmers.map(f => ({ value: f.id, label: `${f.fullName} (${f.hapId || 'N/A'})`})), [farmers]);
    const servicePointOptions = useMemo(() => servicePoints.map(sp => ({ value: sp.id, label: sp.name })), [servicePoints]);

    const selectedFarmer = useMemo(() => farmers.find(f => f.id === selectedFarmerId), [farmers, selectedFarmerId]);
    const currentServicePoint = useMemo(() => servicePoints.find(sp => sp.id === selectedServicePointId), [servicePoints, selectedServicePointId]);

    const generateTimeSlots = () => {
        const slots = [];
        const startHour = 6; // 6 AM
        const endHour = 18;  // 6 PM
        const capacity = currentServicePoint?.capacityPerSlot || 5;

        // Determine "Smallholder" status (< 5 acres)
        const isSmallholder = selectedFarmer && (selectedFarmer.approvedExtent || 0) < 5;

        // Filter appointments for the selected day
        const dayAppointments = dailyAppointments.filter(app => {
            const appDate = new Date(app.startTime).toISOString().split('T')[0];
            return appDate === selectedDate;
        });

        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                
                // Count existing bookings for this slot
                const bookings = dayAppointments.filter(app => {
                    const appTime = new Date(app.startTime);
                    return appTime.getHours() === hour && appTime.getMinutes() === minute;
                }).length;

                const remaining = capacity - bookings;
                
                // Logic for Smallholder Priority (6 AM - 7 AM)
                const isPriorityHour = hour === 6;
                const isRestricted = isPriorityHour && !isSmallholder;

                slots.push({
                    time: timeString,
                    capacity,
                    remaining,
                    isFull: remaining <= 0,
                    isPriority: isPriorityHour,
                    isRestricted, // Cannot book if restricted
                });
            }
        }
        return slots;
    };

    const timeSlots = useMemo(() => selectedServicePointId ? generateTimeSlots() : [], [selectedDate, selectedServicePointId, dailyAppointments, currentServicePoint, selectedFarmer]);
    
    const handleBookAppointment = async () => {
        if (!selectedFarmerId || !selectedServicePointId || !selectedSlot) {
            alert("Please select a farmer, service point, and time slot.");
            return;
        }
        
        // If not rescheduling, check credits. Rescheduling is free/penalty-free.
        if (!rescheduleAppointment && !confirm(`Booking this appointment will cost ${SERVICE_PRICING.APPOINTMENT_BOOKED} credits. Proceed?`)) {
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Deduct Credits (Only for new bookings)
            if (!rescheduleAppointment) {
                const billingResult = await deductCredits(
                    database, 
                    currentUser.tenantId, 
                    BillableEvent.APPOINTMENT_BOOKED, 
                    { farmerId: selectedFarmerId, servicePointId: selectedServicePointId }
                );

                if ('error' in billingResult) {
                    alert(`Billing Error: ${billingResult.error}`);
                    setIsSubmitting(false);
                    return;
                }
            }

            // 2. Book Appointment
            await database.write(async () => {
                const [hour, minute] = selectedSlot.split(':').map(Number);
                const startTime = new Date(selectedDate);
                startTime.setHours(hour, minute, 0, 0); // Use local time setter to avoid UTC confusion in demo
                const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 min slot

                if (rescheduleAppointment) {
                     await rescheduleAppointment.update(app => {
                        app.startTime = startTime.toISOString();
                        app.endTime = endTime.toISOString();
                        app.servicePointId = selectedServicePointId; // Allow changing location too
                        app.status = 'scheduled';
                        app.syncStatusLocal = 'pending';
                     });
                     
                     // Log rescheduling
                     await database.get<ActivityLogModel>('activity_logs').create(log => {
                        log.farmerId = selectedFarmerId;
                        log.activityType = ActivityType.STATUS_CHANGE;
                        log.description = `Rescheduled appointment to ${startTime.toLocaleString()}. No penalty applied.`;
                        log.createdBy = currentUser.id;
                        log.tenantId = currentUser.tenantId;
                    });
                } else {
                    await database.get<CollectionAppointmentModel>('collection_appointments').create(app => {
                        app.farmerId = selectedFarmerId;
                        app.servicePointId = selectedServicePointId;
                        app.startTime = startTime.toISOString();
                        app.endTime = endTime.toISOString();
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
                }
            });

            alert(`Appointment ${rescheduleAppointment ? 'rescheduled' : 'booked'} successfully! No penalty applied.`);
            setSelectedSlot('');
            setRescheduleAppointment(null);
            setDelayNotification(null); // Clear any delay notices
        } catch (error) {
            console.error("Failed to book appointment:", error);
            alert("An error occurred while booking.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelAppointment = async (appointment: CollectionAppointmentModel) => {
        if (!confirm("Are you sure you want to cancel this appointment? There is no penalty.")) return;
        
        try {
            await database.write(async () => {
                await appointment.update(app => {
                    app.status = 'cancelled';
                    app.cancellationReason = 'Farmer request (Penalty-Free)';
                    app.syncStatusLocal = 'pending';
                });
                 await database.get<ActivityLogModel>('activity_logs').create(log => {
                    log.farmerId = appointment.farmerId;
                    log.activityType = ActivityType.STATUS_CHANGE;
                    log.description = `Cancelled appointment scheduled for ${new Date(appointment.startTime).toLocaleString()}.`;
                    log.createdBy = currentUser.id;
                    log.tenantId = currentUser.tenantId;
                });
            });
        } catch (e) {
            console.error("Cancellation failed", e);
            alert("Failed to cancel appointment");
        }
    };

    const initiateReschedule = (appointment: CollectionAppointmentModel) => {
        setRescheduleAppointment(appointment);
        setSelectedServicePointId(appointment.servicePointId);
        // Pre-fill current date, user can change it
        setSelectedDate(new Date(appointment.startTime).toISOString().split('T')[0]);
        // Scroll to top to show scheduler
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Mock function to simulate a delay trigger from backend
    const simulateDelay = (appointment: CollectionAppointmentModel) => {
        setDelayNotification({
            appointment,
            message: `⚠️ Delay Alert: Operations at the collection center are running 45 mins late due to equipment maintenance. You can reschedule for free or wait.`
        });
    };

    return (
        <div className="space-y-8">
            
            {/* Delay Notification Banner */}
            {delayNotification && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded shadow-md flex justify-between items-center animate-pulse">
                    <div>
                        <h3 className="font-bold text-yellow-800">Appointment Delay Detected</h3>
                        <p className="text-sm text-yellow-700">{delayNotification.message}</p>
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => initiateReschedule(delayNotification.appointment)}
                            className="px-3 py-1.5 bg-yellow-600 text-white text-sm font-bold rounded hover:bg-yellow-700"
                        >
                            Reschedule Now (Free)
                        </button>
                         <button 
                            onClick={() => setDelayNotification(null)}
                            className="px-3 py-1.5 text-yellow-800 text-sm font-semibold hover:bg-yellow-100 rounded"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            <div className={`transition-all ${rescheduleAppointment ? 'border-2 border-blue-400 p-4 rounded-lg bg-blue-50' : ''}`}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                    {rescheduleAppointment ? 'Reschedule Appointment (No Penalty)' : 'Book New Appointment'}
                </h2>
                {rescheduleAppointment && (
                    <div className="mb-4 flex justify-between items-center">
                        <p className="text-sm text-blue-700">
                            Rescheduling for: <strong>{new Date(rescheduleAppointment.startTime).toLocaleString()}</strong>
                        </p>
                        <button onClick={() => { setRescheduleAppointment(null); setSelectedSlot(''); }} className="text-xs text-blue-600 underline">Cancel Rescheduling</button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <CustomSelect 
                        label="1. Select Farmer" 
                        options={farmerOptions} 
                        value={selectedFarmerId} 
                        onChange={setSelectedFarmerId} 
                        placeholder="-- Choose a Farmer --" 
                        disabled={!!rescheduleAppointment} // Lock farmer during reschedule
                    />
                     <CustomSelect label="2. Select Service Point" options={servicePointOptions} value={selectedServicePointId} onChange={setSelectedServicePointId} placeholder="-- Choose a Center --" />
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">3. Select Date</label>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm" min={new Date().toISOString().split('T')[0]} />
                     </div>
                </div>

                {selectedFarmerId && selectedServicePointId && (
                    <div className="mt-6">
                        <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            4. Select an Available Time Slot
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Capacity: {currentServicePoint?.capacityPerSlot || 5} per slot</span>
                        </h3>
                        
                        <div className="flex gap-4 text-xs mb-4">
                             <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 border border-green-500 rounded"></span> Available</span>
                             <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 border border-yellow-500 rounded"></span> Filling Fast</span>
                             <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border border-red-500 rounded"></span> Full</span>
                             <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-100 border border-purple-500 rounded"></span> Priority Only</span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {timeSlots.map(slot => {
                                let bgClass = 'bg-white hover:border-green-500';
                                let textClass = 'text-gray-800';
                                let disabled = false;

                                if (slot.isFull) {
                                    bgClass = 'bg-red-50 border-red-200';
                                    textClass = 'text-red-400';
                                    disabled = true;
                                } else if (slot.isRestricted) {
                                    bgClass = 'bg-gray-100 border-gray-200 opacity-60';
                                    textClass = 'text-gray-400';
                                    disabled = true;
                                } else if (selectedSlot === slot.time) {
                                    bgClass = 'bg-green-600 border-green-700';
                                    textClass = 'text-white';
                                } else if (slot.remaining <= 2) {
                                    bgClass = 'bg-yellow-50 border-yellow-300 hover:border-yellow-500';
                                }

                                if (slot.isPriority && !disabled && selectedSlot !== slot.time) {
                                    bgClass += ' border-purple-300 bg-purple-50';
                                }

                                return (
                                    <button
                                        key={slot.time}
                                        onClick={() => setSelectedSlot(slot.time)}
                                        disabled={disabled}
                                        className={`p-2 rounded-lg border-2 text-center transition-all flex flex-col items-center justify-center ${bgClass}`}
                                        title={slot.isRestricted ? "Reserved for Smallholders (<5 acres)" : slot.isFull ? "Slot Full" : `${slot.remaining} slots remaining`}
                                    >
                                        <span className={`font-bold ${textClass}`}>{slot.time}</span>
                                        <span className={`text-[10px] ${selectedSlot === slot.time ? 'text-green-200' : 'text-gray-500'}`}>
                                            {slot.isFull ? 'Full' : `${slot.remaining} Left`}
                                        </span>
                                        {slot.isPriority && !disabled && <span className="text-[8px] text-purple-600 font-bold uppercase mt-1">Priority</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                <div className="mt-8 pt-6 border-t flex justify-end items-center gap-4">
                     {!rescheduleAppointment && (
                        <span className="text-sm text-gray-500">
                            Cost: <strong>{SERVICE_PRICING.APPOINTMENT_BOOKED} Credits</strong>
                        </span>
                     )}
                    <button
                        onClick={handleBookAppointment}
                        disabled={!selectedSlot || isSubmitting}
                        className="px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
                    >
                        {isSubmitting ? 'Processing...' : rescheduleAppointment ? 'Confirm New Time' : 'Confirm Appointment'}
                    </button>
                </div>
            </div>

            {/* Existing Appointments List */}
            {selectedFarmerId && farmerAppointments.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Active Appointments</h3>
                    <div className="space-y-3">
                        {farmerAppointments.map(app => {
                            const sp = servicePoints.find(p => p.id === app.servicePointId);
                            return (
                                <div key={app.id} className="border rounded-lg p-4 flex justify-between items-center bg-gray-50">
                                    <div>
                                        <p className="font-semibold text-gray-800">{new Date(app.startTime).toLocaleString()}</p>
                                        <p className="text-sm text-gray-600">{sp?.name || 'Unknown Point'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => simulateDelay(app)}
                                            className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                            title="Dev Tool: Simulate a backend delay notification"
                                        >
                                            ⚡ Sim Delay
                                        </button>
                                        <button 
                                            onClick={() => initiateReschedule(app)}
                                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md text-sm font-semibold hover:bg-blue-200"
                                        >
                                            Reschedule
                                        </button>
                                        <button 
                                            onClick={() => handleCancelAppointment(app)}
                                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md text-sm font-semibold hover:bg-red-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentScheduler;
