import React, { useState, useMemo, useCallback } from 'react';
import { useDatabase } from '../DatabaseContext';
import { useQuery } from '../hooks/useQuery';
import { EventModel, EventRsvpModel, UserModel } from '../db';
import { Q } from '@nozbe/watermelondb';
import { User } from '../types';
import CustomSelect from './CustomSelect';

interface EventsPageProps {
    onBack: () => void;
    currentUser: User;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const EventModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { title: string, description: string, eventDate: string, location: string }) => Promise<void>;
}> = ({ isOpen, onClose, onSave }) => {
    const [formState, setFormState] = useState({
        title: '',
        description: '',
        eventDate: '',
        location: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave(formState);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Create New Event</h2></div>
                <div className="p-8 space-y-4">
                    <input value={formState.title} onChange={e => setFormState(s => ({...s, title: e.target.value}))} required placeholder="Event Title" className="w-full p-2 border rounded-md" />
                    <textarea value={formState.description} onChange={e => setFormState(s => ({...s, description: e.target.value}))} required placeholder="Event Description" rows={4} className="w-full p-2 border rounded-md"></textarea>
                    <input type="datetime-local" value={formState.eventDate} onChange={e => setFormState(s => ({...s, eventDate: e.target.value}))} required className="w-full p-2 border rounded-md" />
                    <input value={formState.location} onChange={e => setFormState(s => ({...s, location: e.target.value}))} required placeholder="Location (e.g., District Office, Hanmakonda)" className="w-full p-2 border rounded-md" />
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting}>Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">{isSubmitting ? 'Saving...' : 'Create Event'}</button>
                </div>
            </form>
        </div>
    );
};

const EventsPage: React.FC<EventsPageProps> = ({ onBack, currentUser, setNotification }) => {
    const database = useDatabase();
    
    const events = useQuery(useMemo(() => database.get<EventModel>('events').query(Q.sortBy('event_date', 'desc')), [database]));
    const rsvps = useQuery(useMemo(() => database.get<EventRsvpModel>('event_rsvps').query(), [database]));
    const users = useQuery(useMemo(() => database.get<UserModel>('users').query(), [database]));

    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Check if current user is an admin
    const isAdmin = currentUser.groupId.includes('admin');

    const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const rsvpsByEventId = useMemo(() => {
        return rsvps.reduce((acc, rsvp) => {
            if (!acc[rsvp.eventId]) {
                acc[rsvp.eventId] = [];
            }
            acc[rsvp.eventId].push(rsvp);
            return acc;
        }, {} as Record<string, EventRsvpModel[]>);
    }, [rsvps]);

    const handleCreateEvent = useCallback(async (data: { title: string, description: string, eventDate: string, location: string }) => {
        try {
            await database.write(async () => {
                await database.get<EventModel>('events').create(e => {
                    e.title = data.title;
                    e.description = data.description;
                    e.eventDate = new Date(data.eventDate).toISOString();
                    e.location = data.location;
                    e.createdBy = currentUser.id;
                    e.syncStatusLocal = 'pending';
                    e.tenantId = currentUser.tenantId;
                });
            });
            setNotification({ message: 'Event created successfully!', type: 'success' });
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to create event:", error);
            setNotification({ message: 'Failed to create event.', type: 'error' });
        }
    }, [database, currentUser, setNotification]);
    
    const handleRsvp = useCallback(async (event: EventModel) => {
        const eventRsvps = rsvpsByEventId[event.id] || [];
        const existingRsvp = eventRsvps.find(r => r.userId === currentUser.id);

        try {
            await database.write(async () => {
                if (existingRsvp) {
                    await existingRsvp.destroyPermanently();
                } else {
                    await database.get<EventRsvpModel>('event_rsvps').create(r => {
                        r.eventId = event.id;
                        r.userId = currentUser.id;
                        r.syncStatusLocal = 'pending';
                    });
                }
            });
        } catch (error) {
            console.error("Failed to update RSVP:", error);
            setNotification({ message: 'Failed to update RSVP.', type: 'error' });
        }
    }, [database, currentUser.id, rsvpsByEventId, setNotification]);


    return (
        <div className="p-6 bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Events Calendar</h1>
                        <p className="text-gray-500">Find upcoming trainings, workshops, and community meet-ups.</p>
                    </div>
                    {isAdmin && <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">+ Add Event</button>}
                </div>

                <div className="space-y-6">
                    {events.length > 0 ? events.map(event => {
                        const eventRsvps = rsvpsByEventId[event.id] || [];
                        const hasRsvpd = eventRsvps.some(r => r.userId === currentUser.id);
                        const author = userMap.get(event.createdBy);

                        return (
                            <div key={event.id} className="bg-white p-6 rounded-lg shadow-md border">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="text-center md:border-r md:pr-6">
                                        <p className="text-3xl font-bold text-green-600">{new Date(event.eventDate).getDate()}</p>
                                        <p className="text-sm font-semibold text-gray-500">{new Date(event.eventDate).toLocaleString('default', { month: 'short' }).toUpperCase()}</p>
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-gray-800">{event.title}</h2>
                                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-4">
                                            <span>{new Date(event.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span>{event.location}</span>
                                        </div>
                                        <p className="text-gray-600 mt-3">{event.description}</p>
                                    </div>
                                    <div className="flex flex-col items-center justify-between gap-4">
                                        <button onClick={() => handleRsvp(event)} className={`w-full px-6 py-2 font-semibold rounded-md transition ${hasRsvpd ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                                            {hasRsvpd ? 'Cancel RSVP' : 'RSVP'}
                                        </button>
                                        <div className="text-sm text-center text-gray-600">
                                            <p className="font-semibold">{eventRsvps.length} Attending</p>
                                            <p className="text-xs">Created by {author?.name || 'Admin'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-20 bg-white rounded-lg shadow-md">
                            <h2 className="text-2xl font-semibold text-gray-700">No Upcoming Events</h2>
                            <p className="mt-2 text-gray-500">Check back soon for new events and training sessions.</p>
                        </div>
                    )}
                </div>
            </div>
            {isModalOpen && <EventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleCreateEvent} />}
        </div>
    );
};

export default EventsPage;
