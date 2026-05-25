'use client';

import React, { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import { MessageSquare, Send, Sparkles, AlertCircle, Copy, Check } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWorkspaceProps {
  sessionId: string;
  initialHistory: ChatMessage[];
}

const SAMPLE_PROMPTS = [
  'How do I run tests in this codebase?',
  'What are the core classes and entry points?',
  'Explain the overall directory structure.',
];

// Parser to split text into paragraph blocks and code blocks
function parseChatContent(content: string) {
  if (!content) return [];

  const parts: { type: 'text' | 'code'; value: string; language?: string }[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push({ type: 'text', value: textBefore });
    }

    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      value: match[2],
    });

    lastIndex = regex.lastIndex;
  }

  const textAfter = content.substring(lastIndex);
  if (textAfter.trim()) {
    parts.push({ type: 'text', value: textAfter });
  }

  return parts;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 border border-white/5 rounded-xl bg-black/60 overflow-hidden font-mono text-[11px] leading-relaxed">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/80 border-b border-white/5">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{language || 'code'}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] text-emerald-400 font-bold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[9px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-zinc-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ChatWorkspace({ sessionId, initialHistory }: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialHistory);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync state if session changes
  useEffect(() => {
    setMessages(initialHistory);
    setError(null);
  }, [sessionId, initialHistory]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    setError(null);

    const userMessage: ChatMessage = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.ask({
        session_id: sessionId,
        question: textToSend.trim(),
      });

      // Update state with complete list from server (ground truth)
      const formattedHistory = response.chat_history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));
      setMessages(formattedHistory);
    } catch (err: any) {
      setError(err.message || 'Error fetching response from agent.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="w-full lg:w-[480px] lg:shrink-0 flex flex-col h-full bg-zinc-950/40 border-l border-white/5 backdrop-blur-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-brand-indigo" />
          <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Conversational Agent
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
          Active Session
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-indigo/10 flex items-center justify-center text-brand-indigo mb-4 animate-bounce">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-zinc-200">Ask the Repository Agent</h4>
            <p className="text-[11px] text-zinc-500 max-w-[240px] mt-1.5 leading-relaxed">
              Ask about architecture details, dependencies, test setups, or how to implement a feature.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-brand-indigo text-white font-medium rounded-tr-none'
                      : 'bg-white/5 border border-white/5 text-zinc-300 rounded-tl-none'
                  }`}
                >
                  {!isUser ? (
                    parseChatContent(msg.content).map((part, pIdx) => {
                      if (part.type === 'code') {
                        return <CodeBlock key={pIdx} code={part.value} language={part.language} />;
                      }
                      return (
                        <p key={pIdx} className="whitespace-pre-line last:mb-0 mb-2">
                          {part.value}
                        </p>
                      );
                    })
                  ) : (
                    <p className="whitespace-pre-line">{msg.content}</p>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%] flex items-center gap-1">
              <span className="dot-anim w-1.5 h-1.5 bg-zinc-400 rounded-full"></span>
              <span className="dot-anim w-1.5 h-1.5 bg-zinc-400 rounded-full"></span>
              <span className="dot-anim w-1.5 h-1.5 bg-zinc-400 rounded-full"></span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="text-[10px] text-rose-300 font-medium leading-relaxed">{error}</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length === 0 && (
        <div className="px-6 py-3 bg-zinc-950/20 border-t border-white/5">
          <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
            Suggested Prompts
          </span>
          <div className="space-y-1.5">
            {SAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                className="w-full text-left text-[11px] bg-white/[0.02] hover:bg-white/5 text-zinc-400 hover:text-zinc-200 py-2 px-3 rounded-lg border border-white/5 transition-all duration-200"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form Input */}
      <form onSubmit={handleFormSubmit} className="p-4 border-t border-white/5 bg-zinc-950/60">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask a question about the codebase..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="w-full bg-zinc-900 border border-white/5 focus:border-brand-indigo outline-none text-xs pl-4 pr-11 py-3.5 rounded-xl text-zinc-200 placeholder-zinc-600 disabled:opacity-50 transition-all duration-300"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 rounded-lg bg-brand-indigo hover:brightness-110 text-white disabled:opacity-30 disabled:hover:brightness-100 transition-all duration-200"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
