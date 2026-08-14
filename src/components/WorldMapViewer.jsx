import { useEffect, useRef, useState } from 'react';
import { GLOBE_CONFIG, WORLD_SKINS } from '../constants.jsx';
import { THEMES } from '../theme/theme.js';

// Procedural starfield: a small canvas of scattered dots, memoized per
// (density, tint) pair — same pattern as Easel.jsx's getGrainTexture(), so
// the space feel is available instantly with zero network dependency,
// regardless of connection quality. Reused both as a CSS backdrop (visible
// the instant World opens, through loading/error states) and as the actual
// globe.gl scene background (real parallax when the globe rotates).
const starfieldCache = new Map();
function getStarfieldDataUrl(density = 160, tint = '#ffffff') {
  const key = `${density}|${tint}`;
  if (starfieldCache.has(key)) return starfieldCache.get(key);
  const size = 512;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  for (let i = 0; i < density; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 0.4 + Math.random() * 1.4;
    const a = 0.15 + Math.random() * 0.75;
    ctx.fillStyle = tint === '#ffffff' ? `rgba(255,255,255,${a})` : hexToRgba(tint, a);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const url = cv.toDataURL();
  starfieldCache.set(key, url);
  return url;
}
function hexToRgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Builds the Three.js primitive for a marker, shaped by the equipped skin's
// markerStyle. Kept to plain geometry/materials already shipped with the
// `three` peer dependency globe.gl already pulls in — no new assets, no GLTF
// loading.
function buildMarkerMesh(THREE, kind, style, color) {
  const isUser = kind === 'user';
  const size = isUser ? 0.55 : 0.32;
  let geometry;
  if (style === 'crystal') geometry = new THREE.OctahedronGeometry(size);
  else if (style === 'orb') geometry = new THREE.SphereGeometry(size, 12, 12);
  else geometry = new THREE.ConeGeometry(size * 0.75, size * 2, 8); // beacon (default)
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: isUser ? 0.95 : 0.85 });
  const mesh = new THREE.Mesh(geometry, material);
  if (style !== 'orb') mesh.rotation.x = Math.PI; // point the cone/crystal "down" onto the surface
  return mesh;
}

