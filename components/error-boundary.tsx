"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showReset?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch JavaScript errors in child components
 * Prevents the entire app from crashing when an error occurs
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Call optional onError callback
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Si è verificato un errore
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Si è verificato un problema nel caricamento di questo componente.
              </p>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <pre className="mt-4 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              )}
            </CardContent>
            {this.props.showReset !== false && (
              <CardFooter>
                <Button onClick={this.handleReset} variant="outline" className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Riprova
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for use with React hooks
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Simple error fallback component for pages
 */
export function PageErrorFallback({ reset }: { reset?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Oops! Qualcosa è andato storto</h2>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Si è verificato un errore inaspettato. Prova a ricaricare la pagina.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Ricarica pagina
        </Button>
        {reset && (
          <Button variant="outline" onClick={reset}>
            Riprova
          </Button>
        )}
      </div>
    </div>
  );
}

