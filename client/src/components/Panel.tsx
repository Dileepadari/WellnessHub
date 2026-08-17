import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  /** Right-aligned controls in the panel header. */
  actions?: ReactNode;
  /** Small caption after the title, e.g. a row count. */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A bordered region with a header strip. The console's only container. */
export function Panel({ title, actions, meta, children, className = '' }: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <div className="flex items-baseline gap-2 min-w-0">
          <h2 className="text-[12px] font-semibold truncate">{title}</h2>
          {meta && <span className="micro shrink-0">{meta}</span>}
        </div>
        {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

interface StateProps {
  isLoading: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyMessage?: string;
  /** Shown instead of an error when the API answers 404 for missing setup. */
  setupMessage?: string;
  onRetry?: () => void;
  children: ReactNode;
}

/**
 * The loading / error / empty triad, rendered inside a panel body so every data
 * region fails the same way and stays retryable.
 */
export function PanelState({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = 'No rows',
  setupMessage,
  onRetry,
  children
}: StateProps) {
  if (isLoading) {
    return (
      <div className="px-3 py-6 text-fg-subtle text-[12px]" role="status">
        Loading...
      </div>
    );
  }

  if (error) {
    const status = (error as { status?: number })?.status;
    if (status === 404 && setupMessage) {
      return <div className="px-3 py-6 text-fg-muted text-[12px]">{setupMessage}</div>;
    }

    return (
      <div className="px-3 py-6 flex items-center gap-3 text-[12px]" role="alert">
        <span className="text-bad">
          {error instanceof Error ? error.message : 'Request failed'}
        </span>
        {onRetry && (
          <button type="button" className="btn btn-ghost" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return <div className="px-3 py-6 text-fg-subtle text-[12px]">{emptyMessage}</div>;
  }

  return <>{children}</>;
}
