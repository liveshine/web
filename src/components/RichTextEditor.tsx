import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon,
  Undo, Redo, Eraser, Code, Table
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedValue = useRef<string>(value);
  
  // Format legacy markdown-like content to HTML for the editor
  const getInitialHtml = (val: string) => {
    if (!val) return '';
    // Check if it looks like plain text with ## 
    if (val.includes('## ') && !val.includes('<h')) {
      const parts = val.split('\n\n');
      return parts.map(p => {
        if (p.startsWith('## ')) return `<h2>${p.replace('## ', '')}</h2>`;
        return `<p>${p}</p>`;
      }).join('');
    }
    return val;
  };

  useEffect(() => {
    if (editorRef.current && !isHtmlMode) {
      if (value !== lastEmittedValue.current) {
        editorRef.current.innerHTML = getInitialHtml(value);
        lastEmittedValue.current = value;
      } else if (editorRef.current.innerHTML === '') {
        editorRef.current.innerHTML = getInitialHtml(value);
      }
    }
  }, [value, isHtmlMode]);

  const emitChange = (newHtml: string) => {
    lastEmittedValue.current = newHtml;
    onChange(newHtml);
  };

  const exec = (command: string, val: string | undefined = undefined) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      emitChange(editorRef.current.innerHTML);
    }
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      emitChange(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    const url = prompt('Enter the link URL:');
    if (url) {
      exec('createLink', url);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileToImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          
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
            exec('insertImage', compressedBase64);
          }
        };
        img.src = event.target.result.toString();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileToImage(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileToImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const insertTable = () => {
    const rows = prompt('Enter number of rows:', '3');
    const cols = prompt('Enter number of columns:', '3');
    
    if (rows && cols && !isNaN(Number(rows)) && !isNaN(Number(cols))) {
      const r = parseInt(rows, 10);
      const c = parseInt(cols, 10);
      
      let html = '<table><tbody>';
      for (let i = 0; i < r; i++) {
        html += '<tr>';
        for (let j = 0; j < c; j++) {
          if (i === 0) {
            html += '<th>Header</th>';
          } else {
            html += '<td>Cell</td>';
          }
        }
        html += '</tr>';
      }
      html += '</tbody></table><p><br></p>';
      exec('insertHTML', html);
    }
  };

  const toggleView = () => {
    setIsHtmlMode(!isHtmlMode);
  };

  return (
    <div className="border border-ink/20 bg-bg w-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-ink/20 bg-ink/5">
        <select 
          defaultValue=""
          onChange={(e) => {
            exec('formatBlock', e.target.value);
            e.target.value = '';
          }}
          className="px-2 py-1 border border-ink/10 rounded-sm text-sm focus:outline-none focus:border-accent bg-bg text-ink"
        >
          <option value="" disabled>Format</option>
          <option value="P">Paragraph</option>
          <option value="H1">Heading 1</option>
          <option value="H2">Heading 2</option>
          <option value="H3">Heading 3</option>
          <option value="H4">Heading 4</option>
          <option value="H5">Heading 5</option>
          <option value="H6">Heading 6</option>
        </select>
        
        <div className="w-px h-6 bg-ink/20 mx-1"></div>

        <button type="button" onClick={() => exec('bold')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Bold"><Bold size={16} /></button>
        <button type="button" onClick={() => exec('italic')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Italic"><Italic size={16} /></button>
        <button type="button" onClick={() => exec('underline')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Underline"><Underline size={16} /></button>
        <button type="button" onClick={() => exec('strikeThrough')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Strikethrough"><Strikethrough size={16} /></button>
        
        <div className="w-px h-6 bg-ink/20 mx-1"></div>

        <div className="flex items-center gap-1">
          <label className="text-[0.65rem] font-mono uppercase opacity-60 ml-1">Text</label>
          <input type="color" onChange={(e) => exec('foreColor', e.target.value)} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Text Color" />
        </div>
        <div className="flex items-center gap-1 ml-1">
          <label className="text-[0.65rem] font-mono uppercase opacity-60 ml-1">Bg</label>
          <input type="color" onChange={(e) => exec('hiliteColor', e.target.value)} className="w-6 h-6 p-0 border-0 cursor-pointer rounded-sm" title="Background Color" />
        </div>

        <div className="w-px h-6 bg-ink/20 mx-1"></div>

        <button type="button" onClick={() => exec('justifyLeft')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Align Left"><AlignLeft size={16} /></button>
        <button type="button" onClick={() => exec('justifyCenter')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Align Center"><AlignCenter size={16} /></button>
        <button type="button" onClick={() => exec('justifyRight')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Align Right"><AlignRight size={16} /></button>
        <button type="button" onClick={() => exec('justifyFull')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Justify"><AlignJustify size={16} /></button>

        <div className="w-px h-6 bg-ink/20 mx-1"></div>

        <button type="button" onClick={() => exec('insertUnorderedList')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Bullet List"><List size={16} /></button>
        <button type="button" onClick={() => exec('insertOrderedList')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Numbered List"><ListOrdered size={16} /></button>
        <button type="button" onClick={() => exec('formatBlock', 'BLOCKQUOTE')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Blockquote"><Quote size={16} /></button>

        <div className="w-px h-6 bg-ink/20 mx-1"></div>

        <button type="button" onClick={insertLink} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Insert Link"><LinkIcon size={16} /></button>
        <button type="button" onClick={insertImage} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Insert Image"><ImageIcon size={16} /></button>
        <button type="button" onClick={insertTable} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Insert Table"><Table size={16} /></button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          className="hidden" 
        />
        
        <div className="w-px h-6 bg-ink/20 mx-1"></div>
        
        <button type="button" onClick={() => exec('removeFormat')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Clear Formatting"><Eraser size={16} /></button>
        
        <div className="w-px h-6 bg-ink/20 mx-1"></div>

        <button type="button" onClick={() => exec('undo')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Undo"><Undo size={16} /></button>
        <button type="button" onClick={() => exec('redo')} className="p-1.5 hover:bg-ink/5 rounded-sm transition-colors text-ink/80 hover:text-accent" title="Redo"><Redo size={16} /></button>

        <div className="flex-1"></div>
        <button 
          type="button" 
          onClick={toggleView} 
          className={`p-1.5 rounded-sm transition-colors flex items-center gap-1 text-[0.65rem] font-mono uppercase ${isHtmlMode ? 'bg-accent text-white' : 'hover:bg-ink/5 text-ink/80 hover:text-accent'}`}
        >
          <Code size={14} /> HTML
        </button>
      </div>

      {/* Editor Area */}
      {isHtmlMode ? (
        <textarea
          className="w-full min-h-[400px] p-4 bg-ink/5 text-ink font-mono text-sm border-none focus:outline-none resize-y"
          value={value}
          onChange={(e) => {
            emitChange(e.target.value);
          }}
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onBlur={handleInput}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="w-full min-h-[400px] p-6 focus:outline-none bg-transparent overflow-y-auto max-w-none text-ink
          [&_h1]:font-display [&_h1]:text-4xl [&_h1]:mb-6
          [&_h2]:font-display [&_h2]:text-3xl [&_h2]:mb-4 [&_h2]:mt-8
          [&_h3]:font-display [&_h3]:text-2xl [&_h3]:mb-3 [&_h3]:mt-6
          [&_h4]:font-display [&_h4]:text-xl [&_h4]:mb-2 [&_h4]:mt-4
          [&_p]:mb-4 [&_p]:leading-relaxed
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4
          [&_blockquote]:border-l-4 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:opacity-80 [&_blockquote]:mb-4
          [&_a]:text-accent [&_a]:underline [&_a:hover]:opacity-80
          [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4 [&_img]:rounded-sm
          [&_table]:w-full [&_table]:border-collapse [&_table]:mb-6
          [&_th]:border [&_th]:border-ink/20 [&_th]:p-3 [&_th]:bg-ink/5 [&_th]:text-left [&_th]:font-mono [&_th]:text-sm
          [&_td]:border [&_td]:border-ink/20 [&_td]:p-3"
        />
      )}
    </div>
  );
}
