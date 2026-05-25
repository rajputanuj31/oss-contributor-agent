'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

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
    <div className="my-5 border border-white/5 rounded-2xl bg-zinc-950/40 p-6 flex justify-center overflow-x-auto select-none backdrop-blur-sm transition-all duration-300 hover:border-brand-indigo/25">
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
  );
}
