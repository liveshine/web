import React, { useState, useRef, useEffect } from 'react';
import { Search, Menu, Moon, Sun, Sparkles, X, Rss } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { posts } from '../data';

interface NavbarProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  onSearch: (query: string, useAI: boolean) => void;
  onHome?: () => void;
}

const fuzzyMatch = (str: string, pattern: string) => {
  pattern = pattern.toLowerCase().replace(/\s/g, '');
  str = str.toLowerCase();
  let patternIdx = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === pattern[patternIdx]) {
      patternIdx++;
      if (patternIdx === pattern.length) return true;
    }
  }
  return false;
};

export default function Navbar({ darkMode, toggleDarkMode, onSearch, onHome }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearchSubmit = (e: React.FormEvent, useAI: boolean = false) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery, useAI);
      setShowSuggestions(false);
    }
  };

  const suggestions = searchQuery.trim().length > 1
    ? posts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        fuzzyMatch(post.title, searchQuery) ||
        post.subject.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="border-b border-ink py-6 mb-12 flex flex-col md:flex-row justify-between md:items-baseline gap-4">
      <div className="flex justify-between items-baseline w-full md:w-auto">
        <a 
          href="/" 
          onClick={(e) => { 
            e.preventDefault(); 
            if (onHome) onHome(); 
          }} 
          className="text-2xl font-bold tracking-tight uppercase"
        >
          STUDYQUAKE
        </a>
        <div className="flex items-center gap-4 md:hidden">
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60">Education / 2026</div>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-ink hover:text-accent transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
      
      <div className="flex flex-1 items-center justify-between md:justify-end gap-6 w-full md:w-auto relative" ref={searchRef}>
        <div className="relative flex-1 max-w-sm">
          <form onSubmit={(e) => handleSearchSubmit(e, false)} className="flex items-center gap-2 border-b border-ink/20 pb-1 w-full">
            <input
              type="text"
              className="w-full bg-transparent border-none focus:outline-none text-sm placeholder-ink/40"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
            />
            <button
              type="button"
              onClick={(e) => handleSearchSubmit(e, true)}
              className="text-[0.65rem] font-mono uppercase tracking-[0.1em] text-accent flex items-center gap-1 hover:opacity-80 transition-opacity"
              title="Ask AI"
            >
              <Sparkles size={12} />
              AI
            </button>
          </form>

          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 w-full mt-2 bg-bg border border-ink/10 shadow-2xl z-50 py-2 rounded-sm"
              >
                {suggestions.map(post => (
                  <button
                    key={post.id}
                    className="w-full text-left px-4 py-2 hover:bg-ink/5 transition-colors text-sm flex flex-col gap-1"
                    onClick={() => {
                      setSearchQuery(post.title);
                      setShowSuggestions(false);
                      onSearch(post.title, false);
                    }}
                  >
                    <span className="font-bold truncate">{post.title}</span>
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] opacity-60 truncate">
                      {post.subject} &rsaquo; {post.topic}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink/60 hover:text-ink transition-colors"
            title="RSS Feed"
          >
            <Rss size={16} />
          </a>
          <button
            onClick={toggleDarkMode}
            className="text-ink/60 hover:text-ink transition-colors"
            title="Toggle Theme"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-64 bg-bg/80 dark:bg-bg/80 backdrop-blur-xl border-l border-ink/10 shadow-2xl z-50 p-6 flex flex-col gap-8 md:hidden"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold tracking-tight">MENU</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-ink/60 hover:text-ink transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col gap-6 mt-8">
                <button
                  onClick={() => {
                    toggleDarkMode();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 text-sm font-mono uppercase tracking-widest text-ink/80 hover:text-ink transition-colors"
                >
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                
                <a 
                  href="#" 
                  className="flex items-center gap-3 text-sm font-mono uppercase tracking-widest text-ink/80 hover:text-ink transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onHome) onHome();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Home
                </a>
                
                <a 
                  href="/rss.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm font-mono uppercase tracking-widest text-ink/80 hover:text-ink transition-colors"
                >
                  <Rss size={16} />
                  RSS Feed
                </a>
              </div>
              
              <div className="mt-auto font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-40">
                StudyQuake &copy; 2026
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
