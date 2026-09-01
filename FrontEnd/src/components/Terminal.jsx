import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal as XTerminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const Terminal = forwardRef(({ onTerminalReady }, ref) => {
  const terminalContainerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    const term = new XTerminal({
      cursorBlink: true,
      allowTransparency: true,
      theme: {
        background: 'transparent',
        foreground: '#e2e8f0',
        cursor: '#22d3ee',
        selectionBackground: 'rgba(51, 65, 85, 0.5)',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    
    if (terminalContainerRef.current) {
      term.open(terminalContainerRef.current);
      fitAddon.fit();
    }
    
    const resizeObserver = new ResizeObserver(() => {
      // Small timeout to allow DOM to settle before fitting
      setTimeout(() => {
        fitAddon.fit();
      }, 50);
    });
    
    if (terminalContainerRef.current) {
      resizeObserver.observe(terminalContainerRef.current);
    }

    if (onTerminalReady) {
      onTerminalReady(term);
    }
    
    return () => {
      resizeObserver.disconnect();
      term.dispose();
    };
  }, []); // Only run once on mount

  useImperativeHandle(ref, () => ({
    write: (data) => xtermRef.current?.write(data),
    clear: () => xtermRef.current?.clear(),
    getTerminal: () => xtermRef.current
  }));

  return (
    <div ref={terminalContainerRef} className="w-full h-full" style={{ overflow: 'hidden' }} />
  );
});

Terminal.displayName = 'Terminal';

export default Terminal;
