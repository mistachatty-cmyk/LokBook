// Thin mode-selecting wrapper. The Shop used to be one 250-line component
// with an internal Simple/Legacy toggle that only unhid two tabs; that toggle
// now selects between two entirely separate components instead — the frozen
// pre-redesign UI (LegacyShop) and the streamlined default (NewShop) — so a
// UX change to the new one can never leak into the frozen one. Both share
// their buy/guard logic via ./shop/shared.jsx.
import { useState, useEffect } from "react";
import LegacyShop from "./shop/LegacyShop.jsx";
import NewShop from "./shop/NewShop.jsx";

export { WIP_CATEGORIES } from "./shop/shared.jsx";

export default function Shop(props) {
  const [legacy, setLegacy] = useState(() => {
    try { return localStorage.getItem("lok:shop:legacy") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("lok:shop:legacy", legacy ? "1" : "0"); } catch {}
  }, [legacy]);

  return legacy
    ? <LegacyShop {...props} onSwitchToNew={() => setLegacy(false)} />
    : <NewShop {...props} onSwitchToLegacy={() => setLegacy(true)} />;
}
