import React, { ErrorInfo, ReactNode } from 'react';
import { Icons } from './icons/Icons';
import { Button } from './ui/Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// FIX: Explicitly extending from Component with Props and State generics to ensure props.children and state properties are correctly recognized by TypeScript.
// Fix: Use React.Component directly to resolve issues with props not being found on the class type.
export class ErrorBoundary extends React.Component<Props, State> {
  // FIX: Initialize state as a class property instead of in the constructor.
  // This correctly declares the 'state' property on the class, resolving errors where TypeScript could not find 'state' and 'props'.
  state: State = {
    hasError: false,
    error: null,
  };

  // FIX: Added constructor to explicitly pass props to the parent constructor, ensuring `this.props` is available.
  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in React component:", error, errorInfo);

    const errMsg = error?.message || '';
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      errMsg.includes('Loading chunk') ||
      errMsg.includes('Failed to fetch dynamically imported module') ||
      errMsg.includes('Importing a module script failed') ||
      errMsg.includes('error loading dynamically imported module');

    if (isChunkError && typeof window !== 'undefined') {
      const lastAutoReload = window.sessionStorage.getItem('eb-auto-reload-time');
      const now = Date.now();
      if (!lastAutoReload || now - parseInt(lastAutoReload, 10) > 15000) {
        window.sessionStorage.setItem('eb-auto-reload-time', now.toString());
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    try {
      Object.keys(window.sessionStorage).forEach(key => {
        if (key.startsWith('retry-') || key.startsWith('eb-')) {
          window.sessionStorage.removeItem(key);
        }
      });
      // Clear service worker caches if supported
      if ('caches' in window) {
        window.caches.keys().then(names => {
          names.forEach(name => window.caches.delete(name));
        }).catch(() => {});
      }
    } catch (e) {}

    // Hard reload with cache buster
    const targetUrl = window.location.pathname + window.location.search + (window.location.hash || '');
    window.location.href = targetUrl;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
               <Icons.refresh className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-6">
              We encountered an unexpected error while displaying this page.
            </p>
            
            {/* Safe error message display */}
            <div className="bg-gray-100 p-3 rounded text-left text-xs font-mono text-red-600 mb-6 overflow-auto max-h-32 border border-gray-200">
                {this.state.error?.message || 'Unknown Application Error'}
            </div>

            <Button onClick={this.handleReload} className="w-full" size="lg">
              Reload Application
            </Button>
            <p className="mt-4 text-xs text-gray-400">
              If the problem persists, please try clearing your browser cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
