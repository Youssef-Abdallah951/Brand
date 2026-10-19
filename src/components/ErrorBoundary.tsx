import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** lang-resolved strings supplied by the caller (class components can't hook). */
  title?: string;
  action?: string;
}

/** Per-route error wall: a render crash inside one lazy page no longer blanks
 *  the whole SPA — navbar/footer stay interactive and retry re-mounts the route. */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center px-6 text-center">
          <div className="max-w-sm">
            <p className="font-display text-xl font-bold text-ink dark:text-[#f3ede3]">{this.props.title ?? "Something went wrong"}</p>
            <p className="text-sm text-mute dark:text-[#a89f92] mt-2 break-words" dir="auto">{String(this.state.error.message || this.state.error)}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-6 inline-block bg-ink text-[#f3ede3] font-bold text-sm px-8 py-3 rounded-full hover:bg-bronze-deep transition btn-press"
            >
              {this.props.action ?? "Retry"}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
