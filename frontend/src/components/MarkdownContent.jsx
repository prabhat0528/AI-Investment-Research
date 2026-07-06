import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Reusable Markdown Content Renderer with typography overrides for light/dark mode contrast.
 */
export default function MarkdownContent({ content }) {
  if (!content) return null;
  const stringContent = Array.isArray(content) 
    ? content.map(item => `- ${item}`).join('\n') 
    : String(content);

  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        p({ children }) {
          return <p className="mb-4 text-slate-950 dark:text-slate-200 text-sm leading-relaxed">{children}</p>;
        },
        li({ children }) {
          return <li className="mb-1.5 text-slate-955 dark:text-slate-200 text-sm leading-relaxed list-disc list-inside">{children}</li>;
        },
        ul({ children }) {
          return <ul className="mb-4 pl-4 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="mb-4 pl-4 list-decimal space-y-1">{children}</ol>;
        },
        h1({ children }) {
          return <h1 className="text-2xl font-black text-slate-950 dark:text-white mt-6 mb-4">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-xl font-bold text-slate-955 dark:text-white mt-5 mb-3">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-lg font-bold text-slate-955 dark:text-white mt-4 mb-2">{children}</h3>;
        },
        h4({ children }) {
          return <h4 className="text-md font-bold text-slate-955 dark:text-white mt-3 mb-1.5">{children}</h4>;
        },
        code({ node, inline, className, children, ...props }) {
          const text = String(children).replace(/\n$/, '');
          const isBoxDrawing = /[┌┐└┘─│├┤┬┴┼]/.test(text);
          
          if (isBoxDrawing) {
            return (
              <div className="my-6 overflow-x-auto bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-lg shadow-emerald-500/5 relative group">
                <div className="absolute top-3 right-3 text-[8px] font-mono text-emerald-500/50 uppercase tracking-widest select-none">
                  Terminal Flowchart
                </div>
                <pre className="font-mono text-emerald-400 text-xs md:text-sm leading-relaxed overflow-x-auto selection:bg-emerald-500/30">
                  {text}
                </pre>
              </div>
            );
          }
          
          return inline ? (
            <code className="px-1.5 py-0.5 rounded bg-slate-105 dark:bg-white/10 font-mono text-xs text-slate-800 dark:text-slate-200" {...props}>
              {children}
            </code>
          ) : (
            <pre className="bg-slate-900 border border-white/5 rounded-2xl p-4 overflow-x-auto my-4">
              <code className="font-mono text-xs text-slate-350" {...props}>
                {text}
              </code>
            </pre>
          );
        },
        table({ children }) {
          return (
            <div className="my-6 overflow-x-auto rounded-2xl border border-slate-250 dark:border-white/10 shadow-md bg-white dark:bg-dark-900/40">
              <table className="w-full border-collapse text-xs md:text-sm text-slate-950 dark:text-slate-200">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-slate-105 dark:bg-white/10 border-b border-slate-250 dark:border-white/20 text-left font-bold text-slate-955 dark:text-slate-100 uppercase tracking-wider text-[10px]">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody className="divide-y divide-slate-200 dark:divide-white/10">{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors duration-150">{children}</tr>;
        },
        th({ children }) {
          return <th className="p-3.5 font-bold border border-slate-200 dark:border-white/10 text-slate-955 dark:text-white">{children}</th>;
        },
        td({ children }) {
          return <td className="p-3.5 font-medium border border-slate-200 dark:border-white/10 text-slate-955 dark:text-slate-200">{children}</td>;
        }
      }}
    >
      {stringContent}
    </ReactMarkdown>
  );
}
