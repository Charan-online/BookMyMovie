import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0B0E] text-[#F4F2EE] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#12141A] border border-white/10 rounded-xl p-6 space-y-4">
            <h1 className="font-display text-2xl font-semibold text-[#F4F2EE]">
              Unable to load Lumière Cinema
            </h1>
            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Something interrupted the cinema session. Reload the page to restore your view.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 bg-[#E5A93B] text-[#0A0B0E] text-sm font-semibold rounded-lg hover:bg-[#F0B84E] transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
