import { Component } from "react";

const style = {
  wrapper: { minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F2EDE2", color: "#23306B", fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", padding: 32, textAlign: "center" },
  wrapperCompact: { minHeight: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "transparent", color: "#23306B", fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", padding: 24, textAlign: "center" },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 8 },
  msg: { fontSize: 14, opacity: 0.6, marginBottom: 24, lineHeight: 1.5 },
  code: { fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 12, opacity: 0.55, background: "rgba(35,48,107,0.08)", border: "1px solid rgba(35,48,107,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 20, maxWidth: 420, wordBreak: "break-word", textAlign: "left" },
  btn: { background: "#23306B", color: "#F2EDE2", border: "none", borderRadius: 12, padding: "10px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Bricolage Grotesque',system-ui,sans-serif" },
};

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("LokBook crashed:", error, errorInfo?.componentStack);
  }

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
          <div style={style.code}>
            {this.state.error.name || "Error"}: {this.state.error.message || String(this.state.error)}
          </div>
        )}
        <button style={style.btn} onClick={() => { this.setState({ error: null }); }}>
          Try again
        </button>
      </div>
    );
  }
}
