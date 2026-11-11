import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Keeps a render-time crash in one subtree from blanking the whole app. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="text-lg font-semibold font-serif">Something went wrong</h1>
          <p className="text-sm text-slate-600">The report hit an unexpected error. Reloading usually fixes it.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-[#a50f15] text-white text-sm font-medium"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
