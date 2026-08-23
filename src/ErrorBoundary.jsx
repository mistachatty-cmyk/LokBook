import { Component } from "react";
import { isChunkLoadError, reloadForNewBuild, resetAppShell } from "./appRecovery.js";

const style = {
  wrapper: { minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F2EDE2", color: "#23306B", fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", padding: 32, textAlign: "center" },
  wrapperCompact: { minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "transparent", color: "#23306B", fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", padding: 24, textAlign: "center" },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 8 },
  msg: { fontSize: 14, opacity: 0.6, marginBottom: 24, lineHeight: 1.5 },
  code: { fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 12, opacity: 0.55, background: "rgba(35,48,107,0.08)", border: "1px solid rgba(35,48,107,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 20, maxWidth: 420, wordBreak: "break-word", textAlign: "left" },
  codeBtn: { display: "block", width: "100%", cursor: "pointer", color: "#23306B", opacity: 1 },
  copyHint: { display: "block", marginTop: 6, fontSize: 10, opacity: 0.5, fontWeight: 700, letterSpacing: "0.02em" },
  btn: { background: "#23306B", color: "#F2EDE2", border: "none", borderRadius: 12, padding: "10px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Bricolage Grotesque',system-ui,sans-serif" },
  ghostBtn: { marginTop: 14, background: "transparent", color: "#23306B", border: "none", fontSize: 12, fontWeight: 700, opacity: 0.55, cursor: "pointer", textDecoration: "underline", fontFamily: "'Bricolage Grotesque',system-ui,sans-serif" },
};

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("LokBook crashed:", error, errorInfo?.componentStack);
    this.setState({ errorInfo });
    // A chunk that 404s because a new deploy landed mid-session is not a bug in
    // the component that happened to import it — it is a stale page. Reload
    // instead of showing an error nobody can act on. Guarded and rate-limited
    // inside reloadForNewBuild, so a genuinely broken build shows Splot rather
    // than refreshing forever.
    if (isChunkLoadError(error)) reloadForNewBuild("ErrorBoundary caught a chunk load failure");
  }

  // "Try again" used to be `setState({error:null})` and nothing else. For a
  // chunk failure that re-renders, re-imports the SAME dead URL, and crashes
  // again — an inescapable loop whose only exit was clearing site data by hand.
  retry = () => {
    if (isChunkLoadError(this.state.error) && reloadForNewBuild("user tapped Try again")) return;
    this.setState({ error: null, errorInfo: null });
  };

  copyError = () => {
    const { error, errorInfo } = this.state;
    const text = `${error?.name || "Error"}: ${error?.message || String(error)}${errorInfo?.componentStack ? "\n" + errorInfo.componentStack : ""}`;
    (navigator.clipboard?.writeText(text) || Promise.reject()).then(
      () => this.setState({ copied: true }),
      () => {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); this.setState({ copied: true }); } catch {}
        document.body.removeChild(ta);
      }
    );
    clearTimeout(this._copyTimer);
    this._copyTimer = setTimeout(() => this.setState({ copied: false }), 1800);
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={this.props.compact ? style.wrapperCompact : style.wrapper}>
        <div style={style.icon}>⎛⎝⏝⏝⎠⎞</div>
        <div style={style.title}>Splot!</div>
        <div style={style.msg}>
          Something went wrong{this.props.compact ? "" : " in the studio"}.<br />
          The ink must have smudged.
        </div>
        {this.state.error && (
          <button
            onClick={this.copyError}
            title="Tap to copy the error"
            style={{ ...style.code, ...style.codeBtn }}
          >
            <span>{this.state.error.name || "Error"}: {this.state.error.message || String(this.state.error)}</span>
            <span style={style.copyHint}>{this.state.copied ? "Copied ✓" : "Tap to copy"}</span>
          </button>
        )}
        <button style={style.btn} onClick={this.retry}>
          Try again
        </button>
        {/* The escape hatch. Until now the only way out of a stale-chunk crash
            was clearing site data from browser settings, which is not something
            anyone should have to find on a phone. */}
        <button style={style.ghostBtn} onClick={resetAppShell}>
          Still stuck? Reset the app
        </button>
      </div>
    );
  }
}
