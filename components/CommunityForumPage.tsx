import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getSupabase } from '../lib/supabase';
import { ForumPost, ForumAnswer, User, Profile } from '../types';

interface CommunityForumPageProps {
    currentUser: User;
    onBack: () => void;
    setNotification: (notification: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const timeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

const CommunityForumPage: React.FC<CommunityForumPageProps> = ({ currentUser, onBack, setNotification }) => {
    const isOnline = useOnlineStatus();
    const supabase = getSupabase();

    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [answers, setAnswers] = useState<ForumAnswer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [view, setView] = useState<'list' | 'details'>('list');
    const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);

    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const [newQuestion, setNewQuestion] = useState({ title: '', content: '' });
    const [newAnswer, setNewAnswer] = useState('');
    const answerInputRef = useRef<HTMLTextAreaElement>(null);

    const fetchProfiles = useCallback(async (authorIds: string[]): Promise<Map<string, Profile>> => {
        if (!supabase || authorIds.length === 0) {
            // FIX: Explicitly type the empty Map to match the function's return type.
            return new Map<string, Profile>();
        }
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, name:full_name, avatar:avatar_url')
            .in('id', authorIds);

        if (error) {
            console.error("Error fetching profiles:", error);
            // Don't throw, just return an empty map so the app doesn't crash
            // FIX: Explicitly type the empty Map to match the function's return type.
            return new Map<string, Profile>();
        }

        // FIX: Explicitly type `profileMap` to guide TypeScript's inference, resolving the `Map<unknown, unknown>` error.
        const profileMap: Map<string, Profile> = new Map((profiles || []).filter(p => p && p.id).map(p => [p.id as string, p as Profile]));
        return profileMap;
    }, [supabase]);


    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        if (!supabase) { setError("Not connected to the cloud."); setIsLoading(false); return; }

        try {
            // Fetch posts and answers in parallel
            const [postsRes, answersRes] = await Promise.all([
                supabase.from('forum_posts').select('*').order('created_at', { ascending: false }),
                supabase.from('forum_answers').select('id, post_id') // Fetch only what's needed for count
            ]);

            if (postsRes.error) throw postsRes.error;
            if (answersRes.error) throw answersRes.error;

            const answerCounts = (answersRes.data || []).reduce((acc: Record<string, number>, answer: {post_id: string}) => {
                acc[answer.post_id] = (acc[answer.post_id] || 0) + 1;
                return acc;
            }, {});

            const postsWithCounts: ForumPost[] = (postsRes.data || []).map((post: any) => ({
                ...post,
                answer_count: answerCounts[post.id] || 0
            }));
            
            // Fetch authors for posts
            const authorIds = [...new Set(postsWithCounts.map(p => p.author_id))];
            const profileMap = await fetchProfiles(authorIds);

            postsWithCounts.forEach(post => {
                const author = profileMap.get(post.author_id);
                post.author = author || { id: post.author_id, name: 'Unknown User', avatar: '' };
            });
            
            setPosts(postsWithCounts);
        } catch (err: any) {
            console.error("Error fetching forum posts:", err);
            setError("Failed to load forum posts. Please check your connection and try again.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, fetchProfiles]);

    useEffect(() => {
        if (isOnline) {
            fetchPosts();
        }
    }, [isOnline, fetchPosts]);

    const handleSelectPost = useCallback(async (post: ForumPost) => {
        setSelectedPost(post);
        setView('details');
        setIsLoading(true);
        setAnswers([]);
        setError(null);

        if (!supabase) {
            setError("Not connected to the cloud.");
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.from('forum_answers').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
            if (error) throw error;
            
            const answersData = (data as ForumAnswer[]) || [];
            const authorIds = [...new Set(answersData.map(a => a.author_id))];
            const profileMap = await fetchProfiles(authorIds);
            
            answersData.forEach(answer => {
                const author = profileMap.get(answer.author_id);
                answer.author = author || { id: answer.author_id, name: 'Unknown User', avatar: '' };
            });
            
            setAnswers(answersData);
        } catch (err: any) {
             console.error("Error fetching answers:", err);
             setError("Failed to load answers for this post.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, fetchProfiles]);
    
    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { error } = await supabase.from('forum_posts').insert({
                title: newQuestion.title,
                content: newQuestion.content,
                author_id: currentUser.id,
                tenant_id: currentUser.tenantId
            });
            if(error) throw error;
            setNewQuestion({ title: '', content: '' });
            setIsAskModalOpen(false);
            await fetchPosts(); // Refresh list
        } catch (err) {
            setNotification({ message: 'Failed to post question.', type: 'error'});
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePostAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedPost || !newAnswer.trim()) return;
        setIsLoading(true);
        try {
             const { error } = await supabase.from('forum_answers').insert({
                post_id: selectedPost.id,
                content: newAnswer,
                author_id: currentUser.id,
                tenant_id: currentUser.tenantId
            });
            if(error) throw error;
            setNewAnswer('');
            await handleSelectPost(selectedPost); // Refresh answers
        } catch (err) {
            setNotification({ message: 'Failed to post answer.', type: 'error'});
        } finally {
            setIsLoading(false);
        }
    }

    if (!isOnline) {
        return <div className="p-6 text-center text-gray-600 bg-white rounded-lg shadow-md">This feature requires an internet connection. Please connect to the community forum.</div>;
    }

    return (
        <div className="bg-gray-50 min-h-full">
        <div className="max-w-4xl mx-auto p-6">
            {view === 'list' ? (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <div><h1 className="text-3xl font-bold text-gray-800">Q&A Forum</h1><p className="text-gray-500">Ask questions and share knowledge with other farmers.</p></div>
                        <button onClick={() => setIsAskModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm">+ Ask a Question</button>
                    </div>
                    {isLoading ? <p>Loading questions...</p> : error ? <p className="text-red-500">{error}</p> : (
                        <div className="space-y-4">
                            {posts.map(post => (
                                <div key={post.id} onClick={() => handleSelectPost(post)} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                                    <h2 className="text-xl font-bold text-gray-800">{post.title}</h2>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                                        <div className="flex items-center gap-2"><img src={post.author?.avatar || ''} alt={post.author?.name} className="w-6 h-6 rounded-full" /><span>{post.author?.name || 'Unknown User'}</span></div>
                                        <span>{timeSince(new Date(post.created_at))}</span>
                                        <span>{post.answer_count} answers</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : selectedPost && (
                 <>
                    <button onClick={() => setView('list')} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">&larr; Back to Forum</button>
                    <div className="bg-white p-8 rounded-lg shadow-xl">
                        <h1 className="text-3xl font-bold text-gray-800">{selectedPost.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500 my-4 border-b pb-4"><img src={selectedPost.author?.avatar || ''} alt={selectedPost.author?.name} className="w-8 h-8 rounded-full" /><div><p className="font-semibold text-gray-700">{selectedPost.author?.name}</p><p>{timeSince(new Date(selectedPost.created_at))}</p></div></div>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedPost.content}</p>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">{answers.length} Answers</h3>
                        <div className="space-y-6">
                            {answers.map(answer => (
                                <div key={answer.id} className="flex items-start gap-4">
                                    <img src={answer.author?.avatar || ''} alt={answer.author?.name} className="w-10 h-10 rounded-full mt-1" />
                                    <div className="flex-1 bg-white p-4 rounded-lg shadow-md"><p className="font-semibold text-gray-800">{answer.author?.name}</p><p className="text-xs text-gray-500 mb-2">{timeSince(new Date(answer.created_at))}</p><p className="text-gray-700 whitespace-pre-wrap">{answer.content}</p></div>
                                </div>
                            ))}
                            <form onSubmit={handlePostAnswer} className="flex items-start gap-4 pt-6 border-t">
                                 <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full mt-1" />
                                <div className="flex-1"><textarea ref={answerInputRef} value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} placeholder="Write your answer..." required className="w-full p-2 border rounded-md" rows={4}></textarea><button type="submit" disabled={isLoading} className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm disabled:bg-gray-400">Post Answer</button></div>
                            </form>
                        </div>
                    </div>
                 </>
            )}

            {isAskModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleAskQuestion} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl">
                        <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Ask a New Question</h2></div>
                        <div className="p-8 space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" value={newQuestion.title} onChange={e => setNewQuestion(s => ({...s, title: e.target.value}))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., What is the best fertilizer for young palms?" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Details</label><textarea value={newQuestion.content} onChange={e => setNewQuestion(s => ({...s, content: e.target.value}))} required rows={6} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="Provide more details about your question..."></textarea></div>
                        </div>
                        <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                            <button type="button" onClick={() => setIsAskModalOpen(false)} disabled={isLoading} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                            <button type="submit" disabled={isLoading} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">{isLoading ? 'Posting...' : 'Post Question'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
        </div>
    );
};

export default CommunityForumPage;