import { Component, type ReactNode } from "react";

/** Catches unexpected render/runtime errors so the app never white-screens. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError(): { crashed: boolean } {
    return { crashed: true };
  }

  componentDidCatch(error: unknown): void {
    // Dev-only log — never renders sensitive data to customers.
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error);
    }
  }

  render(): ReactNode {
    if (this.state.crashed) {
      const rtl = document.documentElement.dir === "rtl";
      return (
        <main
          dir={rtl ? "rtl" : "ltr"}
          style={{ maxWidth: 560, margin: "0 auto", padding: "80px 20px", textAlign: "center", fontFamily: "system-ui" }}
        >
          <div style={{ fontSize: 64 }}>😕</div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Something went wrong. / حدث خطأ غير متوقع.</h1>
          <p style={{ color: "#666", marginTop: 8 }}>
            Please try again. / يرجى المحاولة مرة أخرى.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, background: "#e84393", color: "#fff", fontWeight: 700, border: 0, borderRadius: 16, padding: "12px 32px", cursor: "pointer" }}
          >
            Try again / حاول مرة أخرى
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
