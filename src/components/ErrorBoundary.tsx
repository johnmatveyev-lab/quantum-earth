import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Could send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="text-red-800 font-semibold">Component Error</h3>
          <p className="text-red-600 text-sm mt-1">
            This component encountered an error. Please refresh the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function GlobeErrorFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-destructive/40 border-t-destructive rounded-full animate-spin mx-auto mb-4" />
        <p className="font-display text-[10px] tracking-[0.3em] text-destructive">
          GLOBE ERROR
        </p>
        <p className="font-mono text-[8px] text-muted-foreground mt-2">
          The 3D globe failed to initialize. Please refresh.
        </p>
      </div>
    </div>
  );
}
