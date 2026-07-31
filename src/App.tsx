import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PostCard from './components/PostCard';
import AISearchModal from './components/AISearchModal';
import CommentSection from './components/CommentSection';
import PostSkeleton from './components/PostSkeleton';
import AdminDashboard from './components/AdminDashboard';
import { posts as staticPosts } from './data';
import { getPosts, Post as DbPost } from './lib/db';
import { motion, useScroll, useSpring } from 'motion/react';
import { Twitter, Linkedin, Facebook, Maximize, Minimize, Settings } from 'lucide-react';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [initialAIQuery, setInitialAIQuery] = useState('');
  const [dbPosts, setDbPosts] = useState<DbPost[]>(staticPosts);
  
  // Use DbPost type to cover both static and db fields
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  
  const [activeSubject, setActiveSubject] = useState<string>('All');
  const [isGridLoading, setIsGridLoading] = useState(true);
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string>('');
  const { scrollYProgress } = useScroll();

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Scrollspy for Table of Contents
  useEffect(() => {
    if (!selectedPost) return;

    const handleScroll = () => {
      const headings = Array.from(document.querySelectorAll('h2[id]'));
      let current = '';
      for (const heading of headings) {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 140) {
          current = heading.id;
        }
      }
      if (current) {
        setActiveHeading(current);
      } else if (headings.length > 0) {
        setActiveHeading(headings[0].id);
      }
    };

    window.addEventListener('scroll', handleScroll);
    setTimeout(handleScroll, 100);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedPost]);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    // Fetch posts
    const fetchDbPosts = async () => {
      try {
        const fetched = await getPosts();
        const dbIds = new Set(fetched.map(p => String(p.id)));
        const combined = [
          ...fetched,
          ...staticPosts.filter(p => !dbIds.has(String(p.id)))
        ];
        setDbPosts(combined);
      } catch (e) {
        console.error(e);
        setDbPosts(staticPosts);
      } finally {
        setIsGridLoading(false);
      }
    };
    fetchDbPosts();
  }, [isAdminOpen]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  useEffect(() => {
    if (selectedPost) {
      const updatedPost = dbPosts.find(p => String(p.id) === String(selectedPost.id));
      if (updatedPost && JSON.stringify(updatedPost) !== JSON.stringify(selectedPost)) {
        setSelectedPost(updatedPost);
      }
    }
  }, [dbPosts]);

  const prevPostIdRef = useRef<any>(null);
  useEffect(() => {
    if (selectedPost && selectedPost.id !== prevPostIdRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      prevPostIdRef.current = selectedPost.id;
    } else if (!selectedPost) {
      prevPostIdRef.current = null;
    }
  }, [selectedPost]);

  const [activeTag, setActiveTag] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearch = (query: string, useAI: boolean) => {
    if (useAI) {
      setInitialAIQuery(query);
      setIsAIModalOpen(true);
    } else {
      setSearchQuery(query);
      setIsGridLoading(true);
      setTimeout(() => {
        setIsGridLoading(false);
      }, 400);
    }
  };

  const now = new Date().toISOString();
  const validPosts = (dbPosts.length > 0 ? dbPosts : staticPosts as DbPost[]).filter(p => {
    if (p.status === 'draft') return false;
    if (p.publishDate && p.publishDate > now) return false;
    return true;
  });

  const displayPosts = validPosts;
  const featuredPost = displayPosts.find((p) => p.featured) || displayPosts[0];
  
  let regularPosts = displayPosts.filter((p) => p.id !== featuredPost?.id);
  if (activeSubject !== 'All') {
    regularPosts = regularPosts.filter(p => p.subject === activeSubject);
  }
  if (activeTag !== 'All') {
    regularPosts = regularPosts.filter(p => p.tags && p.tags.includes(activeTag));
  }
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    regularPosts = regularPosts.filter(p => 
      p.title.toLowerCase().includes(q) || 
      (p.snippet && p.snippet.toLowerCase().includes(q))
    );
  }

  const allSubjects = ['All', ...Array.from(new Set(displayPosts.map(p => p.subject)))];
  const allTags = ['All', ...Array.from(new Set(displayPosts.flatMap(p => p.tags || [])))];

  const handleSubjectChange = (cat: string) => {
    setActiveSubject(cat);
    setIsGridLoading(true);
    setTimeout(() => {
      setIsGridLoading(false);
    }, 400);
  };
  
  const handleTagChange = (tag: string) => {
    setActiveTag(tag);
    setIsGridLoading(true);
    setTimeout(() => {
      setIsGridLoading(false);
    }, 400);
  };
  
  const highlightText = (text: string | undefined, query: string) => {
    if (!text) return '';
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <span key={i} className="bg-accent/30 text-accent font-bold px-1 rounded-sm">{part}</span> : 
        part
    );
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      {selectedPost && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-1.5 bg-accent z-[100] origin-left shadow-[0_0_10px_rgba(217,72,15,0.5)]"
          style={{ scaleX }}
        />
      )}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col min-h-screen">
        {!isDistractionFree && (
          <Navbar 
            darkMode={darkMode} 
            toggleDarkMode={toggleDarkMode} 
            onSearch={handleSearch}
            onHome={() => {
              setSelectedPost(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
        
        <main className="flex-1">
          {selectedPost ? (
            <article className="pb-16 animate-in fade-in duration-500">
              {!isDistractionFree && (
                <button 
                  onClick={() => {
                    setSelectedPost(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="font-mono text-[0.65rem] uppercase tracking-[0.15em] mb-8 hover:text-accent transition-colors flex items-center gap-2"
                >
                  &larr; Back to Resources
                </button>
              )}
              
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-accent block mb-4 flex items-center gap-2">
                <span>{selectedPost.subject}</span>
                <span>&rsaquo;</span>
                <span>{selectedPost.topic}</span>
                <span>&rsaquo;</span>
                <span>{selectedPost.subtopic}</span>
              </span>
              <h1 className="font-display text-5xl md:text-6xl lg:text-[6rem] leading-[0.9] mb-8 tracking-tight max-w-4xl">
                {selectedPost.title}
              </h1>
              
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-6">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60">
                  {typeof selectedPost.author === 'string' ? selectedPost.author : selectedPost.author?.name} &bull; {selectedPost.date} &bull; {(() => {
                    const content = selectedPost.content || '';
                    const wordCount = content.trim().split(/\s+/).length;
                    const minutes = Math.ceil(wordCount / 200);
                    return `${minutes} min read`;
                  })()}
                </p>
                <div className="flex gap-4 items-center opacity-70">
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] mr-2">Share:</span>
                  <button className="hover:text-accent transition-colors"><Twitter size={16} /></button>
                  <button className="hover:text-accent transition-colors"><Linkedin size={16} /></button>
                  <button className="hover:text-accent transition-colors"><Facebook size={16} /></button>
                  <div className="w-px h-4 bg-ink/20 mx-2"></div>
                  <button 
                    onClick={() => setIsDistractionFree(!isDistractionFree)}
                    className="hover:text-accent transition-colors flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.15em]"
                    title="Toggle Distraction-Free Mode"
                  >
                    {isDistractionFree ? <Minimize size={16} /> : <Maximize size={16} />}
                    {isDistractionFree ? 'Exit Focus' : 'Focus Mode'}
                  </button>
                </div>
              </div>
              
              <div className="w-full h-[60vh] mb-16 bg-ink/5 overflow-hidden">
                 <img src={selectedPost.image} className="w-full h-full object-cover hover:scale-105 transition-transform duration-[2s] ease-out" alt={selectedPost.title} />
              </div>

              <div className="flex flex-col lg:flex-row gap-12 relative">
                {!isDistractionFree && (
                  <aside className="hidden lg:block w-64 shrink-0">
                    <div className="sticky top-12">
                      <h4 className="font-mono text-[0.65rem] uppercase tracking-[0.15em] mb-4 opacity-60">Table of Contents</h4>
                      <ul className="space-y-3 text-sm opacity-80">
                        {(() => {
                          const getHeadings = (content: string) => {
                            if (!content) return [];
                            if (content.includes('## ') && !content.includes('<h')) {
                              return content.split('\n\n').filter(p => p.startsWith('## ')).map(h => {
                                const text = h.replace('## ', '');
                                return { text, id: text.toLowerCase().replace(/\s+/g, '-') };
                              });
                            }
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(content, 'text/html');
                            return Array.from(doc.querySelectorAll('h1, h2, h3')).map(el => {
                              const text = el.textContent || '';
                              return { text, id: text.toLowerCase().replace(/\s+/g, '-') };
                            });
                          };
                          
                          const headings = getHeadings(selectedPost.content);
                          if (headings.length === 0) {
                            return <li className="opacity-50 italic">No headings found.</li>;
                          }
                          
                          return headings.map((h, i) => {
                            const isActive = activeHeading === h.id;
                            return (
                              <li key={i}>
                                <a 
                                  href={`#${h.id}`} 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const el = document.getElementById(h.id);
                                    if (el) {
                                      const y = el.getBoundingClientRect().top + window.scrollY - 100;
                                      window.scrollTo({ top: y, behavior: 'smooth' });
                                    }
                                  }}
                                  className={`transition-colors block leading-snug border-l-2 pl-3 py-1 ${isActive ? 'text-accent border-accent font-medium' : 'hover:text-accent border-transparent'}`}
                                >
                                  {h.text}
                                </a>
                              </li>
                            );
                          });
                        })()}
                      </ul>
                    </div>
                  </aside>
                )}
                
                <div className={`flex-1 ${isDistractionFree ? 'max-w-4xl mx-auto w-full' : ''}`}>
              
              <div className="prose prose-lg mx-auto mb-16 max-w-3xl text-ink/90">
                 {selectedPost.learningPath && (
                   <div className="mb-8 p-6 border border-accent/30 bg-accent/5">
                     <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-accent mb-2">Learning Path</p>
                     <p className="font-bold text-lg m-0 p-0">Part of the {selectedPost.learningPath} Series</p>
                   </div>
                 )}
                 
                 {selectedPost.prerequisites && selectedPost.prerequisites.length > 0 && (
                   <div className="mb-12 p-6 border border-ink/10 bg-bg">
                     <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 mb-3">Prerequisites</p>
                     <p className="text-sm opacity-80 mb-2">Before reading this, make sure you understand:</p>
                     <ul className="list-disc pl-5 m-0 text-sm opacity-80">
                       {selectedPost.prerequisites.map((req, idx) => (
                         <li key={idx} className="mb-1">{req}</li>
                       ))}
                     </ul>
                   </div>
                 )}

                 <p className="text-2xl leading-relaxed opacity-80 mb-8 font-display">{selectedPost.snippet}</p>
                 {selectedPost.content ? (
                   (() => {
                     if (selectedPost.content.includes('## ') && !selectedPost.content.includes('<h')) {
                       return selectedPost.content.split('\n\n').map((paragraph: string, idx: number) => {
                         if (paragraph.startsWith('## ')) {
                           const text = paragraph.replace('## ', '');
                           const id = text.toLowerCase().replace(/\s+/g, '-');
                           return <h2 key={idx} id={id} className="font-display text-3xl mt-12 mb-6 scroll-mt-24">{text}</h2>;
                         }
                         return <p key={idx}>{paragraph}</p>;
                       });
                     }
                     
                     const htmlWithIds = selectedPost.content.replace(/<(h[1-6])([^>]*)>(.*?)<\/\1>/gi, (match: string, tag: string, attrs: string, inner: string) => {
                       const text = inner.replace(/<[^>]+>/g, '').trim();
                       const id = text.toLowerCase().replace(/\s+/g, '-');
                       return `<${tag}${attrs} id="${id}" class="scroll-mt-24">${inner}</${tag}>`;
                     });
                     
                     return <div dangerouslySetInnerHTML={{ __html: htmlWithIds }} className="[&_h1]:font-display [&_h1]:text-4xl [&_h1]:mb-6 [&_h1]:mt-12 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:mb-4 [&_h2]:mt-10 [&_h3]:font-display [&_h3]:text-2xl [&_h3]:mb-3 [&_h3]:mt-8 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:opacity-80 [&_blockquote]:mb-4 [&_img]:max-w-full [&_img]:rounded-sm [&_a]:text-accent [&_a]:underline" />
                   })()
                 ) : (
                   <p>Content not available.</p>
                 )}
              </div>

              <CommentSection postId={selectedPost.id} />
              
              {/* Related Articles */}
              {!isDistractionFree && displayPosts.filter(p => p.subject === selectedPost.subject && p.id !== selectedPost.id).length > 0 && (
                <section className="mt-24 pt-16 border-t border-ink/20">
                  <h3 className="font-display text-3xl mb-8">Related Articles</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {displayPosts.filter(p => p.subject === selectedPost.subject && p.id !== selectedPost.id).slice(0, 3).map((post) => (
                      <PostCard key={post.id} post={post} onClick={setSelectedPost} searchQuery={searchQuery} />
                    ))}
                  </div>
                </section>
              )}

              </div> {/* Close flex-1 */}
              </div> {/* Close TOC grid */}
            </article>
          ) : (
            <>
              {/* Featured Post Hero */}
              {featuredPost ? (
              <section 
                onClick={() => setSelectedPost(featuredPost)}
                className="relative pb-16 border-b border-ink mb-16 cursor-pointer group"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div>
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-accent block mb-4 flex items-center gap-2">
                      <span>{featuredPost.subject}</span>
                      <span>&rsaquo;</span>
                      <span>{featuredPost.topic}</span>
                    </span>
                    <h1 className="font-display text-5xl md:text-6xl lg:text-[6rem] leading-[0.9] mb-8 tracking-tight group-hover:text-accent transition-colors">
                      {highlightText(featuredPost.title, searchQuery)}
                    </h1>
                    <p className="text-xl opacity-80 leading-relaxed mb-6">
                      {highlightText(featuredPost.snippet, searchQuery)}
                    </p>
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60">
                      {typeof featuredPost.author === 'string' ? featuredPost.author : featuredPost.author?.name} &bull; {featuredPost.date}
                    </p>
                  </div>
                  <div className="h-[60vh] max-h-[500px] w-full bg-ink/5 overflow-hidden">
                    <img src={featuredPost.image} alt={featuredPost.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                  </div>
                </div>
              </section>
              ) : (
                <div className="py-20 text-center opacity-50 font-mono text-sm uppercase tracking-widest border border-ink/10 border-dashed mb-16">
                  No posts available.
                </div>
              )}

              {/* Main Content Area */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-16">
                
                {/* Latest Posts Grid */}
                <section>
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-ink/10 pb-4">
                    <h2 className="font-display text-4xl">Latest Articles</h2>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-4 overflow-x-auto pb-2 w-full justify-start md:justify-end" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {allSubjects.map(cat => (
                          <button
                            key={cat}
                            onClick={() => handleSubjectChange(cat)}
                            className={`font-mono text-[0.65rem] uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${
                              activeSubject === cat ? 'text-accent font-bold' : 'text-ink/60 hover:text-ink'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      {allTags.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto w-full justify-start md:justify-end" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          <span className="font-mono text-[0.65rem] uppercase tracking-widest opacity-40 py-1">Tags:</span>
                          {allTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => handleTagChange(tag)}
                              className={`font-mono text-[0.65rem] uppercase tracking-widest whitespace-nowrap transition-colors border px-2 py-1 rounded-sm ${
                                activeTag === tag ? 'border-accent text-accent bg-accent/5' : 'border-ink/20 text-ink/60 hover:text-ink hover:border-ink/40'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {isGridLoading ? (
                      Array.from({ length: 4 }).map((_, i) => <PostSkeleton key={i} />)
                    ) : (
                      regularPosts.filter(p => activeSubject === 'All' || p.subject === activeSubject).map((post) => (
                        <PostCard key={post.id} post={post} onClick={setSelectedPost} searchQuery={searchQuery} />
                      ))
                    )}
                  </div>
                </section>

                {/* Sidebar */}
                <Sidebar />

              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-ink/20 py-12 mt-32 flex flex-col md:flex-row justify-between items-center gap-4 font-mono uppercase tracking-[0.1em] text-[0.65rem]">
          <p className="opacity-60">© 2026 STUDYQUAKE</p>
          <button 
            onClick={() => setIsAdminOpen(true)}
            className="flex items-center gap-2 text-accent hover:opacity-80 transition-opacity"
          >
            <Settings size={12} />
            Manage Posts
          </button>
        </footer>
      </div>

      {/* AI Search Modal */}
      <AISearchModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)} 
        initialQuery={initialAIQuery}
      />
      
      {/* Admin Dashboard Modal */}
      {isAdminOpen && (
        <AdminDashboard onClose={() => setIsAdminOpen(false)} />
      )}
    </div>
  );
}
