import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

/**
 * Self-healing error boundary: a crashing widget renders nothing (or a small
 * fallback) instead of blanking the page, then quietly retries a few times.
 */
export class SafeBoundary extends Component<{ children: ReactNode; name: string; fallback?: ReactNode }, { failed: boolean; tries: number }> {
  override state = { failed: false, tries: 0 };
  private timer: number | undefined;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.name}]`, error, info.componentStack);
    reportLovableError(error, { boundary: this.props.name });
    if (this.state.tries < 3) {
      this.timer = window.setTimeout(() => this.setState((s) => ({ failed: false, tries: s.tries + 1 })), 3000 * (this.state.tries + 1));
    }
  }

  override componentWillUnmount() {
    window.clearTimeout(this.timer);
  }

  override render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
