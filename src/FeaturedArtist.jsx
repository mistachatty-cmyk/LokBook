import { useMemo } from "react";
import { useT } from "./theme/theme.js";
import NameTag from "./NameTag.jsx";
import { renderAvatar } from "./engine/draw.jsx";
import { BOT_ARTISTS, BOT_PERSONAS, botBackCatalogue } from "./engine/botArt.js";

/**
 * "Resident of the page" — one of the Lok's residents is featured at the foot
 * of the feed on every load, with their ward, vibe and a piece of world lore.
 * A different artist each time the app opens, so the world reveals itself
 * gradually rather than all at once.
 */
export default function FeaturedArtist({ onArtist, onOpen, seed }) {
  const T = useT();

  // Picked once per mount → a new resident on every app load.
  const { name, persona, piece } = useMemo(() => {
    const pool = BOT_ARTISTS.filter(n => BOT_PERSONAS[n]);
    const n = pool[Math.floor((seed ?? Math.random()) * pool.length) % pool.length];
    const cat = botBackCatalogue(n, 1);
    return { name: n, persona: BOT_PERSONAS[n], piece: cat[0] || null };
  }, [seed]);

  if (!persona) return null;

  return (
    <section className="mt-6 mb-2" aria-label={`Featured resident: ${name}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: T.accent }}>✦ Resident of the page</span>
        <span className="text-[10px] opacity-40">new one each visit</span>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: `3px solid ${T.ink}`, background: T.card, boxShadow: `6px 6px 0 ${T.shadow}` }}>
        <div className="flex gap-3 p-3">
          {piece?.frames?.length > 0 && (
            <button onClick={() => onOpen && onOpen(piece)} aria-label={`Open ${piece.title}`} className="lok-btn shrink-0 rounded-xl overflow-hidden" style={{ border: `2.5px solid ${T.ink}`, width: 78 }}>
              <img src={piece.frames[Math.floor(piece.frames.length / 2)]} alt="" className="block w-full" style={{ aspectRatio: "4/5", objectFit: "cover" }} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <button onClick={() => onArtist && onArtist(name)} className="lok-btn text-left" style={{ background: "transparent", border: "none", padding: 0 }}>
              <div className="lok-display font-extrabold text-base leading-tight truncate">
                <NameTag name={name} />
                <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded align-middle" style={{ background: T.alt, color: "#fff" }}>AI</span>
              </div>
            </button>
            <div className="text-[10px] font-bold opacity-70 mt-0.5">{persona.ward} · {persona.medium} · {persona.vibe}</div>
            <p className="text-xs opacity-85 mt-1.5 leading-snug">{persona.lore}</p>
            <div className="text-[10px] opacity-55 mt-1.5 italic">Known for: {persona.signature}</div>
          </div>
        </div>
        <button onClick={() => onArtist && onArtist(name)} className="lok-btn w-full py-2 text-xs font-extrabold"
          style={{ background: T.ink, color: T.paper, borderTop: `2.5px solid ${T.ink}` }}>
          Visit {name}'s ward →
        </button>
      </div>
    </section>
  );
}
