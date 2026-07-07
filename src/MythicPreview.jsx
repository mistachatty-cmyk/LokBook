import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const fx = {
  galaxy: (ref) => {
    const q = gsap.utils.selector(ref);
    const dots = q(".dot");
    if (!dots.length) return;
    dots.forEach((d, i) => {
      gsap.set(d, { x: Math.random() * 140 - 70, y: Math.random() * 140 - 70, scale: 0, opacity: 0 });
      gsap.to(d, {
        x: Math.random() * 140 - 70, y: Math.random() * 140 - 70, scale: 1, opacity: 1,
        duration: 1.2 + Math.random(), repeat: -1, yoyo: true, delay: i * 0.15,
        ease: "sine.inOut"
      });
    });
  },
  pulse: (ref) => {
    const el = ref.current;
    if (!el) return;
    gsap.to(el, {
      scale: 1.08, duration: 0.9, repeat: -1, yoyo: true, ease: "sine.inOut",
      transformOrigin: "center center"
    });
  },
  shimmer: (ref) => {
    const el = ref.current;
    if (!el) return;
    const s = document.createElement("div");
    s.style.cssText = "position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,0.3) 50%,transparent 70%);background-size:200%100%;pointer-events:none;border-radius:inherit;";
    el.style.position = "relative";
    el.appendChild(s);
    gsap.to(s, { backgroundPositionX: "200%", duration: 1.8, repeat: -1, ease: "none" });
  },
  orbit: (ref) => {
    const q = gsap.utils.selector(ref);
    const rings = q(".ring");
    rings.forEach((r, i) => {
      gsap.to(r, {
        rotation: 360, duration: 3 + i * 1.5, repeat: -1, ease: "none",
        transformOrigin: "center center"
      });
    });
  },
  breathe: (ref) => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(el, { filter: "brightness(1) saturate(1)" },
      { filter: "brightness(1.3) saturate(1.5)", duration: 1.6, repeat: -1, yoyo: true, ease: "sine.inOut" });
  },
  wave: (ref) => {
    const q = gsap.utils.selector(ref);
    const bars = q(".bar");
    bars.forEach((b, i) => {
      gsap.to(b, {
        scaleY: 1.5 + Math.random(), duration: 0.5 + Math.random() * 0.3,
        repeat: -1, yoyo: true, delay: i * 0.08, ease: "sine.inOut",
        transformOrigin: "center bottom"
      });
    });
  },
  sparkle: (ref) => {
    const q = gsap.utils.selector(ref);
    const stars = q(".star");
    stars.forEach((s, i) => {
      gsap.to(s, {
        scale: 1.6, opacity: 0.3, duration: 0.6 + Math.random() * 0.4,
        repeat: -1, yoyo: true, delay: i * 0.12, ease: "back.inOut"
      });
    });
  },
  morph: (ref) => {
    const q = gsap.utils.selector(ref);
    const shapes = q(".morph-shape");
    shapes.forEach((s, i) => {
      gsap.to(s, {
        borderRadius: `${20 + Math.random() * 40}%`, rotation: 180,
        duration: 2 + Math.random(), repeat: -1, yoyo: true, delay: i * 0.2,
        ease: "sine.inOut"
      });
    });
  },
  rain: (ref) => {
    const q = gsap.utils.selector(ref);
    const drops = q(".drop");
    drops.forEach((d, i) => {
      gsap.set(d, { y: -20, opacity: 0 });
      gsap.to(d, {
        y: 160, opacity: 0.6, duration: 0.6 + Math.random() * 0.3,
        repeat: -1, delay: i * 0.04, ease: "none"
      });
    });
  },
  aura: (ref) => {
    const el = ref.current;
    if (!el) return;
    gsap.to(el, {
      boxShadow: "0 0 30px rgba(255,93,162,0.6), 0 0 60px rgba(168,85,247,0.4)",
      duration: 1.4, repeat: -1, yoyo: true, ease: "sine.inOut"
    });
  }
};

