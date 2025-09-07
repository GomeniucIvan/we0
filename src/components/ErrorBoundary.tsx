import {Component, ReactNode} from 'react';
import {getErrorFixSuggestion} from '../utils/aiErrorHandler';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
  suggestion?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {hasError: false};

  static getDerivedStateFromError(error: Error): State {
    return {hasError: true, message: error.message};
  }

  componentDidCatch(error: Error, errorInfo: any): void {
    // Log the error for debugging
    console.error('ErrorBoundary caught an error', error, errorInfo);
    // Ask AI for a fix suggestion
    getErrorFixSuggestion(error).then((suggestion) => {
      this.setState({suggestion});
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <h1 className="text-lg font-bold">Something went wrong.</h1>
          {this.state.message && (
            <p className="my-2">{this.state.message}</p>
          )}
          {this.state.suggestion && (
            <div className="mt-4">
              <h2 className="font-semibold">AI suggestion</h2>
              <pre className="whitespace-pre-wrap text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                {this.state.suggestion}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

