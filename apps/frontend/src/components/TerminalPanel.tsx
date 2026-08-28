import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  sessionId: string;
  onStatusChange?: (status: string) => void;
}

export function TerminalPanel({ sessionId, onStatusChange }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      fontFamily: '"JetBrains Mono", "Berkeley Mono", monospace',
      fontSize: 13,
      cursorBlink: true,
      theme: {
        background: '#181715',
        foreground: '#faf9f5',
        cursor: '#cc785c',
        selectionBackground: 'rgba(204,120,92,0.3)',
        black: '#181715',
        red: '#c64545',
        green: '#5db872',
        yellow: '#e8a55a',
        blue: '#7a9ec5',
        magenta: '#cc785c',
        cyan: '#5db8a6',
        white: '#faf9f5',
        brightBlack: '#a09d96',
        brightRed: '#d97070',
        brightGreen: '#7dca8e',
        brightYellow: '#f0bd76',
        brightBlue: '#9bb6d6',
        brightMagenta: '#dc927a',
        brightCyan: '#7dcab6',
        brightWhite: '#faf9f5',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    // Fit the terminal to its container. Grid/flex layouts may not have
    // settled synchronously, so fit on the next animation frames; the
    // ResizeObserver below handles later resizes (e.g. adding/removing agents).
    const safeFit = () => { try { fitAddon.fit(); } catch { /* not sized yet */ } };
    requestAnimationFrame(safeFit);
    requestAnimationFrame(() => requestAnimationFrame(safeFit));

    // Connect to WS
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/terminal/${sessionId}`;
    const ws = new WebSocket(wsUrl);

    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      // Send initial resize
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Binary frame = raw PTY output
        term.write(new Uint8Array(event.data));
      } else {
        // Text frame = control message
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'session_status') {
            setStatus(msg.status);
            onStatusChange?.(msg.status);
          }
        } catch {
          // ignore
        }
      }
    };

    // xterm input → WS (binary) — TextEncoder is browser-native (Buffer is not available)
    const encoder = new TextEncoder();
    const dataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(encoder.encode(data));
      }
    });

    // Resize handling
    const resizeObserver = new ResizeObserver(() => {
      safeFit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    });
    resizeObserver.observe(containerRef.current);

    ws.onerror = () => {
      setStatus('error');
      onStatusChange?.('error');
    };

    ws.onclose = () => {
      setStatus((prev) => (prev === 'connecting' ? 'error' : prev));
    };

    return () => {
      dataDisposable.dispose();
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, [sessionId, onStatusChange]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-dark">
      <div ref={containerRef} className="h-full w-full overflow-hidden" />
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center text-body-sm text-on-dark-soft">
          Connecting...
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-body-sm text-error">
          Connection error
        </div>
      )}
    </div>
  );
}
