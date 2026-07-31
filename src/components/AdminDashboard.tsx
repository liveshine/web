import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { createPost, getPosts, updatePost, deletePost, Post, Author, getAuthors, createAuthor, updateAuthor, deleteAuthor } from '../lib/db';
import { Edit2, Trash2, Plus, LogOut, Check, X, Eye, Undo, Image as ImageIcon, Link as LinkIcon, BarChart2, Tag, Calendar, FileText, Users, Minimize, Maximize, Settings } from 'lucide-react';
import { posts as staticPosts } from '../data';
import RichTextEditor from './RichTextEditor';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard({ onClose }: { onClose: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>(staticPosts as Post[]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAuthor, setIsEditingAuthor] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<Post>>({});
  const [currentAuthor, setCurrentAuthor] = useState<Partial<Author>>({});
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedPostRef = useRef<Partial<Post>>({});
  const skipNextAutoSaveRef = useRef(false);

  const [activeImageTab, setActiveImageTab] = useState<'url' | 'library'>('url');
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState<'posts' | 'stats' | 'authors' | 'settings'>('posts');
  const [tagInput, setTagInput] = useState('');
  const [toast, setToast] = useState<{message: string, visible: boolean}>({message: '', visible: false});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [debounceInterval, setDebounceInterval] = useState(() => {
    const saved = localStorage.getItem('debounceInterval');
    return saved ? parseInt(saved, 10) : 2000;
  });

  const saveSettings = () => {
    localStorage.setItem('debounceInterval', debounceInterval.toString());
    setToast({message: 'Settings saved successfully', visible: true});
    setTimeout(() => {
      setToast(prev => ({...prev, visible: false}));
    }, 3000);
  };

  // Extract unique images from posts for the library
  const imageLibrary = Array.from(new Set(posts.map(p => p.image).filter(Boolean)));

  const handleManualSave = async () => {
    if (!isEditing || !currentPost.title || !currentPost.content) return;
    
    // Check if anything actually changed from last saved state
    const { id: _id, ...currentData } = currentPost;
    const { id: _savedId, ...savedData } = lastSavedPostRef.current;
    
    if (JSON.stringify(currentData) === JSON.stringify(savedData)) {
      return; 
    }

    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      lastSavedPostRef.current = { ...currentPost }; 
      return;
    }

    setSaveStatus('saving');
    try {
      if (currentPost.id) {
        await updatePost(currentPost.id, currentPost);
        lastSavedPostRef.current = { ...currentPost };
      } else {
        const newId = await createPost({
          title: currentPost.title,
          subject: currentPost.subject || 'General',
          topic: currentPost.topic || 'General',
          snippet: currentPost.snippet || '',
          content: currentPost.content,
          image: currentPost.image || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643',
          author: currentPost.author || {
            name: user?.displayName || 'Admin',
            avatar: user?.photoURL || 'https://ui-avatars.com/api/?name=A',
          },
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          readTime: '5 min read',
          status: currentPost.status || 'published',
          tags: currentPost.tags || [],
          publishDate: currentPost.publishDate || '',
          seoTitle: currentPost.seoTitle || '',
          seoDescription: currentPost.seoDescription || '',
          canonicalUrl: currentPost.canonicalUrl || '',
          views: currentPost.views || Math.floor(Math.random() * 500) // Mock initial views
        } as Omit<Post, 'id' | 'createdAt'>);
        lastSavedPostRef.current = { ...currentPost, id: newId };
        setCurrentPost(prev => ({ ...prev, id: newId }));
      }
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      setToast({message: 'Changes saved to Firestore', visible: true});
      setTimeout(() => {
        setSaveStatus('idle');
        setToast(prev => ({...prev, visible: false}));
      }, 3000);
      fetchPosts();
    } catch (e) {
      console.error(e);
      setSaveStatus('idle');
    }
  };

  useEffect(() => {
    if (!isEditing || !currentPost.title || !currentPost.content) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleManualSave();
    }, debounceInterval);

  }, [currentPost, isEditing, user, debounceInterval]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && isEditing) {
        if (e.key === 's') {
          e.preventDefault();
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          handleManualSave();
        } else if (e.key === 'b') {
          e.preventDefault();
          document.execCommand('bold', false);
        } else if (e.key === 'i') {
          e.preventDefault();
          document.execCommand('italic', false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPost, isEditing]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchPosts();
        fetchAuthors();
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchPosts = async () => {
    if (posts.length === 0) setIsLoading(true);
    try {
      const fetched = await getPosts();
      const dbIds = new Set(fetched.map(p => String(p.id)));
      const combined = [
        ...fetched,
        ...staticPosts.filter(p => !dbIds.has(String(p.id)))
      ];
      setPosts(combined);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuthors = async () => {
    try {
      const dbAuthors = await getAuthors();
      setAuthors(dbAuthors);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAuthor.id) {
      await updateAuthor(currentAuthor.id, currentAuthor);
    } else {
      await createAuthor({
        name: currentAuthor.name || 'New Author',
        bio: currentAuthor.bio || '',
        avatar: currentAuthor.avatar || '',
        twitter: currentAuthor.twitter || '',
        github: currentAuthor.github || '',
        website: currentAuthor.website || '',
      });
    }
    setIsEditingAuthor(false);
    setCurrentAuthor({});
    fetchAuthors();
  };

  const handleDeleteAuthor = async (id: string) => {
    if (confirm('Are you sure you want to delete this author?')) {
      await deleteAuthor(id);
      fetchAuthors();
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    setCurrentPost({});
    fetchPosts();
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('Are you sure you want to delete this post?')) {
      await deletePost(id);
      fetchPosts();
    }
  };

  if (isLoading) {
    return <div className="fixed inset-0 z-50 bg-bg flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 bg-bg flex flex-col items-center justify-center p-8">
        <button onClick={onClose} className="absolute top-8 right-8 hover:text-accent"><X size={24} /></button>
        <h2 className="font-display text-4xl mb-8">Admin Dashboard</h2>
        <p className="mb-8 opacity-70">Sign in to manage your blog posts.</p>
        <button 
          onClick={login}
          className="bg-ink text-bg px-6 py-3 font-mono text-sm uppercase tracking-widest hover:bg-accent hover:text-white transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const getWordAndCharCount = (html?: string) => {
    const text = html ? html.replace(/<[^>]*>?/gm, '') : '';
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { chars, words };
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-8 py-12">
        <div className="flex justify-between items-center mb-12 border-b border-ink/10 pb-8">
          <div>
            <h2 className="font-display text-4xl mb-2">Dashboard</h2>
            <p className="font-mono text-[0.65rem] uppercase tracking-widest opacity-60">Logged in as {user.email}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={logout} className="hover:text-accent font-mono text-[0.65rem] uppercase tracking-widest flex items-center gap-2"><LogOut size={16} /> Logout</button>
            <button onClick={onClose} className="hover:text-accent font-mono text-[0.65rem] uppercase tracking-widest flex items-center gap-2"><X size={16} /> Close</button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className={`${isFullscreen ? 'fixed inset-0 z-[70] bg-bg overflow-y-auto p-12' : 'max-w-3xl mx-auto bg-ink/5 p-8 border border-ink/10'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl">{currentPost.id ? 'Edit Post' : 'New Post'}</h3>
              <button type="button" onClick={() => setIsFullscreen(!isFullscreen)} className="hover:text-accent font-mono text-[0.65rem] uppercase tracking-widest flex items-center gap-2">
                {isFullscreen ? <><Minimize size={16} /> Exit Fullscreen</> : <><Maximize size={16} /> Fullscreen</>}
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Title *</label>
                <input required type="text" className="w-full border border-ink/20 p-3 bg-transparent text-ink placeholder:text-ink/40 focus:outline-none focus:border-accent" value={currentPost.title || ''} onChange={e => setCurrentPost({...currentPost, title: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Subject</label>
                  <input type="text" className="w-full border border-ink/20 p-3 bg-transparent text-ink placeholder:text-ink/40 focus:outline-none focus:border-accent" value={currentPost.subject || ''} onChange={e => setCurrentPost({...currentPost, subject: e.target.value})} placeholder="e.g., History" />
                </div>
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Topic</label>
                  <input type="text" className="w-full border border-ink/20 p-3 bg-transparent text-ink placeholder:text-ink/40 focus:outline-none focus:border-accent" value={currentPost.topic || ''} onChange={e => setCurrentPost({...currentPost, topic: e.target.value})} placeholder="e.g., Rajasthan" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Tags (comma-separated)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      className="w-full border border-ink/20 p-3 bg-transparent text-ink placeholder:text-ink/40 focus:outline-none focus:border-accent" 
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const newTags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
                          if (newTags.length > 0) {
                            const currentTags = currentPost.tags || [];
                            const combined = Array.from(new Set([...currentTags, ...newTags]));
                            setCurrentPost({...currentPost, tags: combined});
                            setTagInput('');
                          }
                        }
                      }}
                      placeholder="e.g., react, typescript" 
                    />
                    <button type="button" onClick={() => {
                        const newTags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
                        if (newTags.length > 0) {
                          const currentTags = currentPost.tags || [];
                          const combined = Array.from(new Set([...currentTags, ...newTags]));
                          setCurrentPost({...currentPost, tags: combined});
                          setTagInput('');
                        }
                    }} className="px-4 border border-ink/20 hover:bg-ink/5 flex items-center justify-center">
                      <Plus size={16} />
                    </button>
                  </div>
                  {(currentPost.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {currentPost.tags?.map(tag => (
                        <span key={tag} className="font-mono text-[0.65rem] uppercase tracking-widest border border-ink/20 px-2 py-1 flex items-center gap-1">
                          {tag}
                          <button type="button" onClick={() => {
                            setCurrentPost({...currentPost, tags: currentPost.tags?.filter(t => t !== tag)});
                          }} className="hover:text-red-500"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Schedule Publish Date</label>
                  <input type="datetime-local" className="w-full border border-ink/20 p-3 bg-transparent text-ink focus:outline-none focus:border-accent font-mono text-sm" value={currentPost.publishDate ? new Date(new Date(currentPost.publishDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={e => setCurrentPost({...currentPost, publishDate: e.target.value ? new Date(e.target.value).toISOString() : ''})} />
                  <p className="font-mono text-[0.65rem] opacity-50 mt-1">Leave empty to publish immediately</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Author</label>
                  <select 
                    className="w-full border border-ink/20 p-3 bg-transparent text-ink focus:outline-none focus:border-accent"
                    value={typeof currentPost.author === 'string' ? currentPost.author : currentPost.author?.name || ''}
                    onChange={e => {
                      const selected = authors.find(a => a.name === e.target.value);
                      if (selected) {
                        setCurrentPost({...currentPost, author: { name: selected.name, avatar: selected.avatar, bio: selected.bio, twitter: selected.twitter, github: selected.github, website: selected.website }});
                      } else {
                        setCurrentPost({...currentPost, author: e.target.value});
                      }
                    }}
                  >
                    <option value="" disabled>Select Author</option>
                    {authors.map(a => (
                      <option key={a.id} value={a.name}>{a.name}</option>
                    ))}
                    {authors.length === 0 && <option value={user?.displayName || 'Admin'}>{user?.displayName || 'Admin'}</option>}
                  </select>
                </div>
              </div>

              <div className="border border-ink/10 p-6 bg-ink/5 space-y-4">
                <h4 className="font-display text-lg mb-2">SEO Settings</h4>
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">SEO Title</label>
                  <input type="text" className="w-full border border-ink/20 p-3 bg-transparent text-ink focus:outline-none focus:border-accent" value={currentPost.seoTitle || ''} onChange={e => setCurrentPost({...currentPost, seoTitle: e.target.value})} placeholder="Optimal length is 50-60 characters" />
                </div>
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">SEO Description</label>
                  <textarea className="w-full border border-ink/20 p-3 bg-transparent h-20 text-ink focus:outline-none focus:border-accent" value={currentPost.seoDescription || ''} onChange={e => setCurrentPost({...currentPost, seoDescription: e.target.value})} placeholder="Optimal length is 150-160 characters" />
                </div>
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Canonical URL</label>
                  <input type="url" className="w-full border border-ink/20 p-3 bg-transparent text-ink focus:outline-none focus:border-accent" value={currentPost.canonicalUrl || ''} onChange={e => setCurrentPost({...currentPost, canonicalUrl: e.target.value})} placeholder="https://..." />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Snippet (Short description)</label>
                <textarea className="w-full border border-ink/20 p-3 bg-transparent h-24 text-ink placeholder:text-ink/40 focus:outline-none focus:border-accent" value={currentPost.snippet || ''} onChange={e => setCurrentPost({...currentPost, snippet: e.target.value})} />
              </div>

              <div>
                <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Content</label>
                <RichTextEditor value={currentPost.content || ''} onChange={val => setCurrentPost({...currentPost, content: val})} />
              </div>
              
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60">Featured Image URL</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setActiveImageTab('url')} className={`text-[0.65rem] font-mono uppercase tracking-widest px-2 py-1 flex items-center gap-1 transition-colors ${activeImageTab === 'url' ? 'bg-ink text-bg' : 'text-ink/60 hover:text-ink'}`}>
                      <LinkIcon size={12} /> URL / Upload
                    </button>
                    <button type="button" onClick={() => setActiveImageTab('library')} className={`text-[0.65rem] font-mono uppercase tracking-widest px-2 py-1 flex items-center gap-1 transition-colors ${activeImageTab === 'library' ? 'bg-ink text-bg' : 'text-ink/60 hover:text-ink'}`}>
                      <ImageIcon size={12} /> Library
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4">
                  {currentPost.image && (
                    <div className="w-full h-48 overflow-hidden border border-ink/20 bg-ink/5 relative">
                      <img 
                        src={currentPost.image} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643';
                        }}
                      />
                    </div>
                  )}
                  
                  {activeImageTab === 'url' ? (
                    <div className="flex gap-2">
                      <input type="text" className="w-full border border-ink/20 p-3 bg-transparent text-ink placeholder:text-ink/40 focus:outline-none focus:border-accent" value={currentPost.image || ''} onChange={e => setCurrentPost({...currentPost, image: e.target.value})} placeholder="https://..." />
                      <label className="flex items-center justify-center bg-ink/5 hover:bg-ink/10 text-ink px-4 border border-ink/20 cursor-pointer transition-colors whitespace-nowrap text-sm font-mono uppercase tracking-widest">
                        Upload
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    let width = img.width;
                                    let height = img.height;
                                    const MAX_WIDTH = 1200;
                                    
                                    if (width > MAX_WIDTH) {
                                      height = Math.round((height * MAX_WIDTH) / width);
                                      width = MAX_WIDTH;
                                    }
                                    
                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) {
                                      ctx.drawImage(img, 0, 0, width, height);
                                      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                                      setCurrentPost({...currentPost, image: compressedBase64});
                                    }
                                  };
                                  img.src = event.target.result.toString();
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto p-2 border border-ink/20 bg-ink/5">
                      {imageLibrary.length > 0 ? (
                        imageLibrary.map((url, i) => (
                          <button 
                            key={i} 
                            type="button" 
                            onClick={() => setCurrentPost({...currentPost, image: url})}
                            className={`aspect-square overflow-hidden border-2 transition-all ${currentPost.image === url ? 'border-accent scale-95 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                          >
                            <img src={url} alt="Library" className="w-full h-full object-cover" />
                          </button>
                        ))
                      ) : (
                        <div className="col-span-full py-4 text-center font-mono text-xs opacity-50 uppercase tracking-widest">No images found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-ink/10">
              <div className="flex justify-between items-center font-mono text-[0.65rem] uppercase tracking-widest opacity-60">
                <span>{getWordAndCharCount(currentPost.content).words} Words</span>
                <span>{getWordAndCharCount(currentPost.content).chars} Characters</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsEditing(false)} className="bg-ink text-bg px-6 py-3 font-mono text-sm uppercase tracking-widest hover:bg-accent transition-colors flex items-center gap-2">
                    <Check size={16} /> Done
                  </button>
                  <button type="button" onClick={() => setShowLivePreview(true)} className="border border-ink text-ink px-6 py-3 font-mono text-sm uppercase tracking-widest hover:bg-ink/5 transition-colors flex items-center gap-2">
                    <Eye size={16} /> Live Preview
                  </button>
                </div>
                <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-accent w-4 h-4"
                    checked={currentPost.status !== 'draft'} 
                    onChange={e => setCurrentPost({...currentPost, status: e.target.checked ? 'published' : 'draft'})} 
                  />
                  <span className="font-mono text-[0.65rem] uppercase tracking-widest">Published</span>
                </label>
                <button type="button" onClick={() => {
                  if (confirm('Discard unsaved changes?')) {
                    skipNextAutoSaveRef.current = true;
                    setCurrentPost(lastSavedPostRef.current);
                  }
                }} className="text-ink/60 hover:text-red-500 font-mono text-sm uppercase tracking-widest transition-colors flex items-center gap-2">
                  <Undo size={16} /> Revert to Draft
                </button>
              </div>
              </div>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-8 border-b border-ink/10 pb-4">
              <div className="flex gap-6">
                <button 
                  onClick={() => setActiveDashboardTab('posts')}
                  className={`font-mono text-sm uppercase tracking-widest flex items-center gap-2 pb-4 -mb-4 transition-colors ${activeDashboardTab === 'posts' ? 'border-b-2 border-accent text-accent' : 'text-ink/60 hover:text-ink'}`}
                >
                  <FileText size={16} /> Posts
                </button>
                <button 
                  onClick={() => setActiveDashboardTab('stats')}
                  className={`font-mono text-sm uppercase tracking-widest flex items-center gap-2 pb-4 -mb-4 transition-colors ${activeDashboardTab === 'stats' ? 'border-b-2 border-accent text-accent' : 'text-ink/60 hover:text-ink'}`}
                >
                  <BarChart2 size={16} /> Stats
                </button>
                <button 
                  onClick={() => setActiveDashboardTab('authors')}
                  className={`font-mono text-sm uppercase tracking-widest flex items-center gap-2 pb-4 -mb-4 transition-colors ${activeDashboardTab === 'authors' ? 'border-b-2 border-accent text-accent' : 'text-ink/60 hover:text-ink'}`}
                >
                  <Users size={16} /> Authors
                </button>
                <button 
                  onClick={() => setActiveDashboardTab('settings')}
                  className={`font-mono text-sm uppercase tracking-widest flex items-center gap-2 pb-4 -mb-4 transition-colors ${activeDashboardTab === 'settings' ? 'border-b-2 border-accent text-accent' : 'text-ink/60 hover:text-ink'}`}
                >
                  <Settings size={16} /> Settings
                </button>
              </div>
              <button 
                onClick={() => { 
                  skipNextAutoSaveRef.current = true;
                  setCurrentPost({}); 
                  setIsEditing(true); 
                }}
                className="bg-accent text-white px-4 py-2 font-mono text-sm uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Plus size={16} /> Create New Post
              </button>
            </div>

            {activeDashboardTab === 'posts' ? (
              <div className="grid grid-cols-1 gap-4">
                {posts.map(post => (
                  <div key={post.id} className={`border border-ink/10 p-6 flex justify-between items-center bg-ink/5 hover:border-ink/30 transition-colors ${post.status === 'draft' ? 'opacity-60' : ''}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display text-xl font-bold">{post.title}</h4>
                        {post.status === 'draft' && (
                          <span className="font-mono text-[0.55rem] uppercase tracking-widest bg-ink/10 px-2 py-0.5 rounded-sm">Draft</span>
                        )}
                        {post.publishDate && post.publishDate > new Date().toISOString() && (
                          <span className="font-mono text-[0.55rem] uppercase tracking-widest bg-accent/10 text-accent px-2 py-0.5 rounded-sm flex items-center gap-1">
                            <Calendar size={10} /> Scheduled
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-[0.65rem] uppercase tracking-widest opacity-60">
                        {post.date} &bull; {post.subject} &rsaquo; {post.topic}
                        {post.tags && post.tags.length > 0 && (
                          <span> &bull; <Tag size={10} className="inline mr-1" /> {post.tags.join(', ')}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => { 
                        skipNextAutoSaveRef.current = true;
                        setCurrentPost(post); 
                        setIsEditing(true); 
                      }} className="p-2 hover:text-accent transition-colors border border-ink/10"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(post.id)} className="p-2 hover:text-red-500 transition-colors border border-ink/10"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                  <div className="text-center py-12 opacity-50 font-mono text-sm">
                    No posts yet. Click "Create New Post" to get started.
                  </div>
                )}
              </div>
            ) : activeDashboardTab === 'authors' ? (
              isEditingAuthor ? (
                <form onSubmit={handleSaveAuthor} className="border border-ink/10 p-8 bg-ink/5">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-display text-3xl">{currentAuthor.id ? 'Edit Author' : 'New Author'}</h3>
                    <button type="button" onClick={() => setIsEditingAuthor(false)} className="text-ink/60 hover:text-ink"><X size={24} /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Name *</label>
                      <input required type="text" className="w-full border border-ink/20 p-3 bg-transparent focus:border-accent" value={currentAuthor.name || ''} onChange={e => setCurrentAuthor({...currentAuthor, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Avatar URL</label>
                      <input type="url" className="w-full border border-ink/20 p-3 bg-transparent focus:border-accent" value={currentAuthor.avatar || ''} onChange={e => setCurrentAuthor({...currentAuthor, avatar: e.target.value})} />
                    </div>
                  </div>
                  <div className="mb-6">
                    <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Bio</label>
                    <textarea className="w-full border border-ink/20 p-3 bg-transparent focus:border-accent h-24" value={currentAuthor.bio || ''} onChange={e => setCurrentAuthor({...currentAuthor, bio: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div>
                      <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Twitter / X</label>
                      <input type="text" className="w-full border border-ink/20 p-3 bg-transparent focus:border-accent" value={currentAuthor.twitter || ''} onChange={e => setCurrentAuthor({...currentAuthor, twitter: e.target.value})} placeholder="@username" />
                    </div>
                    <div>
                      <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">GitHub</label>
                      <input type="text" className="w-full border border-ink/20 p-3 bg-transparent focus:border-accent" value={currentAuthor.github || ''} onChange={e => setCurrentAuthor({...currentAuthor, github: e.target.value})} placeholder="username" />
                    </div>
                    <div>
                      <label className="block font-mono text-[0.65rem] uppercase tracking-widest opacity-60 mb-2">Website</label>
                      <input type="url" className="w-full border border-ink/20 p-3 bg-transparent focus:border-accent" value={currentAuthor.website || ''} onChange={e => setCurrentAuthor({...currentAuthor, website: e.target.value})} placeholder="https://" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="bg-accent text-white px-6 py-3 font-mono text-sm uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center gap-2">
                      <Check size={16} /> Save Author
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-end mb-4">
                    <button onClick={() => { setCurrentAuthor({}); setIsEditingAuthor(true); }} className="bg-accent text-white px-4 py-2 font-mono text-sm uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center gap-2">
                      <Plus size={16} /> Add Author
                    </button>
                  </div>
                  {authors.map(author => (
                    <div key={author.id} className="border border-ink/10 p-6 flex justify-between items-center bg-ink/5 hover:border-ink/30 transition-colors">
                      <div className="flex items-center gap-4">
                        {author.avatar ? (
                          <img src={author.avatar} alt={author.name} className="w-12 h-12 rounded-full object-cover border border-ink/20" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-ink/10 flex items-center justify-center font-display text-xl text-ink/60">
                            {author.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 className="font-display text-xl font-bold">{author.name}</h4>
                          <p className="font-mono text-[0.65rem] uppercase tracking-widest opacity-60 truncate max-w-md">{author.bio}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => { setCurrentAuthor(author); setIsEditingAuthor(true); }} className="p-2 hover:text-accent transition-colors border border-ink/10"><Edit2 size={16} /></button>
                        <button onClick={() => handleDeleteAuthor(author.id)} className="p-2 hover:text-red-500 transition-colors border border-ink/10"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {authors.length === 0 && (
                    <div className="text-center py-12 opacity-50 font-mono text-sm border border-ink/10 border-dashed">
                      No authors yet. Click "Add Author" to create one.
                    </div>
                  )}
                </div>
              )
            ) : activeDashboardTab === 'stats' ? (
              <div className="border border-ink/10 p-8 bg-ink/5">
                <h3 className="font-display text-2xl mb-8">Post Engagement (Views)</h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={posts} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <XAxis 
                        dataKey="title" 
                        tick={{ fill: 'currentColor', opacity: 0.6, fontSize: 10, fontFamily: 'monospace' }}
                        tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fill: 'currentColor', opacity: 0.6, fontSize: 10, fontFamily: 'monospace' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--ink-color)', borderRadius: 0, fontFamily: 'monospace', fontSize: '12px' }}
                        itemStyle={{ color: 'var(--accent-color)' }}
                        cursor={{ fill: 'var(--ink-color)', opacity: 0.05 }}
                      />
                      <Bar dataKey="views" fill="#D9480F" radius={[4, 4, 0, 0]} name="Page Views" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="border border-ink/10 p-8 bg-ink/5 max-w-2xl">
                <h3 className="font-display text-2xl mb-8">Preferences</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block font-mono text-sm uppercase tracking-widest mb-4">Auto-save Debounce Interval</label>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-ink/10 hover:bg-ink/5 transition-colors">
                        <input type="radio" name="debounce" checked={debounceInterval === 2000} onChange={() => setDebounceInterval(2000)} className="accent-accent" />
                        <span className="font-mono text-sm">2 Seconds (Default)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-ink/10 hover:bg-ink/5 transition-colors">
                        <input type="radio" name="debounce" checked={debounceInterval === 5000} onChange={() => setDebounceInterval(5000)} className="accent-accent" />
                        <span className="font-mono text-sm">5 Seconds</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-ink/10 hover:bg-ink/5 transition-colors">
                        <input type="radio" name="debounce" checked={debounceInterval === 10000} onChange={() => setDebounceInterval(10000)} className="accent-accent" />
                        <span className="font-mono text-sm">10 Seconds</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={saveSettings}
                    className="bg-accent text-white px-6 py-2 font-mono text-sm uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Check size={16} /> Save Settings
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showLivePreview && (
        <div className="fixed inset-0 z-[60] bg-bg flex flex-col overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-ink/10 bg-bg shrink-0">
            <div className="font-mono text-sm uppercase tracking-widest flex items-center gap-2">
              <Eye size={16} /> Live Preview
            </div>
            <button onClick={() => setShowLivePreview(false)} className="hover:text-accent font-mono text-[0.65rem] uppercase tracking-widest flex items-center gap-2">
              <X size={16} /> Close Preview
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[1200px] mx-auto px-8 py-16">
              <article className="animate-in fade-in duration-500">
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-accent block mb-4 flex items-center gap-2">
                  <span>{currentPost.subject || 'Subject'}</span>
                  <span>&rsaquo;</span>
                  <span>{currentPost.topic || 'Topic'}</span>
                </span>
                
                <h1 className="font-display text-5xl md:text-6xl lg:text-[6rem] leading-[0.9] mb-8 tracking-tight">
                  {currentPost.title || 'Untitled'}
                </h1>
                
                <div className="flex items-center gap-4 mb-16 pb-8 border-b border-ink/10">
                  <div className="font-mono text-[0.65rem] uppercase tracking-widest opacity-80">
                    <div>By {currentPost.author ? (typeof currentPost.author === 'string' ? currentPost.author : currentPost.author.name) : 'Author'}</div>
                    <div className="opacity-60">{currentPost.date || 'Today'} &bull; {currentPost.readTime || '5 min read'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                  <div className="lg:col-span-8 lg:col-start-3">
                    {currentPost.image && (
                      <div className="mb-16 aspect-video overflow-hidden">
                        <img 
                          src={currentPost.image} 
                          alt="Cover" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div 
                      className="prose prose-lg dark:prose-invert max-w-none 
                      [&>h1]:font-display [&>h1]:text-4xl [&>h1]:mt-12 [&>h1]:mb-6 [&>h1]:tracking-tight
                      [&>h2]:font-display [&>h2]:text-3xl [&>h2]:mt-10 [&>h2]:mb-4
                      [&>h3]:font-display [&>h3]:text-2xl [&>h3]:mt-8 [&>h3]:mb-3
                      [&>p]:font-serif [&>p]:text-lg [&>p]:leading-relaxed [&>p]:mb-6 [&>p]:opacity-90
                      [&>ul]:font-serif [&>ul]:text-lg [&>ul]:mb-6 [&>ul]:opacity-90
                      [&>ol]:font-serif [&>ol]:text-lg [&>ol]:mb-6 [&>ol]:opacity-90
                      [&>blockquote]:font-serif [&>blockquote]:text-xl [&>blockquote]:italic [&>blockquote]:border-accent [&>blockquote]:text-ink/80
                      [&_a]:text-accent [&_a]:underline-offset-4 hover:[&_a]:opacity-80"
                      dangerouslySetInnerHTML={{ __html: currentPost.content || '<p>No content</p>' }}
                    />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      )}

      {/* Toaster Notification */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 bg-ink text-bg px-6 py-3 font-mono text-[0.75rem] uppercase tracking-widest shadow-xl flex items-center gap-3 z-[60] animate-in fade-in slide-in-from-bottom-4">
          <Check size={16} className="text-accent" />
          {toast.message}
        </div>
      )}
    </div>
  );
}
