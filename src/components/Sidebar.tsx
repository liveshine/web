import React from 'react';
import { categories, learningPaths } from '../data';

export default function Sidebar() {
  return (
    <aside className="w-full space-y-12">
      
      {/* Learning Paths */}
      <div>
        <h3 className="font-display text-xl mb-4 border-b border-ink pb-2">Learning Paths</h3>
        <div className="flex flex-col gap-4">
          {learningPaths.map((path) => (
            <div key={path.id} className="group cursor-pointer p-4 border border-ink/10 hover:border-accent transition-colors">
              <h4 className="font-bold mb-1 group-hover:text-accent transition-colors text-sm">{path.title}</h4>
              <p className="text-xs opacity-70 mb-2 leading-relaxed">{path.description}</p>
              <div className="font-mono text-[0.6rem] uppercase tracking-widest text-accent">
                {path.postCount} Parts &rsaquo;
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <h3 className="font-display text-xl mb-4 border-b border-ink pb-2">Subjects</h3>
        <ul className="list-none p-0">
          {categories.map((cat, idx) => (
            <li key={idx} className="py-2 border-b border-ink/5">
              <a href="#" onClick={(e) => e.preventDefault()} className="flex justify-between items-center text-sm hover:text-accent transition-colors">
                <span>{cat.name}</span>
                <span className="font-mono text-[0.65rem] opacity-60">{cat.count}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Newsletter */}
      <div className="bg-ink/5 p-8 mt-12">
        <h3 className="font-display text-xl mb-4">Newsletter</h3>
        <p className="text-sm mb-4 text-ink/80">
          Get the latest posts delivered right to your inbox.
        </p>
        <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
          <input 
            type="email" 
            placeholder="Email address" 
            className="w-full bg-transparent border-b border-ink/20 py-2 text-sm focus:outline-none focus:border-ink transition-colors"
          />
          <button type="submit" className="bg-ink text-bg px-6 py-3 uppercase font-mono text-[0.7rem] tracking-[0.1em] hover:bg-ink/80 transition-colors mt-2">
            Subscribe
          </button>
        </form>
      </div>
      
    </aside>
  );
}
