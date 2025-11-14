import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getSupabase } from '../lib/supabase';
import { ForumPost, ForumAnswer, User, Profile, ForumContentFlag } from '../types';
import DOMPurify from 'dompurify';

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
    if (!text) return { __html: '' };
    const rawHtml = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="rounded-md my-2 max-w-full" />')
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
    return { __html: DOMPurify.sanitize(rawHtml) };
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
    const [flaggingContent, setFlaggingContent] = useState<{ id: string, type: 'post' | 'answer' } | null>(null);

    const [newAnswer, setNewAnswer] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const answerInputRef = useRef<HTMLTextAreaElement>(null);
    const channelRef = useRef<any>(null);

    const [userVotes, setUserVotes] = useState<Set<string>>(new Set());

    const fetchProfiles = useCallback(async (authorIds: string[]): Promise<Map<string, Profile>> => {
        if (!supabase || authorIds.length === 0) return new Map<string, Profile>();
        
        const { data: profilesData, error } = await supabase
            .from('profiles')
            .select('id, name, avatar')
            .in('id', authorIds);

        if (error) {
            console.error("Error fetching profiles:", error);
            return new Map<string, Profile>();
        }
        
        const profileMap: Map<string, Profile> = new Map();
        (profilesData || []).forEach((p: any) => {
            if (p && p.id) {
                profileMap.set(p.id, { id: p.id, name: p.name, avatar: p.avatar });
            }
        });
        return profileMap;

    }, [supabase]);


    const fetchPosts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        if (!supabase) { setError("Not connected to the cloud."); setIsLoading(false); return; }

        try {
            const { data, error } = await supabase.rpc('get_forum_posts_with_counts');

            if (error) throw error;

            const postsData: ForumPost[] = data || [];
            
            const authorIds = [...new Set(postsData.map(p => p.author_id))];
            const profileMap = await fetchProfiles(authorIds);

            postsData.forEach(post => {
                post.author = profileMap.get(post.author_id) || { id: post.author_id, name: 'Unknown User', avatar: '' };
            });
            
            setPosts(postsData);
        } catch (err: any) {
            setError("Failed to load forum posts. Please check your connection and try again.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, fetchProfiles]);

    const handleSelectPost = useCallback(async (post: ForumPost) => {
        setView('details');
        setSelectedPost(post);
        setIsLoading(true);
        setAnswers([]);
        setError(null);

        if (!supabase) { setError("Not connected to the cloud."); setIsLoading(false); return; }

        try {
            const { data, error } = await supabase.rpc('get_forum_answers_with_counts', { post_id_param: post.id });
            if (error) throw error;
            
            const answersData = (data as ForumAnswer[]) || [];
            const answerAuthorIds = answersData.map(a => a.author_id);
            const authorIds = [...new Set([post.author_id, ...answerAuthorIds])];
            const profileMap = await fetchProfiles(authorIds);
            
            answersData.forEach(answer => {
                answer.author = profileMap.get(answer.author_id) || { id: answer.author_id, name: 'Unknown User', avatar: '' };
            });

            if (!post.author || !post.author.name) {
                post.author = profileMap.get(post.author_id) || { id: post.author_id, name: 'Unknown User', avatar: '' };
            }
            
            const answerIds = answersData.map(a => a.id);
            if(answerIds.length > 0) {
                const { data: votesData } = await supabase.from('forum_answer_votes').select('answer_id').eq('voter_id', currentUser.id).in('answer_id', answerIds);
                setUserVotes(new Set((votesData || []).map((v: any) => v.answer_id)));
            } else {
                setUserVotes(new Set());
            }

            setAnswers(answersData);
        } catch (err: any) {
             setError("Failed to load answers for this post.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, fetchProfiles, currentUser.id]);

    useEffect(() => {
        if(isOnline) fetchPosts();

        const postSub = supabase.channel('public:forum_posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, () => fetchPosts())
            .subscribe();
            
        return () => { supabase.removeChannel(postSub); }
    }, [isOnline, fetchPosts, supabase]);
    
    useEffect(() => {
        if(view !== 'details' || !selectedPost || !supabase) return;

        const handleNewAnswer = async (payload: any) => {
            const newAnswerData = payload.new;
            const profileMap = await fetchProfiles([newAnswerData.author_id]);
            const author = profileMap.get(newAnswerData.author_id) || { id: newAnswerData.author_id, name: 'Unknown User', avatar: '' };
            setAnswers(prev => [...prev, {...newAnswerData, author, vote_count: 0}]);
        };
        
        const handleVoteChange = async(payload: any) => {
            const isInsert = payload.eventType === 'INSERT';
            const answerId = isInsert ? payload.new.answer_id : payload.old.answer_id;
            const voterId = isInsert ? payload.new.voter_id : payload.old.voter_id;

            setAnswers(prev => prev.map(a => {
                if(a.id === answerId) {
                    const newVoteCount = (a.vote_count || 0) + (isInsert ? 1 : -1);
                    return {...a, vote_count: Math.max(0, newVoteCount)};
                }
                return a;
            }));

            if(voterId === currentUser.id) {
                setUserVotes(prev => {
                    const newSet = new Set(prev);
                    isInsert ? newSet.add(answerId) : newSet.delete(answerId);
                    return newSet;
                });
            }
        };

        if (channelRef.current) supabase.removeChannel(channelRef.current);

        const answerIds = answers.map(a => a.id);
        const channel = supabase.channel(`details-for-post-${selectedPost.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_answers', filter: `post_id=eq.${selectedPost.id}` }, handleNewAnswer)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_answer_votes', filter: `answer_id=in.(${answerIds.join(',') || '""'})` }, handleVoteChange)
            .subscribe();
        
        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        }
    }, [view, selectedPost, answers, supabase, fetchProfiles, currentUser.id]);


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
            setNotification({ message: 'Answer posted.', type: 'success' });
        } catch (err) {
            setNotification({ message: 'Failed to post answer.', type: 'error'});
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleVote = async (answerId: string) => {
        const hasVoted = userVotes.has(answerId);
        
        // Optimistic update
        setUserVotes(prev => {
            const newSet = new Set(prev);
            hasVoted ? newSet.delete(answerId) : newSet.add(answerId);
            return newSet;
        });
        setAnswers(prev => prev.map(a => a.id === answerId ? {...a, vote_count: (a.vote_count || 0) + (hasVoted ? -1 : 1) } : a));

        try {
            if(hasVoted) {
                const { error } = await supabase.from('forum_answer_votes').delete().match({ answer_id: answerId, voter_id: currentUser.id });
                if(error) throw error;
            } else {
                const { error } = await supabase.from('forum_answer_votes').insert({ answer_id: answerId, voter_id: currentUser.id });
                if(error) throw error;
            }
        } catch(e) {
            // Revert optimistic update on error
            setUserVotes(prev => {
                const newSet = new Set(prev);
                hasVoted ? newSet.add(answerId) : newSet.delete(answerId);
                return newSet;
            });
            setAnswers(prev => prev.map(a => a.id === answerId ? {...a, vote_count: (a.vote_count || 0) + (hasVoted ? 1 : -1) } : a));
            setNotification({ message: 'Could not record vote.', type: 'error'});
        }
    };

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
                        <div className="bg-white p-8 rounded-lg shadow-xl relative">
                             <button onClick={() => setFlaggingContent({ id: selectedPost.id, type: 'post' })} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600" title="Flag post"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 000 2v11a1 1 0 100 2h14a1 1 0 100-2V5a1 1 0 00-1-1H4a1 1 0 00-1-1z" /></svg></button>
                            <h1 className="text-3xl font-bold text-gray-800">{selectedPost.title}</h1>
                            <div className="flex items-center gap-4 text-sm text-gray-500 my-4 border-b pb-4"><img src={selectedPost.author?.avatar || ''} alt={selectedPost.author?.name} className="w-8 h-8 rounded-full bg-gray-200" /><div><p className="font-semibold text-gray-700">{selectedPost.author?.name}</p><p>{timeSince(new Date(selectedPost.created_at))}</p></div></div>
                            <div className="prose max-w-none" dangerouslySetInnerHTML={formatMarkdown(selectedPost.content)} />
                        </div>

                        <div className="mt-8">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">{answers.length} Answer(s)</h3>
                            <div className="space-y-6">
                                {isLoading ? <p>Loading answers...</p> : answers.map(answer => (
                                    <div key={answer.id} className="flex items-start gap-4">
                                        <img src={answer.author?.avatar || ''} alt={answer.author?.name} className="w-10 h-10 rounded-full bg-gray-200 mt-1" />
                                        <div className="flex-1 bg-white p-4 rounded-lg shadow-md relative group">
                                            <button onClick={() => setFlaggingContent({ id: answer.id, type: 'answer' })} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Flag answer"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 000 2v11a1 1 0 100 2h14a1 1 0 100-2V5a1 1 0 00-1-1H4a1 1 0 00-1-1z" /></svg></button>
                                            <p className="font-semibold text-gray-800">{answer.author?.name}</p><p className="text-xs text-gray-500 mb-2">{timeSince(new Date(answer.created_at))}</p><div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={formatMarkdown(answer.content)}/>
                                            <div className="mt-4 pt-3 border-t flex items-center gap-4">
                                                <button onClick={() => handleVote(answer.id)} className={`flex items-center gap-2 text-sm font-semibold transition-colors ${userVotes.has(answer.id) ? 'text-green-600' : 'text-gray-500 hover:text-green-600'}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.562 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a2 2 0 00-1.8 2.4z" /></svg>
                                                    Helpful ({answer.vote_count || 0})
                                                </button>
                                            </div>
                                        </div>
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

            {isAskModalOpen && <AskQuestionModal currentUser={currentUser} onClose={() => setIsAskModalOpen(false)} setNotification={setNotification} />}
            {flaggingContent && <FlagContentModal content={flaggingContent} currentUser={currentUser} onClose={() => setFlaggingContent(null)} setNotification={setNotification} />}
        </div>
    );
};

// --- Modals ---

const AskQuestionModal: React.FC<{ currentUser: User; onClose: () => void; setNotification: (n: any) => void; }> = ({ currentUser, onClose, setNotification }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const contentRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = getSupabase();

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                const markdownImage = `\n![${file.name}](${dataUrl})\n`;
                setContent(prev => prev + markdownImage);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('forum_posts').insert({
                title, content, author_id: currentUser.id, tenant_id: currentUser.tenantId
            });
            if(error) throw error;
            setNotification({ message: 'Question posted successfully!', type: 'success' });
            onClose();
        } catch (err) {
            setNotification({ message: 'Failed to post question.', type: 'error'});
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <form onSubmit={handleAskQuestion} className="bg-white rounded-lg shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Ask a New Question</h2></div>
                <div className="p-8 space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700">Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Best practices for intercropping in Year 2?" /></div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Details</label>
                        <textarea ref={contentRef} value={content} onChange={e => setContent(e.target.value)} required rows={8} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder="Provide more details about your question..."></textarea>
                        <input type="file" ref={fileInputRef} onChange={e => e.target.files && handleImageUpload(e.target.files[0])} accept="image/*" className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-2 text-sm text-blue-600 hover:underline">Add image</button>
                    </div>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold disabled:bg-green-300">{isSubmitting ? 'Posting...' : 'Post Question'}</button>
                </div>
            </form>
        </div>
    );
}

const FlagContentModal: React.FC<{ content: { id: string, type: 'post' | 'answer' }, currentUser: User; onClose: () => void; setNotification: (n: any) => void; }> = ({ content, currentUser, onClose, setNotification }) => {
    const [reason, setReason] = useState<'spam' | 'harmful' | 'harassment' | 'other'>('harmful');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = getSupabase();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('forum_content_flags').insert({
                content_id: content.id,
                content_type: content.type,
                reason,
                notes,
                flagged_by_id: currentUser.id,
                status: 'pending',
            });
            if (error) throw error;
            setNotification({ message: 'Content has been flagged for review.', type: 'success' });
            onClose();
        } catch (err) {
            setNotification({ message: 'Failed to flag content.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b"><h2 className="text-xl font-bold text-gray-800">Flag Content</h2></div>
                <div className="p-8 space-y-4">
                    <p>Why are you flagging this {content.type}?</p>
                    <div className="space-y-2">
                        {(['harmful', 'spam', 'harassment', 'other'] as const).map(r => (
                            <label key={r} className="flex items-center"><input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 text-green-600" /><span className="ml-2 capitalize">{r}</span></label>
                        ))}
                    </div>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes (optional)" rows={3} className="w-full p-2 border rounded-md"></textarea>
                </div>
                <div className="bg-gray-100 p-4 flex justify-end gap-4 rounded-b-lg">
                    <button type="button" onClick={onClose} disabled={isSubmitting} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">{isSubmitting ? 'Submitting...' : 'Submit Flag'}</button>
                </div>
            </form>
        </div>
    );
}

export default CommunityForumPage;
