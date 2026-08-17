import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so one bad component shows a message instead of
 * unmounting the whole app and leaving a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="card p-8 text-center max-w-lg mx-auto my-8" role="alert">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-500" />
        <p className="font-medium text-gray-900 dark:text-white mb-1">This section could not be displayed</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error.message}</p>
        <button
          type="button"
          className="btn-outline btn-sm"
          onClick={() => this.setState({ error: null })}
        >
          Try again
        </button>
      </div>
    );
  }
}