const itemSvgs = {
  prism: () => <svg viewBox="0 0 80 80" className="w-full h-full"><polygon points="40,8 72,60 8,60" fill="none" stroke="currentColor" strokeWidth="2.5" className="morph-shape" style={{transformOrigin:"center"}}/><circle cx="40" cy="42" r="8" fill="currentColor" opacity="0.2" className="star"/><circle cx="40" cy="42" r="3" fill="currentColor"/></svg>,
  aurora: () => <svg viewBox="0 0 80 80" className="w-full h-full"><defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF5DA2"/><stop offset="1" stopColor="#2FA9A0"/></linearGradient></defs><rect x="4" y="4" width="72" height="72" rx="16" fill="url(#ag)" opacity="0.12" className="morph-shape"/><circle cx="40" cy="40" r="18" fill="none" stroke="currentColor" strokeWidth="2" className="ring"/><circle cx="40" cy="40" r="6" fill="currentColor"/><circle cx="24" cy="24" r="2" fill="currentColor" className="star"/><circle cx="56" cy="24" r="2" fill="currentColor" className="star"/><circle cx="40" cy="56" r="2" fill="currentColor" className="star"/></svg>,
  void: () => <svg viewBox="0 0 80 80" className="w-full h-full"><circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" className="ring" opacity="0.5"/><circle cx="40" cy="40" r="20" fill="none" stroke="currentColor" strokeWidth="1" className="ring" strokeDasharray="4 6"/><circle cx="40" cy="40" r="8" fill="currentColor" opacity="0.3"/><circle cx="40" cy="40" r="3" fill="currentColor"/><circle cx="20" cy="20" r="2" fill="currentColor" className="star"/><circle cx="60" cy="20" r="2" fill="currentColor" className="star"/><circle cx="25" cy="58" r="2" fill="currentColor" className="star"/><circle cx="55" cy="58" r="2" fill="currentColor" className="star"/></svg>,
  ripple: () => <svg viewBox="0 0 80 80" className="w-full h-full"><circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="1.2" className="ring"/><circle cx="40" cy="40" r="22" fill="none" stroke="currentColor" strokeWidth="1" className="ring"/><circle cx="40" cy="40" r="12" fill="none" stroke="currentColor" strokeWidth="0.8" className="ring"/><circle cx="40" cy="40" r="4" fill="currentColor"/><line x1="40" y1="4" x2="40" y2="76" stroke="currentColor" strokeWidth="0.5" opacity="0.15" className="ring"/><line x1="4" y1="40" x2="76" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.15" className="ring"/></svg>,
  cosmic: () => <svg viewBox="0 0 80 80" className="w-full h-full"><circle cx="40" cy="40" r="28" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" className="ring"/><circle cx="40" cy="40" r="16" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" className="ring"/><circle cx="40" cy="40" r="6" fill="currentColor" opacity="0.5"/><line x1="40" y1="10" x2="40" y2="70" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/><line x1="10" y1="40" x2="70" y2="40" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/><circle cx="20" cy="20" r="2" fill="currentColor" className="star"/><circle cx="60" cy="30" r="1.5" fill="currentColor" className="star"/><circle cx="30" cy="60" r="1.5" fill="currentColor" className="star"/><circle cx="55" cy="55" r="2" fill="currentColor" className="star"/></svg>,
  nebula: () => <svg viewBox="0 0 80 80" className="w-full h-full"><circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" className="ring"/><path d="M40,12 Q55,30 50,50 Q45,65 40,68" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/><path d="M40,12 Q25,30 30,50 Q35,65 40,68" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/><circle cx="40" cy="40" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" className="morph-shape"/><circle cx="40" cy="40" r="3" fill="currentColor"/></svg>,
  storm: () => <svg viewBox="0 0 80 80" className="w-full h-full"><line x1="20" y1="10" x2="20" y2="70" stroke="currentColor" strokeWidth="1.5" className="bar" opacity="0.6"/><line x1="30" y1="15" x2="30" y2="65" stroke="currentColor" strokeWidth="1.5" className="bar" opacity="0.7"/><line x1="40" y1="8" x2="40" y2="72" stroke="currentColor" strokeWidth="2" className="bar"/><line x1="50" y1="20" x2="50" y2="60" stroke="currentColor" strokeWidth="1.5" className="bar" opacity="0.7"/><line x1="60" y1="12" x2="60" y2="68" stroke="currentColor" strokeWidth="1.5" className="bar" opacity="0.6"/><circle cx="40" cy="40" r="5" fill="currentColor" opacity="0.4"/></svg>,
  pixel: () => <svg viewBox="0 0 80 80" className="w-full h-full"><rect x="16" y="16" width="48" height="48" rx="6" fill="none" stroke="currentColor" strokeWidth="2" className="morph-shape" style={{transformOrigin:"center"}}/><rect x="24" y="24" width="32" height="32" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/><rect x="32" y="32" width="16" height="16" rx="2" fill="currentColor" opacity="0.3"/><circle cx="28" cy="28" r="2" fill="currentColor" className="star"/><circle cx="52" cy="28" r="2" fill="currentColor" className="star"/><circle cx="28" cy="52" r="2" fill="currentColor" className="star"/><circle cx="52" cy="52" r="2" fill="currentColor" className="star"/></svg>,
  echo: () => <svg viewBox="0 0 80 80" className="w-full h-full"><circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="0.6" className="ring" opacity="0.3"/><circle cx="40" cy="40" r="26" fill="none" stroke="currentColor" strokeWidth="0.8" className="ring" opacity="0.4"/><circle cx="40" cy="40" r="18" fill="none" stroke="currentColor" strokeWidth="1" className="ring" opacity="0.5"/><circle cx="40" cy="40" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" className="ring"/><circle cx="40" cy="40" r="4" fill="currentColor"/></svg>,
  bloom: () => <svg viewBox="0 0 80 80" className="w-full h-full"><circle cx="40" cy="68" r="4" fill="currentColor"/><path d="M40,68 Q30,50 40,30 Q50,50 40,68Z" fill="none" stroke="currentColor" strokeWidth="1.5" className="morph-shape" style={{transformOrigin:"center 68px"}}/><path d="M40,68 Q25,45 40,20 Q55,45 40,68Z" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.4"/><circle cx="40" cy="20" r="6" fill="currentColor" opacity="0.3"/><circle cx="40" cy="20" r="3" fill="currentColor"/><circle cx="26" cy="44" r="2" fill="currentColor" className="star"/><circle cx="54" cy="44" r="2" fill="currentColor" className="star"/></svg>,
};

export default function MythicPreview({ itemId, rarity, size = "full" }) {
  const ref = useRef(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const timer = setTimeout(() => {
      if (ref.current && fx[itemId]) fx[itemId](ref);
    }, 100);
    return () => clearTimeout(timer);
  }, [itemId]);

  const Svg = itemSvgs[itemId];
  if (!Svg) return null;

  return (
    <div ref={ref} className={`MythicPreview relative ${size === "sm" ? "w-12 h-12" : "w-full h-full"}`}
      style={{ minHeight: size === "sm" ? 48 : 80 }}>
      <div className="absolute inset-0 flex items-center justify-center text-current" style={{ opacity: 0.9 }}>
        <Svg />
      </div>
      {rarity === "mythic" && (
        <div className="absolute inset-0 rounded-lg" style={{
          background: "linear-gradient(135deg, transparent 60%, rgba(255,255,255,0.12) 70%, transparent 80%)",
          backgroundSize: "200% 100%",
          animation: "lokshimmer 2.2s ease-in-out infinite",
          pointerEvents: "none"
        }} />
      )}
    </div>
  );
}
