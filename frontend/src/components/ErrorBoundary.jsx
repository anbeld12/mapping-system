import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full p-6 rounded-xl border border-destructive/50 bg-destructive/5 shadow-lg">
            <h1 className="text-xl font-bold text-destructive mb-2">Algo salió mal</h1>
            <p className="text-sm text-muted-foreground mb-4">
              La aplicación encontró un error inesperado durante el renderizado.
            </p>
            {import.meta.env.DEV && (

              <div className="mt-4 p-3 bg-muted rounded-md overflow-auto text-xs font-mono max-h-60">
                <p className="font-bold text-destructive">{this.state.error && this.state.error.toString()}</p>
                <div className="mt-2 text-muted-foreground whitespace-pre">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </div>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Reiniciar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
