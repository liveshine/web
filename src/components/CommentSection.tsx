import React, { useState } from 'react';

interface Comment {
  id: string;
  name: string;
  text: string;
  date: string;
}

interface CommentSectionProps {
  postId: number;
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      name: name.trim(),
      text: text.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    setComments([...comments, newComment]);
    setName('');
    setText('');
  };

  return (
    <section className="mt-24 pt-16 border-t border-ink/20 max-w-3xl mx-auto">
      <h3 className="font-display text-3xl mb-8">Comments ({comments.length})</h3>
      
      <form onSubmit={handleSubmit} className="mb-12 flex flex-col gap-4">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-transparent border border-ink/20 p-3 rounded-none focus:outline-none focus:border-ink/50 text-sm font-mono"
          required
        />
        <textarea
          placeholder="Share your thoughts..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="bg-transparent border border-ink/20 p-3 rounded-none focus:outline-none focus:border-ink/50 text-sm font-sans resize-y"
          required
        />
        <button
          type="submit"
          className="self-start px-6 py-3 bg-ink text-bg font-mono text-[0.65rem] uppercase tracking-[0.15em] hover:bg-accent hover:text-ink transition-colors"
        >
          Post Comment
        </button>
      </form>

      <div className="flex flex-col gap-8">
        {comments.map((comment) => (
          <div key={comment.id} className="border-b border-ink/10 pb-8 last:border-0">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-bold">{comment.name}</span>
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-50">{comment.date}</span>
            </div>
            <p className="opacity-80 leading-relaxed text-sm">{comment.text}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="opacity-50 text-sm italic">No comments yet. Be the first to share your thoughts!</p>
        )}
      </div>
    </section>
  );
}
