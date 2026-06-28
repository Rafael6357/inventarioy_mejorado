import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function saveErrorToStorage(error: Error, info?: React.ErrorInfo) {
  try {
    const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
    errors.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: info?.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
    if (errors.length > 50) errors.shift();
    localStorage.setItem('app_errors', JSON.stringify(errors));
  } catch {
    // localStorage lleno o corrupto — ignorar
  }
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    saveErrorToStorage(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-bg p-8">
          <div className="text-center max-w-md">
            <AlertTriangle className="mx-auto h-12 w-12 text-danger mb-4" />
            <h2 className="text-2xl font-bold text-text mb-2">Algo salió mal</h2>
            <p className="text-text-secondary mb-6">
              Ocurrió un error inesperado. Por favor, intente recargar la página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Recargar página
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-text-secondary cursor-pointer hover:text-text">
                  Detalles técnicos
                </summary>
                <pre className="mt-2 text-xs text-danger bg-danger/5 p-3 rounded-lg overflow-auto max-h-40">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
