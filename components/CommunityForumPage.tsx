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
};

const formatMarkdown = (text: string) => {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .split('\n')
        .map(line => line.trim())
        .map(line => {
            if (line.startsWith('- ') || line.startsWith('* ')) {
                return `<li class="list-disc list-inside ml-4">${line.substring(2)}</li>`;
            }
             if (line.startsWith('#')) {
                const level = line.match(/^#+/)?.[0].length || 1;
                return `<h${level + 2} class="font-bold my-2 text-lg">${line.replace(/^#+\s*/, '')}</h${level + 2}>`;
            }
            return line ? `<p class="my-1">${line}</p>` : '<br/>';
        })
        .join('');
};

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const answerInputRef = useRef<HTMLTextAreaElement>(null);

    const fetchProfiles = useCallback(async (authorIds: string[]): Promise<Map<string, Profile>> => {
        if (!supabase || authorIds.length === 0) return new Map<string, Profile>();
        
        // Supabase `profiles` table has `id`, `full_name`, `avatar_url`. We map to our `Profile` type.
        const { data: profilesData, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', authorIds);

        if (error) {
            console.error("Error fetching profiles:", error);
            return new Map<string, Profile>();
        }
        
        const profileMap: Map<string, Profile> = new Map();
        (profilesData || []).forEach((p: any) => {
            if (p && p.id) {
                profileMap.set(p.id, { id: p.id, name: p.full_name, avatar: p.avatar_url });
            }
        });
        return profileMap;

    }, [supabase]);


    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        if (!supabase) { setError("Not connected to the cloud."); setIsLoading(false); return; }

        try {
            // NOTE: This is inefficient. Ideally, the answer count would come from a database
            // view or an RPC function on Supabase to avoid fetching all answers.
            const [postsRes, answersRes] = await Promise.all([
                supabase.from('forum_posts').select('*').order('created_at', { ascending: false }),
                supabase.from('forum_answers').select('id, post_id')
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
            
            const authorIds = [...new Set(postsWithCounts.map(p => p.author_id))];
            const profileMap = await fetchProfiles(authorIds);

            postsWithCounts.forEach(post => {
                post.author = profileMap.get(post.author_id) || { id: post.author_id, name: 'Unknown User', avatar: '' };
            });
            
            setPosts(postsWithCounts);
        } catch (err: any) {
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

        if (!supabase) { setError("Not connected to the cloud."); setIsLoading(false); return; }

        try {
            const { data, error } = await supabase.from('forum_answers').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
            if (error) throw error;
            
            const answersData = (data as ForumAnswer[]) || [];
            const authorIds = [...new Set(answersData.map(a => a.author_id))];
            if (post.author_id && !authorIds.includes(post.author_id)) {
                authorIds.push(post.author_id);
            }
            const profileMap = await fetchProfiles(authorIds);
            
            answersData.forEach(answer => {
                answer.author = profileMap.get(answer.author_id) || { id: answer.author_id, name: 'Unknown User', avatar: '' };
            });

            // Ensure the main post author profile is loaded
            if (!post.author || !post.author.name) {
                post.author = profileMap.get(post.author_id) || { id: post.author_id, name: 'Unknown User', avatar: '' };
            }
            
            setAnswers(answersData);
        } catch (err: any) {
             setError("Failed to load answers for this post.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, fetchProfiles]);
    
    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
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
            await fetchPosts();
            setNotification({ message: 'Question posted successfully!', type: 'success' });
        } catch (err) {
            setNotification({ message: 'Failed to post question.', type: 'error'});
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handlePostAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedPost || !newAnswer.trim()) return;
        setIsSubmitting(true);
        try {
             const { error } = await supabase.from('forum_answers').insert({
                post_id: selectedPost.id,
                content: newAnswer,
                author_id: currentUser.id,
                tenant_id: currentUser.tenantId
            });
            if(error) throw error;
            setNewAnswer('');
            // Manually add the new answer to the state for instant UI update
            const newAnswerObj: ForumAnswer = {
                id: `temp-${Date.now()}`,
                created_at: new Date().toISOString(),
                post_id: selectedPost.id,
                content: newAnswer,
                author_id: currentUser.id,
                tenant_id: currentUser.tenantId,
                author: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar }
            };
            setAnswers(prev => [...prev, newAnswerObj]);
            setNotification({ message: 'Answer posted.', type: 'success' });
        } catch (err) {
            setNotification({ message: 'Failed to post answer.', type: 'error'});
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!isOnline) {
        return <div className="p-6 text-center text-gray-600 bg-white rounded-lg shadow-md">This feature requires an internet connection. Please connect to view the community forum.</div>;
    }

    return (
        <div className="bg-gray-50 min-h-full">
            <div className="max-w-4xl mx-auto p-6">
                {view === 'list' ? (
                    <>
                        <div className="flex justify-between items-start mb-6">
                            <div><h1 className="text-3xl font-bold text-gray-800">Officer Q&A Forum</h1><p className="text-gray-500 mt-1">Ask questions and share knowledge with other field officers.</p></div>
                            <button onClick={() => setIsAskModalOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm flex-shrink-0">+ Ask a Question</button>
                        </div>
                        {isLoading ? (
                            <div className="space-y-4">
                                {[...Array(5)].map((_, i) => <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse"><div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div><div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-gray-200"></div><div className="h-4 bg-gray-200 rounded w-1/4"></div></div></div>)}
                            </div>
                        ) : error ? <p className="text-red-500 text-center bg-red-50 p-4 rounded-lg">{error}</p> : posts.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-lg shadow-md"><h2 className="text-2xl font-semibold text-gray-700">No Questions Yet</h2><p className="mt-2 text-gray-500">Be the first to ask a question and start a discussion!</p></div>
                        ) : (
                            <div className="space-y-4">
                                {posts.map(post => (
                                    <div key={post.id} onClick={() => handleSelectPost(post)} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                                        <h2 className="text-xl font-bold text-gray-800 hover:text-green-700">{post.title}</h2>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                                            <div className="flex items-center gap-2"><img src={post.author?.avatar || ''} alt={post.author?.name} className="w-6 h-6 rounded-full bg-gray-200" /><span>{post.author?.name || '...'}</span></div>
                                            <span>&bull;</span>
                                            <span>{timeSince(new Date(post.created_at))}</span>
                                            <span>&bull;</span>
                                            <span>{post.answer_count} answer(s)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : selectedPost && (
                    <>
                        <button onClick={() => { setView('list'); setSelectedPost(null); }} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">&larr; Back to All Questions</button>
                        <div className="bg-white p-8 rounded-lg shadow-xl">
                            <h1 className="text-3xl font-bold text-gray-800">{selectedPost.title}</h1>
                            <div className="flex items-center gap-4 text-sm text-gray-500 my-4 border-b pb-4"><img src={selectedPost.author?.avatar || ''} alt={selectedPost.author?.name} className="w-8 h-8 rounded-full bg-gray-200" /><div><p className="font-semibold text-gray-700">{selectedPost.author?.name}</p><p>{timeSince(new Date(selectedPost.created_at))}</p></div></div>
                            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: formatMarkdown(selectedPost.content) }} />
                        </div>

                        <div className="mt-8">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">{answers.length} Answer(s)</h3>
                            <div className="space-y-6">
                                {isLoading ? <p>Loading answers...</p> : answers.map(answer => (
                                    <div key={answer.id} className="flex items-start gap-4">
                                        <img src={answer.author?.avatar || ''} alt={answer.author?.name} className="w-10 h-10 rounded-full bg-gray-200 mt-1" />
                                        <div className="flex-1 bg-white p-4 rounded-lg shadow-md"><p className="font-semibold text-gray-800">{answer.author?.name}</p><p className="text-xs text-gray-500 mb-2">{timeSince(new Date(answer.created_at))}</p><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatMarkdown(answer.content) }}/></div>
                                    </div>
                                ))}
                                <form onSubmit={handlePostAnswer} className="flex items-start gap-4 pt-6 border-t">
                                    <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full bg-gray-200 mt-1" />
                                    <div className="flex-1"><textarea ref={answerInputRef} value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} placeholder="Write your answer..." required className="w-full p-2 border rounded-md" rows={4}></textarea><button type="submit" disabled={isSubmitting} className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-sm disabled:bg-green-300">{isSubmitting ? 'Posting...' : 'Post Answer'}</button></div>
                                </form>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {isAskModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setIsAskModalOpen(false)}>
                    <form onSubmit={handleAskQuestion} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Ask a New Question</h2></div>
                        <div className="p-8 space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" value={newQuestion.title} onChange={e => setNewQuestion(s => ({...s, title: e.target.value}))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Best practices for intercropping in Year 2?" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Details</label><textarea value={newQuestion.content} onChange={e => setNewQuestion(s => ({...s, content: e.target.value}))} required rows={6} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="Provide more details about your question..."></textarea></div>
                        </div>
                        <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                            <button type="button" onClick={() => setIsAskModalOpen(false)} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">{isSubmitting ? 'Posting...' : 'Post Question'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CommunityForumPage;