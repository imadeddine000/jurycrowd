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
      fontFamily: 'monospace',
      fontSize: 13,
      cursorBlink: true,
      theme: {
        background: '#0f0f0f',
        foreground: '#e0e0e0',
        cursor: '#e0e0e0',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

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
      fitAddon.fit();
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
    <div className="relative h-full w-full bg-[#0f0f0f]">
      <div ref={containerRef} className="h-full w-full" />
      {status === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          Connecting...
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive">
          Connection error
        </div>
      )}
    </div>
  );
}
