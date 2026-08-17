import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV } from './Shell';

export interface Command {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Page-supplied commands, merged with navigation. */
  extraCommands?: Command[];
}

/**
 * ⌘K palette. Keyboard is the primary way around this app, so navigation and
 * page actions share one list and one filter.
 */
export function CommandPalette({ open, onClose, extraCommands = [] }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [queryText, setQueryText] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const navCommands = NAV.map((item) => ({
      id: `nav:${item.to}`,
      label: `Go to ${item.label}`,
      hint: item.to,
      run: () => navigate(item.to)
    }));
    navCommands.push({
      id: 'nav:/settings',
      label: 'Go to Settings',
      hint: '/settings',
      run: () => navigate('/settings')
    });
    return [...extraCommands, ...navCommands];
  }, [navigate, extraCommands]);

  const matches = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter((command) => command.label.toLowerCase().includes(needle));
  }, [commands, queryText]);

  // Reset each time it opens, so it never reopens mid-search.
  useEffect(() => {
    if (!open) return;
    setQueryText('');
    setCursor(0);
    inputRef.current?.focus();
  }, [open]);

  // Keep the highlight inside the list as the filter narrows.
  useEffect(() => {
    setCursor((current) => Math.min(current, Math.max(0, matches.length - 1)));
  }, [matches.length]);

  if (!open) return null;

  const runAt = (index: number) => {
    const command = matches[index];
    if (!command) return;
    onClose();
    command.run();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/40 px-4"
      onMouseDown={onClose}
    >
      <div
        className="panel w-full max-w-lg overflow-hidden"
        role="dialog"
        aria-label="Command palette"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={queryText}
          onChange={(event) => setQueryText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setCursor((c) => (c + 1) % Math.max(1, matches.length));
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setCursor((c) => (c - 1 + matches.length) % Math.max(1, matches.length));
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              runAt(cursor);
            }
          }}
          placeholder="Type a command..."
          className="w-full h-10 px-3 bg-bg-raised border-b outline-none text-[13px]"
          aria-label="Command"
        />

        <ul className="max-h-72 overflow-y-auto py-1">
          {matches.length === 0 && (
            <li className="px-3 py-2 text-[12px] text-fg-subtle">No matching command</li>
          )}
          {matches.map((command, index) => (
            <li key={command.id}>
              <button
                type="button"
                onMouseEnter={() => setCursor(index)}
                onClick={() => runAt(index)}
                className={`w-full flex items-center justify-between gap-3 px-3 h-8 text-[12px] text-left ${
                  index === cursor ? 'bg-accent-subtle text-accent' : 'hover:bg-bg-hover'
                }`}
              >
                <span className="truncate">{command.label}</span>
                {command.hint && <span className="mono text-[11px] text-fg-subtle">{command.hint}</span>}
              </button>
            </li>
          ))}
        </ul>

        <footer className="flex items-center gap-3 px-3 h-7 border-t bg-bg-sunken">
          <span className="micro flex items-center gap-1">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd> move
          </span>
          <span className="micro flex items-center gap-1">
            <kbd className="kbd">↵</kbd> run
          </span>
          <span className="micro flex items-center gap-1">
            <kbd className="kbd">esc</kbd> close
          </span>
        </footer>
      </div>
    </div>
  );
}
