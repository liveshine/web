import React from 'react';
import { motion } from 'motion/react';
import { Post } from '../lib/db';

interface PostCardProps {
  post: Post;
  onClick: (post: Post) => void;
  searchQuery?: string;
}

export default function PostCard({ post, onClick, searchQuery = '' }: PostCardProps) {
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
    <motion.article 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onClick(post)}
      className="border border-ink/10 p-6 flex flex-col h-full hover:bg-ink/5 transition-colors duration-300 cursor-pointer group"
    >
      <div className="w-full h-48 mb-6 overflow-hidden bg-ink/5 relative">
        <img 
          src={post.image} 
          alt={post.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />
      </div>
      <div className="font-mono text-[0.6rem] uppercase tracking-[0.15em] opacity-60 mb-3 flex flex-wrap gap-1">
        <span>{post.subject}</span>
        <span className="mx-1">&rsaquo;</span>
        <span>{post.topic}</span>
      </div>
      <h3 className="font-display text-2xl mb-4 leading-tight group-hover:text-accent transition-colors">{highlightText(post.title, searchQuery)}</h3>
      <p className="text-ink/80 text-sm leading-relaxed flex-1 mb-6">
        {highlightText(post.snippet, searchQuery)}
      </p>
      
      <div className="flex items-center gap-3 pt-4 border-t border-ink/10 mt-auto">
        {typeof post.author !== 'string' && post.author?.avatar ? (
          <img src={post.author.avatar} alt={post.author.name} className="w-8 h-8 rounded-full object-cover border border-ink/20" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center font-display text-xs text-ink/60">
            {(typeof post.author === 'string' ? post.author : post.author?.name || 'A').charAt(0)}
          </div>
        )}
        <div className="flex flex-col">
          <span className="font-mono text-[0.65rem] uppercase tracking-widest">{typeof post.author === 'string' ? post.author : post.author?.name}</span>
          <span className="font-mono text-[0.55rem] uppercase tracking-widest opacity-60">{post.date}</span>
        </div>
      </div>
      {typeof post.author !== 'string' && post.author?.bio && (
        <div className="mt-4 pt-4 border-t border-ink/5 hidden group-hover:block transition-all duration-300">
          <p className="text-[0.7rem] leading-relaxed opacity-70 mb-2">{post.author.bio}</p>
          <div className="flex gap-3 font-mono text-[0.55rem] uppercase tracking-widest">
            {post.author.twitter && <span className="hover:text-accent">Twitter</span>}
            {post.author.github && <span className="hover:text-accent">GitHub</span>}
            {post.author.website && <span className="hover:text-accent">Website</span>}
          </div>
        </div>
      )}
    </motion.article>
  );
}
