import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

// Real buildings are ~10-100m tall against an ~6371km planet radius — at
// three-globe's default 100-unit radius that's a fraction of a pixel,
// invisible by construction, not by bug. Every "3D buildings on a globe"
// implementation exaggerates height for exactly this reason; this constant
// is that deliberate exaggeration, tuned against the ~1.5-3 unit camera
// distance `minDistance` now allows so a real building actually reads as a
// building rather than a bump.
const BUILDING_UNITS_PER_LEVEL = 0.09;
const DEFAULT_BUILDING_LEVELS = 3;

// A building's OSM `levels`/`height` tags, normalised to a level count.
function levelsForBuilding(tags = {}) {
  const lv = parseFloat(tags['building:levels']);
  if (lv > 0) return lv;
  const h = parseFloat(tags.height);
  if (h > 0) return h / 3; // ~3m per storey, the usual rule of thumb
  return DEFAULT_BUILDING_LEVELS;
}

// Extrudes one building footprint (an Overpass `way.geometry` array of
// {lat,lon} points) into a Three.js geometry sitting flush on the globe
// surface at its real location, with "up" following the sphere's local
// normal there rather than a flat world Y-axis (which would leave buildings
// tilted everywhere except directly under the camera).
function buildBuildingGeometry(THREE, globe, footprint, tags) {
  if (!footprint || footprint.length < 3) return null;
  const pts3D = footprint.map(p => {
    const c = globe.getCoords(p.lat, p.lon, 0);
    return new THREE.Vector3(c.x, c.y, c.z);
  });
  const centroid = pts3D.reduce((a, b) => a.add(b), new THREE.Vector3()).divideScalar(pts3D.length);
  const normal = centroid.clone().normalize();
  if (normal.lengthSq() === 0) return null;
  // An arbitrary vector not parallel to `normal`, to seed an orthonormal
  // tangent basis (u, v, normal) at this point on the sphere.
  const seed = Math.abs(normal.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const tangentU = new THREE.Vector3().crossVectors(seed, normal).normalize();
  const tangentV = new THREE.Vector3().crossVectors(normal, tangentU).normalize();
  const shapePts = pts3D.map(p => {
    const rel = p.clone().sub(centroid);
    return new THREE.Vector2(rel.dot(tangentU), rel.dot(tangentV));
  });
  let geo;
  try {
    const shape = new THREE.Shape(shapePts);
    geo = new THREE.ExtrudeGeometry(shape, { depth: levelsForBuilding(tags) * BUILDING_UNITS_PER_LEVEL, bevelEnabled: false });
  } catch { return null; } // a self-intersecting/degenerate footprint throws inside earcut
  // ExtrudeGeometry builds in the shape's own (x, y, z=depth) space — rotate
  // that local frame onto (tangentU, tangentV, normal) so "depth" points away
  // from the planet's centre at this exact spot, then move it into place.
  const basis = new THREE.Matrix4().makeBasis(tangentU, tangentV, normal);
  geo.applyMatrix4(basis);
  geo.translate(centroid.x, centroid.y, centroid.z);
  return geo;
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
export default function WorldMapViewer({ posts = [], userLocation, theme = 'riso', skin = 'none', gyroMotion = { gamma: 0, beta: 0, alpha: 0 }, onPostClick, onClose, devMode = false, onLocationOverride, onGlobeReady }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [globeReady, setGlobeReady] = useState(false);
  const cameraRotationRef = useRef({ longitude: 0, latitude: 0 });
  const userMarkerMeshesRef = useRef([]);
  const pulseFrameRef = useRef(0);
  // UI chrome (header, indicators, view selector) can be hidden for a clean
  // shot of the globe. The toggle button itself always stays reachable.
  const [uiVisible, setUiVisible] = useState(true);
  // Rotation: `rotateSpeed` is the target speed the slider is set to;
  // `rotating` is the play/pause flag. Kept separate so pausing doesn't
  // lose whatever speed was dialled in — resuming picks the same speed
  // back up. Both live-patch the existing OrbitControls instance rather
  // than rebuilding the globe.
  const [rotateSpeed, setRotateSpeed] = useState(GLOBE_CONFIG.autoRotateSpeed);
  const [rotating, setRotating] = useState(GLOBE_CONFIG.autoRotate);
  // True only while a "Fly to me" camera animation is in flight. Rotation is
  // force-paused for its duration (an OrbitControls auto-rotate tick fighting
  // an in-progress pointOfView() camera move is exactly the kind of thing
  // that made the globe jitter before) and stays paused once it lands —
  // arriving at your own pin and immediately spinning away from it would
  // defeat the point of flying there.
  const [flying, setFlying] = useState(false);
  const flyTimeoutRef = useRef(null);
  useEffect(() => () => clearTimeout(flyTimeoutRef.current), []);
  // Triple-tap the globe to hide/show the whole UI, as a faster alternative
  // to the 👁 button. Counts taps within a 500ms window; a genuine drag-to-
  // rotate doesn't fire a click event here any more than it does for the
  // existing onGlobeClick handler below, so this doesn't fight OrbitControls.
  const tapCountRef = useRef(0);
  const tapResetTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(tapResetTimerRef.current), []);
  const handleGlobeTap = useCallback(() => {
    tapCountRef.current += 1;
    clearTimeout(tapResetTimerRef.current);
    tapResetTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 500);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      clearTimeout(tapResetTimerRef.current);
      setUiVisible(v => !v);
    }
  }, []);
  const onLocationOverrideRef = useRef(onLocationOverride);
  useEffect(() => { onLocationOverrideRef.current = onLocationOverride; }, [onLocationOverride]);
  // Optional escape hatch for driving the real globe.gl instance from
  // outside — used only by the Playwright test harness (world-harness.html)
  // to set a close pointOfView() before exercising the buildings toggle,
  // rather than simulating imprecise wheel-zoom gestures. App.jsx never
  // passes this.
  const onGlobeReadyRef = useRef(onGlobeReady);
  useEffect(() => { onGlobeReadyRef.current = onGlobeReady; }, [onGlobeReady]);

  // 3D building extrusions — on by default now that it's a headline feature
  // rather than a hidden extra; still a real, visible toggle (🏢 in the
  // glass cluster) since it's a live third-party network call and real GPU
  // geometry. Auto-reloads for wherever the camera comes to rest (below,
  // via OrbitControls' 'end' event, debounced) so panning and zooming
  // around the globe keeps showing buildings for the new view without a
  // manual reload tap each time — while still only firing once movement
  // has actually stopped, not on every drag frame, to stay gentle on the
  // public Overpass instance.
  const [buildingsOn, setBuildingsOn] = useState(true);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [buildingsError, setBuildingsError] = useState('');
  const [buildingsCount, setBuildingsCount] = useState(0);
  const buildingsGroupRef = useRef(null);
  const buildingsDisposablesRef = useRef([]);
  const buildingsReqIdRef = useRef(0);

  const clearBuildings = useCallback(() => {
    const globe = globeRef.current;
    if (buildingsGroupRef.current && globe) {
      try { globe.scene().remove(buildingsGroupRef.current); } catch {}
    }
    buildingsDisposablesRef.current.forEach(d => { try { d.dispose?.(); } catch {} });
    buildingsDisposablesRef.current = [];
    buildingsGroupRef.current = null;
    setBuildingsCount(0);
  }, []);

  const loadBuildings = useCallback(async () => {
    const globe = globeRef.current, THREE = threeRef.current;
    if (!globe || !THREE) return;
    const pov = globe.pointOfView();
    // Real building footprints are only meaningful once you're at
    // street-level altitude — fetching them for a screen-filling chunk of
    // continent would be both useless (you couldn't see individual
    // buildings anyway) and a good way to get an Overpass query timeout.
    if (!pov || pov.altitude > 0.35) {
      setBuildingsError('Zoom in closer first — buildings only load at street-level altitude.');
      return;
    }
    const myReqId = ++buildingsReqIdRef.current;
    setBuildingsError('');
    setBuildingsLoading(true);
    // Bbox sized off current altitude, capped small — this is a public,
    // shared Overpass instance, not infrastructure LokBook controls.
    const spanDeg = Math.min(0.01, Math.max(0.0025, pov.altitude * 0.02));
    const south = pov.lat - spanDeg, north = pov.lat + spanDeg;
    const west = pov.lng - spanDeg, east = pov.lng + spanDeg;
    try {
      // Same-origin proxy (api/buildings.js), not overpass-api.de directly:
      // its response carries no Access-Control-Allow-Origin header at all
      // (confirmed live against the real API), so a direct browser fetch()
      // is rejected as a CORS failure — the "TypeError: Load failed" seen
      // on real devices. Server-to-server calls aren't subject to CORS, so
      // the proxy makes the exact same Overpass request this used to.
      const res = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ south, west, north, east }),
      });
      if (!res.ok) throw new Error(`buildings API ${res.status}`);
      const data = await res.json();
      // A slower/later request finishing after a newer one would otherwise
      // clobber it with stale buildings for wherever the camera used to be.
      if (myReqId !== buildingsReqIdRef.current) return;
      const ways = (data.elements || []).filter(el => el.type === 'way' && el.geometry?.length >= 3).slice(0, 300);
      clearBuildings();
      const group = new THREE.Group();
      const material = new THREE.MeshNormalMaterial({ flatShading: true });
      buildingsDisposablesRef.current.push(material);
      let built = 0;
      for (const way of ways) {
        const geo = buildBuildingGeometry(THREE, globe, way.geometry, way.tags);
        if (!geo) continue;
        buildingsDisposablesRef.current.push(geo);
        group.add(new THREE.Mesh(geo, material));
        built++;
      }
      globe.scene().add(group);
      buildingsGroupRef.current = group;
      setBuildingsCount(built);
      if (!built) setBuildingsError('No tagged buildings found here — try a denser area, or a different map tile source.');
    } catch (err) {
      if (myReqId === buildingsReqIdRef.current) {
        setBuildingsError(`Couldn't load buildings — ${err?.name || 'Error'}: ${err?.message || String(err)}`);
      }
    } finally {
      if (myReqId === buildingsReqIdRef.current) setBuildingsLoading(false);
    }
  }, [clearBuildings]);
  // Refs so the OrbitControls 'end' listener (added once, inside Effect 1's
  // one-time setup) always calls the current version of these without
  // needing to be in that effect's deps — the same pattern as
  // onPostClickRef above.
  const loadBuildingsRef = useRef(loadBuildings);
  useEffect(() => { loadBuildingsRef.current = loadBuildings; }, [loadBuildings]);
  const buildingsOnRef = useRef(buildingsOn);
  useEffect(() => { buildingsOnRef.current = buildingsOn; }, [buildingsOn]);

  useEffect(() => {
    if (!buildingsOn) { clearBuildings(); return; }
    // globeReady flips false while Effect 1 (below) tears down and rebuilds
    // the scene for a theme/skin/tile change — drop the stale group rather
    // than leak its GPU buffers into a scene that no longer exists, and
    // this effect re-fires to reload once the new globe is ready.
    if (globeReady) loadBuildings(); else clearBuildings();
  }, [buildingsOn, globeReady, loadBuildings, clearBuildings]);
  useEffect(() => () => clearBuildings(), [clearBuildings]);
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
  // Border frame around the whole view: hairline -> glow -> off. Themed, so it
  // recolours whenever the app theme changes.
  const [frameMode, setFrameMode] = useState('line'); // 'line' | 'glow' | 'off'

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
  const devModeRef = useRef(devMode);
  useEffect(() => { devModeRef.current = devMode; }, [devMode]);

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
          // Let people get genuinely close to the surface for detail — down
          // to 1.5 units above three-globe's 100-unit default radius, close
          // enough that street-level tiles (tileMaxLevel:19) and building
          // extrusions actually read as something rather than a flat wash.
          controls.minDistance = 101.5;
          controls.maxDistance = 800;
          controls.enableDamping = true;
          controls.dampingFactor = 0.08;
        }

        // Auto-reload buildings for wherever the camera comes to rest —
        // 'end' fires once when a drag/pinch/wheel interaction finishes,
        // not per-frame during it, so this can't turn into a query storm
        // while someone's actively spinning the globe. The 900ms debounce
        // on top absorbs a quick flick-then-settle as one reload, not two.
        let buildingsDebounce = null;
        const onControlsSettled = () => {
          if (!buildingsOnRef.current) return;
          clearTimeout(buildingsDebounce);
          buildingsDebounce = setTimeout(() => {
            const p = globe.pointOfView();
            if (p && p.altitude <= 0.35) loadBuildingsRef.current();
          }, 900);
        };
        if (controls) controls.addEventListener('end', onControlsSettled);

        // Dev-only: reposition the user's own pin by tapping the globe.
        // Reads devMode from a ref rather than the effect's own deps, so
        // toggling dev mode never tears down and rebuilds the scene — same
        // pattern as onPostClickRef above.
        globe.onGlobeClick(({ lat, lng }) => {
          if (!devModeRef.current) return;
          onLocationOverrideRef.current?.({ lat, lng });
        });

        globe.pointOfView({ altitude: 2.5 });
        clearTimeout(timeoutId);
        setGlobeReady(true);
        setStatus('ready');
        onGlobeReadyRef.current?.(globe);
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
        clearTimeout(buildingsDebounce);
        if (controls) controls.removeEventListener('end', onControlsSettled);
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


  // Live-patch auto-rotate onto the existing OrbitControls instance — no
  // globe rebuild needed, controls() persists for the scene's lifetime.
  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (!controls || !globeReady) return;
    controls.autoRotate = rotating && !flying && rotateSpeed > 0;
    controls.autoRotateSpeed = rotateSpeed;
  }, [rotateSpeed, rotating, flying, globeReady]);

  // "Fly to me" — animates the camera to the user's own marker via globe.gl's
  // built-in pointOfView(pov, ms) tween. Pauses rotation immediately (so the
  // two camera movements don't fight) and leaves it paused after landing.
  const flyToMe = useCallback(() => {
    if (!globeRef.current || !userLocation) return;
    setRotating(false);
    setFlying(true);
    const DURATION = 1400;
    globeRef.current.pointOfView({ lat: userLocation.lat, lng: userLocation.lng, altitude: 1.6 }, DURATION);
    clearTimeout(flyTimeoutRef.current);
    flyTimeoutRef.current = setTimeout(() => setFlying(false), DURATION);
  }, [userLocation]);

  // Explicit camera-angle control. Drag-to-rotate already lets someone tilt
  // freely (OrbitControls' polar angle is unrestricted), but that's an easy
  // gesture to miss entirely — this makes "change your viewing angle" a
  // single discoverable tap through three presets, from looking straight
  // down at the globe to a near-horizon street-level view. Pure spherical
  // math around the existing OrbitControls target; no new camera mode.
  const tiltIndexRef = useRef(0);
  const [tiltLabel, setTiltLabel] = useState('Top-down');
  const TILT_PRESETS = [
    { deg: 15, label: 'Top-down' },
    { deg: 55, label: 'Angled' },
    { deg: 82, label: 'Street level' },
  ];
  const cycleTilt = useCallback(() => {
    const globe = globeRef.current, THREE = threeRef.current;
    if (!globe || !THREE) return;
    const controls = globe.controls();
    const camera = globe.camera?.();
    if (!controls || !camera) return;
    tiltIndexRef.current = (tiltIndexRef.current + 1) % TILT_PRESETS.length;
    const preset = TILT_PRESETS[tiltIndexRef.current];
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.phi = THREE.MathUtils.degToRad(preset.deg);
    offset.setFromSpherical(spherical);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    controls.update();
    setTiltLabel(preset.label);
  }, []);

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

  // Portalled to <body>. The app root carries `filter` (Night Shift) and
  // `animation` (quake) at times, and either one makes that element the
  // containing block for position:fixed descendants — which traps this modal
  // inside the page instead of the viewport. Rendering into body sidesteps
  // every ancestor stacking context, transform and filter.
  return createPortal((
    <div style={{
      position: 'fixed', inset: 0, zIndex: 95,
    }}>
      {/* Border frame. Must be its own overlay rather than an inset shadow on
          the wrapper: the backdrop and the globe canvas are both inset:0
          children with their own backgrounds, so they paint straight over any
          shadow drawn on the parent. Themed off T.accent, so it recolours with
          every theme change. */}
      {frameMode !== 'off' && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none',
          border: `${frameMode === 'glow' ? 3 : 2}px solid ${T.accent}`,
          boxShadow: frameMode === 'glow'
            ? `inset 0 0 30px 8px ${T.accent}66, 0 0 24px 4px ${T.accent}88`
            : 'none',
          transition: 'box-shadow .35s ease, border-color .35s ease',
        }} />
      )}
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
        onClick={handleGlobeTap}
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

      {/* Controls overlay. Fades to translucent + click-through when UI is
          hidden, so the globe underneath is unobstructed (needed for the
          dev tap-to-move-pin gesture, and for a clean unobstructed shot of
          the globe generally). The eye toggle and Close stay reachable at
          all times so hiding the UI can never strand the user. */}
      <div style={{
        position: 'absolute',
        top: 'calc(20px + env(safe-area-inset-top))',
        left: 20,
        right: 20,
        zIndex: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
      }}>
        <h2 style={{
          margin: 0, color: T.paper, fontSize: 24, fontWeight: 700, textShadow: `2px 2px 0 ${T.accent}`,
          opacity: uiVisible ? 1 : 0.12, pointerEvents: uiVisible ? 'auto' : 'none',
          transition: 'opacity .35s ease',
        }}>🌍 World Map</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setFrameMode(m => (m === 'line' ? 'glow' : m === 'glow' ? 'off' : 'line'))}
            aria-label={`Border: ${frameMode}. Tap to change.`}
            style={{
              background: frameMode === 'off' ? 'transparent' : T.accent,
              color: frameMode === 'off' ? T.paper : T.onAccent,
              border: `2px solid ${T.accent}`, borderRadius: 8,
              padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              opacity: uiVisible ? 1 : 0.12, pointerEvents: uiVisible ? 'auto' : 'none',
              transition: 'opacity .35s ease',
            }}
          >
            {frameMode === 'line' ? '▢ Line' : frameMode === 'glow' ? '✧ Glow' : '▢ Off'}
          </button>
          <button
            onClick={() => setUiVisible(v => !v)}
            aria-label={uiVisible ? 'Hide map UI' : 'Show map UI'}
            style={{
              background: 'rgba(0,0,0,.35)', border: `2px solid ${T.paper}88`, borderRadius: 8,
              color: T.paper, padding: '8px 10px', fontSize: 14, cursor: 'pointer',
              backdropFilter: 'blur(6px)', transition: 'opacity .35s ease, transform .35s ease',
              opacity: uiVisible ? 1 : 0.6, transform: uiVisible ? 'scale(1)' : 'scale(0.92)',
            }}
          >
            {uiVisible ? '👁' : '👁‍🗨'}
          </button>
          <button
            onClick={onClose}
            style={{
              background: T.card,
              border: `2px solid ${T.ink}`,
              borderRadius: 8,
              color: T.ink,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: uiVisible ? 1 : 0.6,
              transition: 'opacity .35s ease',
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Dev mode: tap-to-move-pin hint only. Rotation controls moved out to
          the general Liquid Glass cluster below — flying/rotating are
          everyone's controls, not a dev feature. */}
      {devMode && (
        <div style={{
          position: 'absolute',
          top: 'calc(80px + env(safe-area-inset-top))',
          right: 20,
          background: 'rgba(0,0,0,.5)', border: `2px dashed ${T.accent}`, borderRadius: 10,
          padding: '10px 12px', color: '#fff', fontSize: 11, fontWeight: 700,
          zIndex: 2, maxWidth: 190, backdropFilter: 'blur(6px)',
          opacity: uiVisible ? 1 : 0.12, pointerEvents: uiVisible ? 'auto' : 'none',
          transition: 'opacity .35s ease',
        }}>
          🛠 Dev: tap the globe to move your pin
        </div>
      )}

      {/* Flight/rotation cluster — frosted "Liquid Glass" pill: Fly to me,
          Play/Pause, speed slider. Sits vertically centered on the right
          edge, stacked just above the view-selector row instead of dead
          centre — vertically centred was in the way of drag-to-rotate
          gestures right where a thumb naturally lands. Slides down with
          the same offset the view-selector already uses when the post
          preview card is showing, so it never collides with either.
          Fades with the rest of the chrome via uiVisible. */}
      <style>{`
        .lok-glass-btn { transition: transform .18s cubic-bezier(.34,1.56,.64,1), background .2s ease; }
        .lok-glass-btn:active:not(:disabled) { transform: scale(0.84); background: rgba(255,255,255,.32) !important; }
        .lok-glass-btn:disabled { cursor: default; }
      `}</style>
      <div style={{
        position: 'absolute',
        bottom: `calc(${selectedPost ? 130 : 20}px + 54px + env(safe-area-inset-bottom))`, right: 16,
        maxWidth: 'calc(100vw - 32px)', overflowX: 'auto', scrollbarWidth: 'none',
        zIndex: 3, display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px',
        background: 'rgba(255,255,255,0.10)',
        backdropFilter: 'blur(18px) saturate(180%)', WebkitBackdropFilter: 'blur(18px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.35)',
        borderRadius: 999,
        boxShadow: '0 8px 32px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.35)',
        opacity: uiVisible ? 1 : 0.12, pointerEvents: uiVisible ? 'auto' : 'none',
        transition: 'opacity .35s ease',
      }}>
        <button
          className="lok-glass-btn"
          onClick={flyToMe}
          disabled={!userLocation || flying}
          aria-label="Fly to my location"
          title={userLocation ? 'Fly to me' : 'Location unavailable'}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.5)',
            color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: userLocation ? 'pointer' : 'default', opacity: userLocation ? 1 : 0.35,
          }}
        >
          {flying ? '⏳' : '🎯'}
        </button>
        <button
          className="lok-glass-btn"
          onClick={() => setRotating(r => !r)}
          aria-label={rotating && !flying ? 'Pause globe rotation' : 'Resume globe rotation'}
          title={rotating && !flying ? 'Pause rotation' : 'Resume rotation'}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.5)',
            color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {rotating && !flying ? '⏸' : '▶'}
        </button>
        <input
          type="range" min="0" max="3" step="0.1" value={rotateSpeed}
          onChange={e => setRotateSpeed(+e.target.value)}
          aria-label="Globe rotation speed"
          style={{ width: 70, flexShrink: 0, accentColor: '#fff' }}
        />
        <button
          className="lok-glass-btn"
          onClick={cycleTilt}
          aria-label={`Camera angle: ${tiltLabel}. Tap to change.`}
          title={`View angle: ${tiltLabel} — tap to cycle`}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.5)',
            color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          📐
        </button>
        <button
          className="lok-glass-btn"
          onClick={() => setBuildingsOn(v => !v)}
          disabled={buildingsLoading}
          aria-pressed={buildingsOn}
          aria-label={buildingsOn ? 'Hide 3D buildings' : 'Show 3D buildings (experimental)'}
          title={buildingsOn ? 'Hide 3D buildings' : 'Show 3D buildings — loads for wherever you\'re currently looking'}
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: buildingsOn ? 'rgba(255,255,255,.34)' : 'rgba(255,255,255,.16)',
            border: '1px solid rgba(255,255,255,.5)',
            color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {buildingsLoading ? '⏳' : '🏢'}
        </button>
        {buildingsOn && (
          <button
            className="lok-glass-btn"
            onClick={loadBuildings}
            disabled={buildingsLoading}
            aria-label="Reload buildings for the current view"
            title="Reload buildings here"
            style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.5)',
              color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            ↻
          </button>
        )}
      </div>

      {/* Buildings status — count / loading / error feedback for the
          optional extrusion layer. Only shown while the layer is on, since
          otherwise there's nothing to report. */}
      {buildingsOn && (buildingsLoading || buildingsError || buildingsCount > 0) && (
        <div style={{
          position: 'absolute',
          top: 'calc(130px + env(safe-area-inset-top))',
          left: 20, maxWidth: 220,
          background: 'rgba(0,0,0,.5)', border: `1.5px solid ${buildingsError ? '#E85D5D' : T.accent}`, borderRadius: 8,
          padding: '7px 10px', color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1.4,
          zIndex: 2, backdropFilter: 'blur(6px)',
          opacity: uiVisible ? 1 : 0.12, pointerEvents: uiVisible ? 'auto' : 'none',
          transition: 'opacity .35s ease',
        }}>
          {buildingsLoading ? '🏢 loading buildings…' : buildingsError ? `🏢 ${buildingsError}` : `🏢 ${buildingsCount} building${buildingsCount === 1 ? '' : 's'} loaded — exaggerated height, real footprints`}
        </div>
      )}

      {/* Post preview card */}
      {selectedPost && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          background: T.card,
          border: `2px solid ${T.accent}`,
          borderRadius: 12,
          padding: 16,
          zIndex: 2,
          color: T.ink,
          opacity: uiVisible ? 1 : 0.12, pointerEvents: uiVisible ? 'auto' : 'none',
          transition: 'opacity .35s ease',
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
        top: 'calc(80px + env(safe-area-inset-top))',
        left: 20,
        background: T.card,
        border: `2px solid ${T.ink}`,
        borderRadius: 8,
        padding: '8px 12px',
        color: T.ink,
        fontSize: 12, fontWeight: 700,
        zIndex: 2,
        opacity: uiVisible ? 1 : 0.12, pointerEvents: uiVisible ? 'auto' : 'none',
        transition: 'opacity .35s ease',
      }}>
        🔒 Privacy: Everyone
      </div>

      {/* View selector — the stylised skin, or real map tiles that keep
          resolving detail as you zoom. GLOBE_CONFIG.tileLayerOptions has been
          in the codebase unused since this feature was written; globe.gl's tile
          engine is what finally makes it real. */}
      {status === 'ready' && (
        <div style={{
          position: 'absolute',
          bottom: `calc(${selectedPost ? 130 : 20}px + env(safe-area-inset-bottom))`,
          left: 20, right: 20,
          zIndex: 2, display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4,
          opacity: uiVisible ? 1 : 0.12, pointerEvents: uiVisible ? 'auto' : 'none',
          transition: 'opacity .35s ease',
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
  ), document.body);
}
