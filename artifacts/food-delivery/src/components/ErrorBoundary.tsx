import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] py-16 px-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="font-display font-bold text-xl mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            {this.state.error?.message || "An unexpected error occurred. Please try again."}
          </p>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            <RefreshCw className="w-4 h-4" />
            Reload page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
