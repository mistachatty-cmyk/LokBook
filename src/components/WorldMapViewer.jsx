import { useEffect, useRef, useState } from 'react';
import { GLOBE_CONFIG, WORLD_SKINS } from '../constants.jsx';
import { THEMES } from '../theme/theme.js';

// Flat starfield image, used ONLY as the CSS backdrop behind the modal — it is
// what you see the instant World opens and during the loading/error states,
// before any WebGL exists. Generated locally (same memoised-canvas pattern as
// Easel.jsx's getGrainTexture) so it needs no network.
//
// The 3D scene does NOT use this; see buildStarfield() below. Painting it onto
// globe.gl's background sphere is what made the stars look blurry, oversized
// and pixelated — that sphere magnifies the texture enormously, and no amount
// of source resolution fixes it.
const STARFIELD_SIZE = 2048;
const starfieldCache = new Map();
function getStarfieldDataUrl(density = 160, tint = '#ffffff') {
  const key = `${density}|${tint}`;
  if (starfieldCache.has(key)) return starfieldCache.get(key);
  const size = STARFIELD_SIZE;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  // Density is authored against the old 512 canvas; scale by area so the sky
  // keeps the same visual star-count-per-degree at the higher resolution.
  const count = Math.round(density * (size / 512) * (size / 512) * 0.5);
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    // Mostly pinpoints, a few slightly brighter — real skies aren't uniform.
    const bright = Math.random();
    const r = bright > 0.985 ? 1.6 + Math.random() * 1.1
            : bright > 0.9  ? 0.9 + Math.random() * 0.5
            : 0.35 + Math.random() * 0.45;
    const a = 0.25 + Math.random() * 0.75;
    const rgb = tint === '#ffffff' ? '255,255,255' : hexToRgb(tint);
    // Radial gradient gives an antialiased core+halo; a flat arc at this size
    // renders as a visible hard-edged disc when magnified onto the sphere.
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.4, `rgba(${rgb},${a * 0.5})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
  }
  const url = cv.toDataURL();
  starfieldCache.set(key, url);
  return url;
}
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

// Turns a {z}/{x}/{y} template from GLOBE_CONFIG.tileLayerOptions into a real
// URL. Templates come in both orders ({z}/{y}/{x} for ArcGIS, {z}/{x}/{y} for
// OSM) and OSM also wants a subdomain, so substitution is by token rather than
// positional. Kept here because it's presentation detail, not config.
function tileUrlFor(source, x, y, level) {
  const opt = GLOBE_CONFIG.tileLayerOptions.find(o => o.id === source);
  if (!opt) return '';
  return opt.url
    .replace('{s}', ['a', 'b', 'c'][Math.abs(x + y) % 3])
    .replace('{z}', level).replace('{x}', x).replace('{y}', y);
}

// A real 3D starfield, not a stretched picture of one.
//
// Stars were previously a 2D image handed to .backgroundImageUrl(), which
// paints it onto globe.gl's background sphere. That sphere is enormous, so the
// texture gets magnified hard and the stars read as big, soft, pixelated
// rectangles no matter how much resolution the source has — you cannot win
// that fight with a bigger canvas.
//
// THREE.Points with sizeAttenuation:false draws each star as a fixed
// pixel-sized sprite regardless of distance or zoom, so they stay crisp
// pinpoints forever, and thousands of them cost one draw call.
function buildStarfield(THREE, { count = 2600, tint = '#ffffff' } = {}) {
  // Soft round sprite — a hard square point is exactly the blocky look we're
  // getting rid of.
  const s = 64;
  const cv = document.createElement('canvas');
  cv.width = s; cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const sprite = new THREE.CanvasTexture(cv);

  // Scatter on a large shell around the scene, evenly by area so they don't
  // bunch at the poles.
  const R = 4000;
  const pos = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    pos[i * 3] = R * r * Math.cos(th);
    pos[i * 3 + 1] = R * u;
    pos[i * 3 + 2] = R * r * Math.sin(th);
    const b = Math.random();
    sizes[i] = b > 0.99 ? 3.2 : b > 0.93 ? 2.2 : 1.4;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.PointsMaterial({
    size: 2, sizeAttenuation: false, map: sprite, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending,
    color: new THREE.Color(tint),
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, dispose: () => { geo.dispose(); mat.dispose(); sprite.dispose(); } };
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

  // null = the stylised skin texture (default). Anything else streams real
  // slippy-map tiles at increasing detail as you zoom in.
  const [tileSource, setTileSource] = useState(null);

  const T = THEMES[theme] || THEMES.riso;
  const skinDef = WORLD_SKINS.find(s => s.id === skin) || WORLD_SKINS[0];
  const starfieldUrl = getStarfieldDataUrl(skinDef.starfieldDensity ?? 160, skinDef.starfieldTint || '#ffffff');

  // Marker data is derived from props but must NOT be part of the globe's
  // creation effect. `posts` arrives as a fresh `.filter()` array and
  // `onPostClick` as a fresh arrow on every single App render, so having them
  // in the init deps tore the globe down and rebuilt it constantly — that is
  // the "loads, then loads again forever" cycle. Creation depends only on
  // things that genuinely change the scene; data updates in a second effect.
  const onPostClickRef = useRef(onPostClick);
  useEffect(() => { onPostClickRef.current = onPostClick; }, [onPostClick]);

  const threeRef = useRef(null);
  const disposablesRef = useRef([]);
  const starfieldRef = useRef(null);

  // ---- Effect 1: create the globe. Deps are scene-shaping only. ------------
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
    let cleanupScene = null;
    const timeoutId = setTimeout(() => {
      if (!cancelled) { setStatus('error'); setErrorMsg("Timed out after 12s loading the globe."); }
    }, 12000);

    Promise.all([import('globe.gl'), import('three')]).then(([{ default: Globe }, THREE]) => {
      if (cancelled) return;
      threeRef.current = THREE;
      const themeSettings = {
        backgroundColor: skinDef.backgroundColor || '#000011',
        atmosphereColor: skinDef.atmosphereColor || T.accent,
      };
      const globeTextureUrl = skinDef.textureUrl || '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg';
      const globeBumpUrl = skinDef.bumpUrl || '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png';
      let globe;
      try {
        const container = containerRef.current;
        if (!container) return;
        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        globe = Globe()
          .width(width)
          .height(height)
          .backgroundColor(themeSettings.backgroundColor)
          .atmosphereColor(themeSettings.atmosphereColor)
          .atmosphereAltitude(0.1);

        if (tileSource) {
          // Real slippy-map tiles: streamed per zoom level, so detail keeps
          // resolving as you zoom instead of stretching one fixed texture.
          // GLOBE_CONFIG.tileLayerOptions has existed unused since this feature
          // was written; globe.gl 2.46 finally exposes the engine for it.
          globe
            .globeTileEngineUrl((x, y, l) => tileUrlFor(tileSource, x, y, l))
            .globeTileEngineMaxLevel(GLOBE_CONFIG.tileMaxLevel ?? 13)
            .globeCurvatureResolution(3);
        } else {
          globe.globeImageUrl(globeTextureUrl).bumpImageUrl(globeBumpUrl);
        }

        globeRef.current = globe;
        globe(container);

        // Real 3D stars in the scene, so they stay pinpoint-sharp at any zoom
        // instead of being a magnified texture on the background sphere.
        const density = skinDef.starfieldDensity ?? 160;
        starfieldRef.current = buildStarfield(THREE, {
          count: Math.round(density * 16),
          tint: skinDef.starfieldTint || '#ffffff',
        });
        globe.scene().add(starfieldRef.current.points);

        // Auto-rotation lives on the OrbitControls object, NOT on the globe
        // instance. Calling `.autoRotate()` in the builder chain threw
        // "autoRotate is not a function" on every open, on every device, since
        // the feature was written — the real reason the globe never appeared.
        const controls = globe.controls();
        if (controls) {
          controls.autoRotate = GLOBE_CONFIG.autoRotate;
          controls.autoRotateSpeed = GLOBE_CONFIG.autoRotateSpeed;
          // Let people get genuinely close to the surface for detail.
          controls.minDistance = 110;
          controls.maxDistance = 800;
          controls.enableDamping = true;
          controls.dampingFactor = 0.08;
        }

        globe.pointOfView({ altitude: 2.5 });
        clearTimeout(timeoutId);
        setGlobeReady(true);
        setStatus('ready');
      } catch (err) {
        console.error('Globe initialization error:', err);
        clearTimeout(timeoutId);
        setStatus('error');
        // Surface the real exception. A generic "try again" hid a plain
        // TypeError for several rounds, and console.error is unreadable on a
        // phone — which is where this actually fails.
        setErrorMsg(`${err?.name || 'Error'}: ${err?.message || String(err)}`);
      }
      if (!globe) return;

      // Slow pulse on the user's own marker.
      const animatePulse = () => {
        pulseFrameRef.current = requestAnimationFrame(animatePulse);
        if (!userMarkerMeshesRef.current.length) return;
        const s = 1 + Math.sin(performance.now() / 700) * 0.22;
        userMarkerMeshesRef.current.forEach(m => m.scale.setScalar(s));
      };
      pulseFrameRef.current = requestAnimationFrame(animatePulse);

      const handleResize = () => {
        if (containerRef.current && globeRef.current) {
          globeRef.current.width(containerRef.current.clientWidth);
          globeRef.current.height(containerRef.current.clientHeight);
        }
      };
      window.addEventListener('resize', handleResize);

      // Teardown used to be returned from inside this .then(), where React
      // never sees it — so every rebuild leaked another resize listener and
      // another rAF loop. Hand it to the effect's real cleanup instead.
      cleanupScene = () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(pulseFrameRef.current);
        userMarkerMeshesRef.current = [];
        disposablesRef.current.forEach(d => { try { d.dispose?.(); } catch {} });
        disposablesRef.current = [];
        if (starfieldRef.current) {
          try { globe.scene().remove(starfieldRef.current.points); } catch {}
          starfieldRef.current.dispose();
          starfieldRef.current = null;
        }
        try { globe._destructor?.(); } catch {}
        globeRef.current = null;
      };
    }).catch(err => {
      console.warn('Failed to load globe.gl', err);
      if (!cancelled) {
        clearTimeout(timeoutId);
        setStatus('error');
        setErrorMsg(`Failed to load 3D library — ${err?.name || 'Error'}: ${err?.message || String(err)}`);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      setGlobeReady(false);
      if (cleanupScene) cleanupScene();
    };
  }, [theme, skin, tileSource, retryKey]);

  // ---- Effect 2: marker data only. Never rebuilds the globe. ---------------
  useEffect(() => {
    const globe = globeRef.current, THREE = threeRef.current;
    if (!globe || !THREE || !globeReady) return;

    const userMarkers = userLocation ? [{
      lat: userLocation.lat, lng: userLocation.lng,
      kind: 'user', color: T.accent, isUser: true,
    }] : [];
    const postMarkers = posts
      .filter(p => p.latitude && p.longitude && p.location_privacy === 'everyone')
      .map(p => ({ id: p.id, lat: p.latitude, lng: p.longitude, kind: 'post', color: T.alt || T.accent, post: p }));

    // Release the previous generation's GPU buffers before building new ones.
    disposablesRef.current.forEach(d => { try { d.dispose?.(); } catch {} });
    disposablesRef.current = [];
    userMarkerMeshesRef.current = [];

    globe.objectsData([...userMarkers, ...postMarkers])
      .objectLat(d => d.lat)
      .objectLng(d => d.lng)
      .objectAltitude(0.015)
      .objectThreeObject(d => {
        const mesh = buildMarkerMesh(THREE, d.kind, skinDef.markerStyle || 'beacon', d.color);
        disposablesRef.current.push(mesh.geometry, mesh.material);
        if (d.isUser) userMarkerMeshesRef.current.push(mesh);
        return mesh;
      })
      .onObjectClick(d => {
        if (d.isUser) return;
        setSelectedPost(d.post);
        onPostClickRef.current?.(d.post);
      });
  }, [posts, userLocation, globeReady, skinDef.markerStyle, T.accent, T.alt]);


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

      {/* View selector — the stylised skin, or real map tiles that keep
          resolving detail as you zoom. GLOBE_CONFIG.tileLayerOptions has been
          in the codebase unused since this feature was written; globe.gl's tile
          engine is what finally makes it real. */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute', bottom: selectedPost ? 130 : 20, left: 20, right: 20,
          zIndex: 2, display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
        }}>
          {[{ id: null, name: '✨ Skin' }, ...GLOBE_CONFIG.tileLayerOptions.map(o => ({ id: o.id, name: o.name }))]
            .map(opt => {
              const active = tileSource === opt.id;
              return (
                <button
                  key={opt.id || 'skin'}
                  onClick={() => setTileSource(opt.id)}
                  style={{
                    flexShrink: 0,
                    background: active ? '#fff' : 'rgba(255,255,255,0.12)',
                    color: active ? '#111' : '#fff',
                    border: `1.5px solid ${active ? '#fff' : 'rgba(255,255,255,0.35)'}`,
                    borderRadius: 999, padding: '7px 14px',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  {opt.name}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
