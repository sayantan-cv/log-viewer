'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

// Simple JSON syntax highlighter
const SyntaxHighlighter = ({ text }) => {
  const tokens = useMemo(() => {
    const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }

      const token = match[0];
      if (match[3]) { // It's a key (ends with :)
        parts.push({ type: 'key', content: token });
      } else if (token.startsWith('"')) { // String
        parts.push({ type: 'string', content: token });
      } else if (/true|false|null/.test(token)) { // Boolean/Null
        parts.push({ type: 'boolean', content: token });
      } else { // Number
        parts.push({ type: 'number', content: token });
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return parts;
  }, [text]);

  return (
    <code className="font-mono text-sm leading-6 whitespace-pre">
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'key':
            return <span key={i} className="text-purple-600 font-semibold">{token.content}</span>;
          case 'string':
            return <span key={i} className="text-green-600">{token.content}</span>;
          case 'boolean':
            return <span key={i} className="text-blue-600 font-semibold">{token.content}</span>;
          case 'number':
            return <span key={i} className="text-orange-600">{token.content}</span>;
          default:
            return <span key={i} className="text-gray-800">{token.content}</span>;
        }
      })}
    </code>
  );
};

export default function Home() {
  const [inputLogs, setInputLogs] = useState('');
  const [outputMessages, setOutputMessages] = useState('');
  const [error, setError] = useState('');
  const [messageCount, setMessageCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef(null);
  const inputLinesRef = useRef(null);
  const outputRef = useRef(null);
  const outputLinesRef = useRef(null);

  // Helper to format a single message
  const formatMessage = (message) => {
    try {
      // Find the first '{' and last '}' to attempt JSON extraction
      const firstBrace = message.indexOf('{');
      const lastBrace = message.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const potentialJson = message.substring(firstBrace, lastBrace + 1);
        try {
          const parsed = JSON.parse(potentialJson);
          const formattedJson = JSON.stringify(parsed, null, 2);
          // Replace the original JSON part with the formatted one
          return message.substring(0, firstBrace) + formattedJson + message.substring(lastBrace + 1);
        } catch (e) {
          // If parsing fails, return original message
          return message;
        }
      }
      return message;
    } catch (e) {
      return message;
    }
  };

  // Auto-extract messages whenever input changes
  useEffect(() => {
    if (!inputLogs.trim()) {
      setOutputMessages('');
      setError('');
      setMessageCount(0);
      return;
    }

    const timer = setTimeout(() => {
      try {
        setError('');

        // Parse the JSON input
        const logs = JSON.parse(inputLogs);

        // Validate input
        if (!Array.isArray(logs)) {
          throw new Error('Input JSON must be an array of log entries');
        }

        // Sort by timestamp (ascending - least recent first)
        const sortedLogs = logs.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeA - timeB;
        });

        // Extract and format messages
        const messages = sortedLogs
          .filter(log => log.jsonPayload && log.jsonPayload.message)
          .map(log => formatMessage(log.jsonPayload.message));

        setMessageCount(messages.length);
        setOutputMessages(messages.join('\n'));
      } catch (err) {
        setError(err.message);
        setOutputMessages('');
        setMessageCount(0);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputLogs]);

  const handleInputChange = (e) => {
    setInputLogs(e.target.value);
  };

  const clearAll = () => {
    setInputLogs('');
    setOutputMessages('');
    setError('');
    setMessageCount(0);
  };

  const copyToClipboard = () => {
    if (!outputMessages) return;
    navigator.clipboard.writeText(outputMessages);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInputScroll = () => {
    if (inputRef.current && inputLinesRef.current) {
      inputLinesRef.current.scrollTop = inputRef.current.scrollTop;
    }
  };

  const handleOutputScroll = () => {
    if (outputRef.current && outputLinesRef.current) {
      outputLinesRef.current.scrollTop = outputRef.current.scrollTop;
    }
  };

  const getLineNumbers = (text) => {
    const lines = text.split('\n').length;
    return Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1).join('\n');
  };

  return (
    <main className="flex flex-col h-screen bg-white text-gray-800 font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="font-bold text-lg text-gray-900 tracking-tight">Log Viewer</h1>
        </div>

        <div className="flex items-center gap-4">
          {messageCount > 0 && (
            <span className="text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
              {messageCount} Messages
            </span>
          )}
          {error && (
            <span className="text-xs font-medium px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200">
              Invalid JSON
            </span>
          )}
          <button
            onClick={clearAll}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-50">

        {/* Left Pane: Input */}
        <div className="flex-1 min-w-0 flex flex-col border-b md:border-b-0 md:border-r border-gray-200 min-h-[50%] md:min-h-0 bg-white">
          <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Raw JSON Logs</span>
            <span className="text-xs text-gray-400">{inputLogs.split('\n').length} lines</span>
          </div>
          <div className="flex-1 relative flex overflow-hidden">
            {/* Line Numbers */}
            <div
              ref={inputLinesRef}
              className="w-12 bg-gray-50 border-r border-gray-100 text-right pr-3 pt-4 text-gray-400 font-mono text-sm leading-6 select-none overflow-hidden"
            >
              <pre>{getLineNumbers(inputLogs)}</pre>
            </div>
            {/* Editor */}
            <textarea
              ref={inputRef}
              value={inputLogs}
              onChange={handleInputChange}
              onScroll={handleInputScroll}
              placeholder='Paste your JSON logs here...'
              className="flex-1 w-full h-full bg-transparent text-gray-800 p-4 font-mono text-sm leading-6 resize-none focus:outline-none placeholder-gray-400 whitespace-pre"
              spellCheck="false"
            />
          </div>
        </div>

        {/* Right Pane: Output */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[50%] md:min-h-0 bg-white">
          <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Extracted Messages</span>
            <button
              onClick={copyToClipboard}
              disabled={!outputMessages}
              className={`text-xs font-medium px-3 py-1 rounded transition-all ${copied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
            >
              {copied ? 'Copied!' : 'Copy Result'}
            </button>
          </div>
          <div className="flex-1 relative flex overflow-hidden">
            {/* Line Numbers */}
            <div
              ref={outputLinesRef}
              className="w-12 bg-gray-50 border-r border-gray-100 text-right pr-3 pt-4 text-gray-400 font-mono text-sm leading-6 select-none overflow-hidden"
            >
              <pre>{getLineNumbers(outputMessages)}</pre>
            </div>
            {/* Formatted Output View */}
            <div
              ref={outputRef}
              onScroll={handleOutputScroll}
              className="flex-1 w-full h-full bg-transparent p-4 overflow-auto focus:outline-none"
            >
              <SyntaxHighlighter text={outputMessages} />
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
