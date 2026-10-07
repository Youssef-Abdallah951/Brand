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
          <div style={{ fontSize: 64, display: "flex", justifyContent: "center", color: "#e84393" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
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
