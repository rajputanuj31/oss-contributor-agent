'use client';

import React, { useState } from 'react';
import { Session } from './SessionSidebar';
import { BookOpen, Map, FileCode2, Star, Tag, Terminal } from 'lucide-react';

interface RepoSummaryProps {
  session: Session;
}

// Simple custom renderer to turn markdown into beautiful styled HTML
function renderMarkdown(md: string) {
  if (!md) return null;

  const lines = md.split('\n');
  const renderedElements = [];
  
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLanguage = '';

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Check code block start/end
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block and push rendered element
        renderedElements.push(
          <div key={`code-${idx}`} className="my-3.5 border border-white/5 rounded-xl bg-black/40 overflow-hidden font-mono text-[10px] leading-relaxed">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-950/60 border-b border-white/5 text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">
              {codeLanguage || 'code'}
            </div>
            <pre className="p-3.5 overflow-x-auto text-zinc-300">
              <code>{codeLines.join('\n')}</code>
            </pre>
          </div>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        // Start code block
        codeLanguage = line.trim().substring(3).trim();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headers (e.g. ### Header)
    if (line.startsWith('### ')) {
      renderedElements.push(
        <h4 key={idx} className="text-sm font-semibold text-zinc-200 mt-4 mb-2 first:mt-0 tracking-wide">
          {line.replace('### ', '')}
        </h4>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      renderedElements.push(
        <h3 key={idx} className="text-base font-bold text-zinc-100 mt-5 mb-2 first:mt-0 tracking-wide">
          {line.replace('## ', '')}
        </h3>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      renderedElements.push(
        <h2 key={idx} className="text-lg font-extrabold text-white mt-6 mb-3 first:mt-0 tracking-wide">
          {line.replace('# ', '')}
        </h2>
      );
      continue;
    }

    // Bullet points (e.g. - list item)
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const content = line.trim().replace(/^[-*]\s+/, '');
      renderedElements.push(
        <div key={idx} className="text-xs text-zinc-400 ml-5 mb-1.5 leading-relaxed flex items-start gap-2">
          <span className="text-brand-indigo font-bold shrink-0">•</span>
          <span>{parseInlineFormatting(content)}</span>
        </div>
      );
      continue;
    }

    // Numbered lists (e.g. 1. list item)
    const numListMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numListMatch) {
      const num = numListMatch[1];
      const content = numListMatch[2];
      renderedElements.push(
        <div key={idx} className="text-xs text-zinc-400 ml-5 mb-1.5 leading-relaxed flex items-start gap-1.5">
          <span className="font-semibold text-zinc-300 shrink-0">{num}.</span>
          <span>{parseInlineFormatting(content)}</span>
        </div>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      renderedElements.push(<div key={idx} className="h-2" />);
      continue;
    }

    // Standard paragraphs
    renderedElements.push(
      <p key={idx} className="text-xs text-zinc-400 mb-3 leading-relaxed">
        {parseInlineFormatting(line)}
      </p>
    );
  }

  return renderedElements;
}

// Helper to format bold (**bold**) and inline code (`code`)
function parseInlineFormatting(text: string) {
  const parts = [];
  let remaining = text;
  
  // Combine bold and code regexes
  while (remaining.length > 0) {
    const boldIndex = remaining.indexOf('**');
    const codeIndex = remaining.indexOf('`');

    if (boldIndex === -1 && codeIndex === -1) {
      parts.push(remaining);
      break;
    }

    // Check which one appears first
    if (boldIndex !== -1 && (codeIndex === -1 || boldIndex < codeIndex)) {
      // Bold matches first
      if (boldIndex > 0) {
        parts.push(remaining.substring(0, boldIndex));
      }
      const closingBoldIndex = remaining.indexOf('**', boldIndex + 2);
      if (closingBoldIndex !== -1) {
        parts.push(
          <strong key={remaining} className="font-bold text-zinc-200">
            {remaining.substring(boldIndex + 2, closingBoldIndex)}
          </strong>
        );
        remaining = remaining.substring(closingBoldIndex + 2);
      } else {
        parts.push(remaining.substring(boldIndex));
        break;
      }
    } else {
      // Code matches first
      if (codeIndex > 0) {
        parts.push(remaining.substring(0, codeIndex));
      }
      const closingCodeIndex = remaining.indexOf('`', codeIndex + 1);
      if (closingCodeIndex !== -1) {
        parts.push(
          <code key={remaining} className="bg-white/10 text-brand-indigo px-1.5 py-0.5 rounded font-mono text-[10px]">
            {remaining.substring(codeIndex + 1, closingCodeIndex)}
          </code>
        );
        remaining = remaining.substring(closingCodeIndex + 1);
      } else {
        parts.push(remaining.substring(codeIndex));
        break;
      }
    }
  }

  return parts.length > 0 ? parts : text;
}

export default function RepoSummary({ session }: RepoSummaryProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'architecture'>('summary');

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900/50 p-6 overflow-hidden">
      {/* Header Metadata card */}
      <div className="glass-card rounded-2xl p-5 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-semibold text-brand-indigo uppercase tracking-wider font-mono bg-brand-indigo/10 px-2.5 py-0.5 rounded-full border border-brand-indigo/20">
              Loaded Repo
            </span>
          </div>
          <h2 className="text-sm sm:text-xl font-bold text-zinc-100 flex flex-wrap items-center gap-2 break-all">
            {session.repoName}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            {session.repoDescription || 'No description provided.'}
          </p>
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap shrink-0">
          {session.repoLanguage && (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 py-1.5 px-3 rounded-xl text-xs font-semibold text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-indigo animate-pulse"></span>
              <span>{session.repoLanguage}</span>
            </div>
          )}
          {session.repoStars !== undefined && session.repoStars > 0 && (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 py-1.5 px-3 rounded-xl text-xs font-semibold text-zinc-300">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>{session.repoStars >= 1000 ? `${(session.repoStars / 1000).toFixed(1)}k` : session.repoStars} stars</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex-1 flex flex-col glass-card rounded-2xl overflow-hidden min-h-0">
        
        {/* Tab Headers */}
        <div className="flex border-b border-white/5 bg-zinc-950/40">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 py-4 px-6 text-xs font-semibold transition-all duration-300 border-b-2 ${
              activeTab === 'summary'
                ? 'border-brand-indigo text-zinc-100 bg-white/[0.02]'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            General Summary
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 py-4 px-6 text-xs font-semibold transition-all duration-300 border-b-2 ${
              activeTab === 'architecture'
                ? 'border-brand-indigo text-zinc-100 bg-white/[0.02]'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Map className="w-4 h-4" />
            Architecture Notes
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="prose prose-invert max-w-none">
            {activeTab === 'summary' ? (
              <div className="space-y-2">
                {renderMarkdown(session.summary)}
              </div>
            ) : (
              <div className="space-y-2">
                {renderMarkdown(session.architecture || 'No architecture notes generated.')}
              </div>
            )}
          </div>

          {/* List of Fetched Files */}
          {session.filesFetched && session.filesFetched.length > 0 && (
            <div className="mt-8 border-t border-white/5 pt-6">
              <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 mb-4">
                <FileCode2 className="w-4 h-4 text-brand-indigo" />
                Analyzed Codebase Files ({session.filesFetched.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {session.filesFetched.map((file) => (
                  <div
                    key={file}
                    className="flex items-center gap-2 bg-white/[0.02] border border-white/5 hover:border-brand-indigo/35 py-2 px-3 rounded-xl transition-all duration-300 group"
                  >
                    <FileCode2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-brand-indigo shrink-0" />
                    <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 truncate font-mono">
                      {file}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
