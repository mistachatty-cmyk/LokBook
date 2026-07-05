import { Component } from "react";

const style = {
  wrapper: { minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F2EDE2", color: "#23306B", fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", padding: 32, textAlign: "center" },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em", marginBottom: 8 },
  msg: { fontSize: 14, opacity: 0.6, marginBottom: 24, lineHeight: 1.5 },
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

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={style.wrapper}>
        <div style={style.icon}>⎛⎝⏝⏝⎠⎞</div>
        <div style={style.title}>Splot!</div>
        <div style={style.msg}>
          Something went wrong in the studio.<br />
          The ink must have smudged.
        </div>
        <button style={style.btn} onClick={() => { this.setState({ error: null }); }}>
          Try again
        </button>
      </div>
    );
  }
}