// Deep space stays a fixed near-black across every theme (matching how
// every real 3D-globe app renders the void) — it's the atmosphere glow,
// starfield tint, and markers that actually read as "themed," derived
// straight from the app's own theme tokens rather than a separate
// hand-maintained lookup table that only covered 3 of ~62 themes and
// silently fell back to default forever.
// A purchasable skin (see WORLD_SKINS in constants.jsx) overrides the
// theme-derived look with its own fixed texture, atmosphere tint, marker
// shape, and starfield density/tint.
export default function WorldMapViewer({ posts = [], userLocation, theme = 'riso', skin = 'none', gyroMotion = { gamma: 0, beta: 0, alpha: 0 }, onPostClick, onClose }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [globeReady, setGlobeReady] = useState(false);
  const cameraRotationRef = useRef({ longitude: 0, latitude: 0 });
  const userMarkerMeshesRef = useRef([]);
  const pulseFrameRef = useRef(0);
  // The globe.gl chunk is ~2MB — on a weak connection it can fail, or just
  // hang without ever technically rejecting. Previously any failure only
  // hit console.warn/console.error, so the modal's header rendered fine
  // while the globe area stayed permanently blank with zero feedback and
  // no loading indicator either (the outer <Suspense> in App.jsx never
  // actually fires here, since this isn't a React.lazy/use() resource).
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const T = THEMES[theme] || THEMES.riso;
  const skinDef = WORLD_SKINS.find(s => s.id === skin) || WORLD_SKINS[0];
  const starfieldUrl = getStarfieldDataUrl(skinDef.starfieldDensity ?? 160, skinDef.starfieldTint || '#ffffff');

  useEffect(() => {
    if (!containerRef.current) return;
    setStatus('loading');
    setErrorMsg('');

    // WebGL preflight, so "this browser can't do 3D at all" reports as itself
    // instead of surfacing later as a confusing globe crash.
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) {
        setStatus('error');
        setErrorMsg("This browser can't render 3D (WebGL unavailable). Try opening LokBook in Safari or Chrome directly rather than inside another app.");
        return;
      }
    } catch { /* fall through and let the real init report the failure */ }

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) { setStatus('error'); setErrorMsg("Timed out after 12s loading the globe."); }
    }, 12000);

    // Dynamically import globe.gl and three only in browser environment —
    // both are code-split out of the main bundle since most sessions never
    // open World.
    Promise.all([import('globe.gl'), import('three')]).then(([{ default: Globe }, THREE]) => {
      if (cancelled) return;
      // Derive globe colors from the app's own theme tokens instead of a
      // separate lookup table, so every theme (not just 3 of them) is covered.
      // An equipped skin (WORLD_SKINS) overrides these with its own fixed
      // texture + tint, same as any other cosmetic overriding a default look.
      const themeSettings = {
        backgroundColor: skinDef.backgroundColor || '#000011',
        atmosphereColor: skinDef.atmosphereColor || T.accent,
      };
      const globeTextureUrl = skinDef.textureUrl || '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg';
      const globeBumpUrl = skinDef.bumpUrl || '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png';
      let globe;
      try {
        // Ensure container has dimensions
        const container = containerRef.current;
        if (!container) return;

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        // Initialize globe
        globe = Globe()
          .width(width)
          .height(height)
          .globeImageUrl(globeTextureUrl)
          .bumpImageUrl(globeBumpUrl)
          .backgroundColor(themeSettings.backgroundColor)
          .backgroundImageUrl(starfieldUrl)
          .atmosphereColor(themeSettings.atmosphereColor)
          .atmosphereAltitude(0.1);

        globeRef.current = globe;
        globe(container);

        // Auto-rotation lives on the OrbitControls object, NOT on the globe
        // instance. Calling `.autoRotate()` in the builder chain above — which
        // is what this did — threw "autoRotate is not a function" on every
        // single open, on every device, since the feature was written. That
        // TypeError was the real reason the globe never appeared; it has to
        // be set here, after mounting, because controls() doesn't exist until
        // the globe is attached to a container.
        const controls = globe.controls();
        if (controls) {
          controls.autoRotate = GLOBE_CONFIG.autoRotate;
          controls.autoRotateSpeed = GLOBE_CONFIG.autoRotateSpeed;
        }

        clearTimeout(timeoutId);
        setGlobeReady(true);
        setStatus('ready');
      } catch (err) {
        console.error('Globe initialization error:', err);
        clearTimeout(timeoutId);
        setStatus('error');
        // Surface the real exception. A generic "try again" here hid a plain
        // TypeError for several rounds of debugging, and console.error is
        // unreadable on a phone — which is where this actually fails.
        setErrorMsg(`${err?.name || 'Error'}: ${err?.message || String(err)}`);
      }
      // Everything below needs a successfully-initialized globe — bail out
      // quietly rather than throwing (this used to reference `globe` from
      // inside the try block above, which is out of scope here and threw a
      // ReferenceError on every single open, regardless of theme).
      if (!globe) return;

      // Set camera position
      globe.pointOfView({ altitude: 2.5 });

      // User's own location + post pins share one objectsData call — setting
      // it twice would make the second call silently overwrite the first,
      // so the two marker sets could never show together.
      const userMarkers = userLocation ? [{
        lat: userLocation.lat,
        lng: userLocation.lng,
        kind: 'user',
        color: T.accent,
        isUser: true,
      }] : [];
      const postMarkers = posts
        .filter(post => post.latitude && post.longitude && post.location_privacy === 'everyone')
        .map(post => ({
          id: post.id,
          lat: post.latitude,
          lng: post.longitude,
          kind: 'post',
          color: T.alt || T.accent,
          post,
        }));

      userMarkerMeshesRef.current = [];
      if (userMarkers.length > 0 || postMarkers.length > 0) {
        globe.objectsData([...userMarkers, ...postMarkers])
          .objectLat(d => d.lat)
          .objectLng(d => d.lng)
          .objectAltitude(0.015)
          .objectThreeObject(d => {
            const mesh = buildMarkerMesh(THREE, d.kind, skinDef.markerStyle || 'beacon', d.color);
            if (d.isUser) userMarkerMeshesRef.current.push(mesh);
            return mesh;
          })
          .onObjectClick(d => {
            if (d.isUser) return;
            setSelectedPost(d.post);
            if (onPostClick) onPostClick(d.post);
          });
      }

      // Slow pulse on the user's own location marker — a plain scale
      // oscillation driven by rAF rather than pulling in a full
      // animation-loop hook just for one marker.
      const animatePulse = () => {
        pulseFrameRef.current = requestAnimationFrame(animatePulse);
        if (!userMarkerMeshesRef.current.length) return;
        const t = performance.now() / 700;
        const s = 1 + Math.sin(t) * 0.22;
        userMarkerMeshesRef.current.forEach(m => m.scale.setScalar(s));
      };
      pulseFrameRef.current = requestAnimationFrame(animatePulse);

      // Handle resize
      const handleResize = () => {
        if (containerRef.current && globeRef.current) {
          globeRef.current.width(containerRef.current.clientWidth);
          globeRef.current.height(containerRef.current.clientHeight);
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(pulseFrameRef.current);
        userMarkerMeshesRef.current = [];
        // Clean up globe instance
        if (globeRef.current) {
          globeRef.current = null;
        }
      };
    }).catch(err => {
      console.warn('Failed to load globe.gl', err);
      if (!cancelled) {
        clearTimeout(timeoutId);
        setStatus('error');
        setErrorMsg(`Failed to load 3D library — ${err?.name || 'Error'}: ${err?.message || String(err)}`);
      }
    });

    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [posts, userLocation, theme, skin, onPostClick, retryKey]);

  useEffect(() => {
    if (!globeRef.current || !globeReady) return;
    // Only steer the camera when the device is actually tilted. Driving
    // pointOfView() unconditionally fought the user's own OrbitControls —
    // every drag-to-rotate and pinch-to-zoom was snapped back on the next
    // update, which on a phone arrives ~60x/sec.
    const gx = gyroMotion.gamma || 0, gy = gyroMotion.beta || 0;
    if (gx === 0 && gy === 0) return;
    const baseLongitude = 0;
    const baseLatitude = 20;
    cameraRotationRef.current = {
      longitude: baseLongitude + gx * 0.3,
      latitude: baseLatitude - gy * 0.2
    };
    // Preserve whatever altitude the user has zoomed to — hard-coding 2.5
    // here is what made pinch-to-zoom impossible while gyro was running.
    const currentAltitude = globeRef.current.pointOfView()?.altitude ?? 2.5;
    globeRef.current.pointOfView({
      lat: cameraRotationRef.current.latitude,
      lng: cameraRotationRef.current.longitude,
      altitude: currentAltitude
    });
  }, [gyroMotion, globeReady]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* Backdrop — a generated starfield instead of a flat fill, so the
          "you're in a simulated space" feel is present the instant World
          opens, through the loading spinner and any error/retry state, not
          just once the globe itself has finished loading. */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: `${skinDef.backgroundColor || '#000011'} url(${starfieldUrl}) repeat`,
          cursor: 'pointer',
          zIndex: 0,
        }}
      />

      {/* Globe container */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      />

      {/* Loading / error state — the globe area used to just stay silently
          blank on a slow connection or failed chunk load, with no feedback
          at all and no way to retry. */}
      {status !== 'ready' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14, color: '#fff', textAlign: 'center', padding: 24,
        }}>
          {status === 'loading' ? (
            <>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.25)', borderTopColor: '#fff',
                animation: 'lokspin 0.8s linear infinite',
              }} />
              <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.85 }}>Loading globe…</div>
              <style>{`@keyframes lokspin{to{transform:rotate(360deg)}}`}</style>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32 }}>🌐</div>
              {/* Selectable + tappable-to-copy: this is the only way an error
                  is readable on a phone, where there is no console. */}
              <div
                onClick={() => { try { navigator.clipboard?.writeText(errorMsg || ''); } catch {} }}
                style={{
                  fontSize: 12, fontWeight: 600, maxWidth: 300, opacity: 0.95,
                  fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1.45,
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 8, padding: '10px 12px', userSelect: 'text',
                  WebkitUserSelect: 'text', cursor: 'copy', wordBreak: 'break-word',
                }}
              >
                {errorMsg || "Couldn't load the globe."}
              </div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>tap the message to copy it</div>
              <button
                onClick={() => setRetryKey(k => k + 1)}
                style={{
                  background: '#fff', color: '#111', border: 'none', borderRadius: 8,
                  padding: '8px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

      {/* Controls overlay */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        zIndex: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: 24, fontWeight: 700 }}>🌍 World Map</h2>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '2px solid #fff',
            borderRadius: 8,
            color: '#fff',
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Post preview card */}
      {selectedPost && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          background: 'rgba(20,20,30,0.95)',
          border: '2px solid #ec4899',
          borderRadius: 12,
          padding: 16,
          zIndex: 2,
          color: '#fff',
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            📍 {selectedPost.location_name || 'Unknown location'}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {selectedPost.latitude?.toFixed(4)}, {selectedPost.longitude?.toFixed(4)}
          </div>
          {selectedPost.author && (
            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>
              by {selectedPost.author}
            </div>
          )}
        </div>
      )}

      {/* Location privacy indicator */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: 20,
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 8,
        padding: '8px 12px',
        color: '#fff',
        fontSize: 12,
        zIndex: 2,
      }}>
        🔒 Privacy: Everyone
      </div>
    </div>
  );
}
