'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { X, Maximize2 } from 'lucide-react';

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Outfit, Inter, system-ui, sans-serif',
});

interface MermaidRendererProps {
  chart: string;
}

export default function MermaidRenderer({ chart }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      if (!chart) return;

      try {
        setError(null);
        // Generate unique ID for mermaid diagram rendering
        const id = `mermaid-${Math.floor(Math.random() * 1000000)}`;

        // Parse & Render using mermaid's render api
        const { svg: renderedSvg } = await mermaid.render(id, chart);

        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (isMounted) {
          setError(err.message || 'Failed to render system architecture diagram.');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="my-3.5 border border-rose-500/20 rounded-xl bg-rose-500/[0.02] p-4 text-xs leading-relaxed text-rose-400 font-mono">
        <div className="font-semibold text-rose-300 mb-1">⚠️ Diagram Rendering Failed</div>
        <p className="opacity-80 mb-2">There is a syntax issue in the generated Mermaid flowchart:</p>
        <pre className="p-2 bg-black/40 rounded border border-rose-500/10 overflow-x-auto text-[10px] whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={() => { if (svg) setIsZoomed(true); }}
        className={`my-5 border border-white/5 rounded-2xl bg-zinc-950/40 p-6 select-none backdrop-blur-sm transition-all duration-300 hover:border-brand-indigo/25 flex flex-col items-center relative group ${svg ? 'cursor-zoom-in' : ''}`}
      >
        {svg && (
          <div className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white px-2 py-1 rounded-md text-[9px] font-mono flex items-center gap-1 transition-all duration-200 z-10">
            <Maximize2 className="w-2.5 h-2.5" />
            <span>Click to Expand</span>
          </div>
        )}

        {svg ? (
          <div
            ref={containerRef}
            className="w-full flex justify-center max-w-full [&>svg]:max-w-full [&>svg]:h-auto text-zinc-100"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex items-center gap-3 py-6 text-xs text-zinc-500">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-indigo animate-ping shrink-0" />
            <span>Generating vector flowchart...</span>
          </div>
        )}
      </div>

      {/* Fullscreen Overlay Modal */}
      {isZoomed && svg && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col p-6 cursor-zoom-out animate-fade-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-indigo animate-pulse"></span>
              <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
                System Architecture Flowchart (Full Screen)
              </h3>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all duration-200 flex items-center gap-1.5 text-[10px] font-mono cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close View</span>
            </button>
          </div>

          {/* Diagram viewport container */}
          <div
            onClick={(e) => e.stopPropagation()} // Prevent close on clicking the viewport content itself
            className="flex-1 overflow-hidden p-6 bg-zinc-950/20 border border-white/5 rounded-3xl flex justify-center items-center"
          >
            <div
              className="w-full h-full flex justify-center items-center [&>svg]:!max-w-full [&>svg]:!max-h-full [&>svg]:!w-auto [&>svg]:!h-auto text-zinc-100"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </div>
      )}
    </>
  );
}
