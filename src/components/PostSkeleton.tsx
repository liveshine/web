import React from 'react';

export default function PostSkeleton() {
  return (
    <div className="border border-ink/10 p-6 flex flex-col h-full bg-bg animate-pulse">
      <div className="w-full h-48 mb-6 bg-ink/10"></div>
      <div className="h-6 bg-ink/10 w-3/4 mb-4"></div>
      <div className="h-4 bg-ink/10 w-1/2 mb-4"></div>
      <div className="space-y-2 flex-1 mt-4">
        <div className="h-3 bg-ink/10 w-full"></div>
        <div className="h-3 bg-ink/10 w-full"></div>
        <div className="h-3 bg-ink/10 w-5/6"></div>
      </div>
    </div>
  );
}
