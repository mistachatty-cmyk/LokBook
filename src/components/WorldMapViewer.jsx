import { useEffect, useRef, useState } from 'react';
import { GLOBE_CONFIG, WORLD_SKINS } from '../constants.jsx';
import { THEMES } from '../theme/theme.js';

// Deep space stays a fixed near-black across every theme (matching how
// every real 3D-globe app renders the void) — it's the atmosphere glow and
// markers that actually read as "themed," derived straight from the app's
// own theme tokens rather than a separate hand-maintained lookup table that
// only covered 3 of ~62 themes and silently fell back to default forever.
// A purchasable skin (see WORLD_SKINS in constants.jsx) overrides the
// theme-derived look with its own fixed texture + atmosphere tint.
export default function WorldMapViewer({ posts = [], userLocation, theme = 'riso', skin = 'none', gyroMotion = { gamma: 0, beta: 0, alpha: 0 }, onPostClick, onClose }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [globeReady, setGlobeReady] = useState(false);
  const cameraRotationRef = useRef({ longitude: 0, latitude: 0 });
  // The globe.gl chunk is ~2MB — on a weak connection it can fail, or just
  // hang without ever technically rejecting. Previously any failure only
  // hit console.warn/console.error, so the modal's header rendered fine
  // while the globe area stayed permanently blank with zero feedback and
  // no loading indicator either (the outer <Suspense> in App.jsx never
  // actually fires here, since this isn't a React.lazy/use() resource).
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    setStatus('loading');
    setErrorMsg('');
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) { setStatus('error'); setErrorMsg("This is taking too long — your connection may be too slow to load the globe."); }
    }, 12000);

    // Dynamically import globe.gl only in browser environment
    import('globe.gl').then(({ default: Globe }) => {
      if (cancelled) return;
      // Derive globe colors from the app's own theme tokens instead of a
      // separate lookup table, so every theme (not just 3 of them) is covered.
      // An equipped skin (WORLD_SKINS) overrides these with its own fixed
      // texture + tint, same as any other cosmetic overriding a default look.
      const T = THEMES[theme] || THEMES.riso;
      const skinDef = WORLD_SKINS.find(s => s.id === skin);
      const themeSettings = {
        backgroundColor: skinDef?.backgroundColor || '#000011',
        atmosphereColor: skinDef?.atmosphereColor || T.accent,
      };
      const globeTextureUrl = skinDef?.textureUrl || '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg';
      const globeBumpUrl = skinDef?.bumpUrl || '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png';
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
          .atmosphereColor(themeSettings.atmosphereColor)
          .atmosphereAltitude(0.1)
          .autoRotate(GLOBE_CONFIG.autoRotate)
          .autoRotateSpeed(GLOBE_CONFIG.autoRotateSpeed);

        globeRef.current = globe;
        globe(container);
        clearTimeout(timeoutId);
        setGlobeReady(true);
        setStatus('ready');
      } catch (err) {
        console.error('Globe initialization error:', err);
        clearTimeout(timeoutId);
        setStatus('error');
        setErrorMsg("Couldn't start the globe. Try again.");
      }
      // Everything below needs a successfully-initialized globe — bail out
      // quietly rather than throwing (this used to reference `globe` from
      // inside the try block above, which is out of scope here and threw a
      // ReferenceError on every single open, regardless of theme).
      if (!globe) return;

      // Set camera position
      globe.pointOfView({ altitude: 2.5 });

      // User's own location + post pins share one pointsData call — setting
      // it twice (as this used to do) makes the second call silently
      // overwrite the first, so the two marker sets could never show together.
      const userMarkers = userLocation ? [{
        lat: userLocation.lat,
        lng: userLocation.lng,
        size: 0.8,
        color: T.accent,
        isUser: true,
      }] : [];
      const postMarkers = posts
        .filter(post => post.latitude && post.longitude && post.location_privacy === 'everyone')
        .map((post, idx) => ({
          id: post.id,
          lat: post.latitude,
          lng: post.longitude,
          size: 0.5,
          color: T.alt || T.accent,
          post,
        }));

      if (userMarkers.length > 0 || postMarkers.length > 0) {
        globe.pointsData([...userMarkers, ...postMarkers])
          .pointColor(d => d.color)
          .pointSize(d => d.size)
          .pointAltitude(0.01)
          .onPointClick(d => {
            if (d.isUser) return;
            setSelectedPost(d.post);
            if (onPostClick) onPostClick(d.post);
          });
      }

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
        // Clean up globe instance
        if (globeRef.current) {
          globeRef.current = null;
        }
      };
    }).catch(err => {
      console.warn('Failed to load globe.gl', err);
      if (!cancelled) { clearTimeout(timeoutId); setStatus('error'); setErrorMsg("Couldn't load the globe — check your connection."); }
    });

    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [posts, userLocation, theme, skin, onPostClick, retryKey]);

  useEffect(() => {
    if (!globeRef.current || !globeReady) return;
    const baseLongitude = 0;
    const baseLatitude = 20;
    const rotationLongitude = (gyroMotion.gamma || 0) * 0.3;
    const rotationLatitude = (gyroMotion.beta || 0) * 0.2;
    cameraRotationRef.current = {
      longitude: baseLongitude + rotationLongitude,
      latitude: baseLatitude - rotationLatitude
    };
    globeRef.current.pointOfView({
      lat: cameraRotationRef.current.latitude,
      lng: cameraRotationRef.current.longitude,
      altitude: 2.5
    });
  }, [gyroMotion, globeReady]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
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
              <div style={{ fontSize: 14, fontWeight: 600, maxWidth: 260, opacity: 0.9 }}>{errorMsg || "Couldn't load the globe."}</div>
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
