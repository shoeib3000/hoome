import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans dir-rtl text-right">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 max-w-lg w-full shadow-2xl backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mb-5 mx-auto">
              ⚠️
            </div>
            <h2 className="text-xl font-black text-center text-white mb-2">
              خطایی در بارگذاری بخش مورد نظر رخ داد
            </h2>
            <p className="text-slate-400 text-sm text-center mb-6 leading-relaxed">
              سیستم به دلیل بروز یک خطای غیرمنتظره موقتاً متوقف شد. با کلیک بر روی دکمه‌های زیر می‌توانید صفحه را بازنشانی کرده یا به صفحه اصلی بازگردید.
            </p>

            {this.state.error?.message && (
              <div className="bg-slate-950/60 rounded-xl p-3 text-xs text-rose-300/90 font-mono mb-6 overflow-x-auto border border-rose-500/20 text-left dir-ltr">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-sm"
              >
                تلاش مجدد و بارگذاری مجدد
              </button>
              <button
                onClick={this.handleGoHome}
                className="py-3 px-5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-2xl transition-all text-sm"
              >
                صفحه اصلی
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
