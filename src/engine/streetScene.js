// The street-level scene: a Three.js world measured in METRES.
//
// WHY THIS IS NOT PART OF THE GLOBE
// ---------------------------------
// three-globe renders a sphere of radius 100 units standing in for 6,371 km,
// so one unit is 63,710 m. Street level on that scale is arithmetic that does
// not work:
//
//   a 1.7 m person          = 0.0000267 units
//   a 3-storey building     = 0.00014  units
//
// Both sit far below any workable near-clip plane, and the previous street
// mode papered over it by exaggerating a storey to 0.09 units — 5,734 m — and
// then putting the eye at 0.054 units — 3,440 m — so the numbers stayed
// consistent with each other while describing a person in a small plane
// looking at 17 km-tall houses. That is exactly what shipped: a flat map seen
// from altitude, nothing extruded, street names legible. It could not be fixed
// by tuning, because there is no pair of constants that makes 2.7e-5 units
// render.
//
// So street mode is its own scene, its own camera and its own renderer, in
// metres, built on entry and torn down on exit. The globe is untouched and
// keeps doing the one thing it is good at: orbit.
//
// EVERYTHING HERE IS BUDGETED. `engine/mapQuality.js` decides how much city to
// draw, whether shadows are on, and whether the ambience animates. Those are
// rendering choices, never availability ones — every device gets the real
// scene.
//
// LICENCE: geometry comes from OpenStreetMap via the baked region packs, ODbL.
// The attribution is rendered by the component and is not optional.

const M_PER_DEG_LAT = 111132.0;
const M_PER_STOREY = 3.0;
const EYE_HEIGHT_M = 1.7;          // a person, not a helicopter
const MAX_PITCH = Math.PI / 2 - 0.02;  // cannot look through the floor

/** Local east-north-up projection about `origin`. Flat-earth is correct here:
 *  across a 1 km block the error is millimetres, and it keeps the whole scene
 *  in plain metres that anything downstream can reason about. */
export function makeProjection(origin) {
  const mPerLng = 111320.0 * Math.cos((origin.lat * Math.PI) / 180);
  return {
    origin,
    // +X east, +Z south — so -Z is north and the default camera faces north.
    toLocal: (lat, lng) => ({
      x: (lng - origin.lng) * mPerLng,
      z: -(lat - origin.lat) * M_PER_DEG_LAT,
    }),
    toGeo: (x, z) => ({
      lat: origin.lat - z / M_PER_DEG_LAT,
      lng: origin.lng + x / mPerLng,
    }),
  };
}

function skyMaterial(THREE, top, bottom) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(top) },
      bottomColor: { value: new THREE.Color(bottom) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor; uniform vec3 bottomColor;
      varying vec3 vWorld;
      void main() {
        float h = clamp(normalize(vWorld).y * 0.5 + 0.5, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, 0.8)), 1.0);
      }`,
  });
}

/** Road half-widths in metres, by the pack's road `kind` code. */
const ROAD_HALF_WIDTH = { 1: 9, 2: 7, 3: 5, 4: 3.5 };

/** Build one flat ribbon mesh covering every road line. One geometry, one draw
 *  call — a mesh per road put 1,500 draw calls on screen in Chicago. */
function buildRoads(THREE, proj, roads, colour) {
  const pos = [], idx = [];
  let v = 0;
  for (const r of roads) {
    const hw = ROAD_HALF_WIDTH[r.kind] || 4;
    const pts = r.points.map(p => proj.toLocal(p.lat, p.lng));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.5) continue;
      const nx = (-dz / len) * hw, nz = (dx / len) * hw;
      pos.push(a.x + nx, 0.02, a.z + nz, a.x - nx, 0.02, a.z - nz,
               b.x + nx, 0.02, b.z + nz, b.x - nx, 0.02, b.z - nz);
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      v += 4;
    }
  }
  if (!pos.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: colour }));
  mesh.receiveShadow = true;
  return mesh;
}

/** Car paths: straight segments of real roads, long enough to drive along. */
function carPaths(proj, roads, want) {
  const segs = [];
  for (const r of roads) {
    if (r.kind > 3) continue;                     // minor roads: leave them quiet
    const pts = r.points.map(p => proj.toLocal(p.lat, p.lng));
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len > 25) segs.push({ a, b, len });
    }
  }
  segs.sort((p, q) => Math.hypot(p.a.x, p.a.z) - Math.hypot(q.a.x, q.a.z));
  return segs.slice(0, want);
}

/**
 * Build the scene. `buildings` and `roads` are decoded region-pack rows —
 * `{ wayId, levels, points:[{lat,lng}] }` and `{ kind, points:[...] }`.
 *
 * Returns a handle: { dispose, resize, look, walk, setAmbient, state, canvas }.
 */
export function createStreetScene({
  THREE, container, origin, buildings = [], roads = [], quality,
  ambient = null, palette = {},
}) {
  if (!THREE) throw new Error("createStreetScene needs a THREE module");
  if (!container) throw new Error("createStreetScene needs a container element");

  const q = quality;
  const proj = makeProjection(origin);
  const skyTop = palette.skyTop || "#4b86c8";
  const skyBottom = palette.skyBottom || "#cfe3f2";
  const groundCol = palette.ground || "#8e9b86";
  const roadCol = palette.road || "#4a4a4e";
  const wallCol = palette.wall || "#d8d3c8";

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(skyBottom, q.drawDistance * 0.35, q.drawDistance);

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;";
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: q.antialias, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dprCap));
  renderer.setSize(container.clientWidth || 1, container.clientHeight || 1, false);
  if (q.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  // Tone mapping is what stops a lit scene reading as flat gouache. Cheap,
  // and it is most of the difference between "a diagram" and "a place".
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const camera = new THREE.PerspectiveCamera(
    62, (container.clientWidth || 1) / (container.clientHeight || 1), 0.25, q.drawDistance * 1.6);
  camera.position.set(0, EYE_HEIGHT_M, 0);

  // --- light ---------------------------------------------------------------
  scene.add(new THREE.HemisphereLight(skyTop, groundCol, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.1);
  sun.position.set(q.drawDistance * 0.35, q.drawDistance * 0.5, -q.drawDistance * 0.25);
  if (q.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize);
    const s = Math.min(q.drawDistance, 400);
    sun.shadow.camera.left = -s; sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;   sun.shadow.camera.bottom = -s;
    sun.shadow.camera.near = 1;  sun.shadow.camera.far = q.drawDistance * 2;
    sun.shadow.bias = -0.0006;
  }
  scene.add(sun);
  scene.add(sun.target);

  // --- sky + ground --------------------------------------------------------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(q.drawDistance * 1.4, 24, 16),
    skyMaterial(THREE, skyTop, skyBottom));
  sky.frustumCulled = false;
  scene.add(sky);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(q.drawDistance * 3, q.drawDistance * 3),
    new THREE.MeshLambertMaterial({ color: groundCol }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- buildings -----------------------------------------------------------
  // Nearest-first, so a budget cut removes the far skyline rather than the
  // block you are standing in.
  const ranked = buildings
    .map(b => {
      const p = proj.toLocal(b.points[0].lat, b.points[0].lng);
      return { b, d: Math.hypot(p.x, p.z) };
    })
    .filter(r => r.d <= q.drawDistance)
    .sort((r1, r2) => r1.d - r2.d)
    .slice(0, q.maxBuildings);

  const buildingMeshes = [];
  const wallMat = new THREE.MeshLambertMaterial({ color: wallCol });
  for (const { b } of ranked) {
    const pts = b.points.map(p => {
      const l = proj.toLocal(p.lat, p.lng);
      return new THREE.Vector2(l.x, -l.z);   // shape Y = north; rotated below
    });
    if (pts.length < 3) continue;
    let geo;
    try {
      geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
        depth: Math.max(1, b.levels) * M_PER_STOREY, bevelEnabled: false,
      });
    } catch { continue; }   // self-intersecting footprint: earcut throws
    // Extrude builds in (x, y, +z=height). Rotating -90° about X sends
    // height to +Y and shape-north to -Z, which is the convention above.
    geo.rotateX(-Math.PI / 2);
    // Each building is its own mesh on purpose: Stage 3 painting needs to
    // raycast to ONE building and key art to its OSM way id. Merging them
    // would be faster and would make the whole feature impossible.
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.castShadow = q.shadows;
    mesh.receiveShadow = q.shadows;
    mesh.userData = { wayId: b.wayId, levels: b.levels, kind: "building" };
    scene.add(mesh);
    buildingMeshes.push(mesh);
  }

  // --- roads ---------------------------------------------------------------
  let roadMesh = null;
  if (q.roads && roads.length) {
    roadMesh = buildRoads(THREE, proj, roads, roadCol);
    if (roadMesh) scene.add(roadMesh);
  }

  // --- ambience ------------------------------------------------------------
  // Motion is what the reference footage actually reads as "alive". It is also
  // the first thing to cost frames on a cheap phone, so it is a toggle and it
  // defaults to the tier's answer rather than always-on.
  let ambientOn = ambient === null ? q.ambientMotion : !!ambient;
  const cars = [];
  const carGroup = new THREE.Group();
  if (q.maxCars > 0 && roads.length) {
    const paths = carPaths(proj, roads, q.maxCars);
    const carGeo = new THREE.BoxGeometry(1.8, 1.4, 4.2);
    const colours = [0xd94f4f, 0x3f6fd8, 0xe8e4dc, 0x2f2f33, 0xdcb63f];
    paths.forEach((seg, i) => {
      const mesh = new THREE.Mesh(carGeo, new THREE.MeshLambertMaterial({ color: colours[i % colours.length] }));
      mesh.castShadow = q.shadows;
      mesh.userData = { kind: "car" };
      carGroup.add(mesh);
      cars.push({ mesh, seg, t: Math.random(), speed: (8 + Math.random() * 6) / seg.len });
    });
    scene.add(carGroup);
  }

  const clouds = [];
  if (q.clouds) {
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false,
    });
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(220 + Math.random() * 260, 90 + Math.random() * 70), cloudMat);
      m.rotation.x = Math.PI / 2;
      m.position.set((Math.random() - 0.5) * q.drawDistance * 1.6, 320 + Math.random() * 160,
                     (Math.random() - 0.5) * q.drawDistance * 1.6);
      scene.add(m);
      clouds.push({ m, vx: 2.5 + Math.random() * 3 });
    }
  }
  carGroup.visible = ambientOn;
  clouds.forEach(c => { c.m.visible = true; });

  // --- camera aim ----------------------------------------------------------
  let yaw = 0, pitch = 0;
  const forward = new THREE.Vector3();
  function aim() {
    // Clamping pitch is the metres-scale equivalent of OrbitControls'
    // maxPolarAngle: you can look at the sky and at your feet, never through
    // the pavement into the underside of the world.
    pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));
    forward.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(camera.position.clone().add(forward));
  }
  aim();

  // --- loop ----------------------------------------------------------------
  let raf = 0, disposed = false, last = performance.now();
  function frame(now) {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (ambientOn) {
      for (const c of cars) {
        c.t += c.speed * dt;
        if (c.t > 1) c.t -= 1;
        const { a, b } = c.seg;
        c.mesh.position.set(a.x + (b.x - a.x) * c.t, 0.75, a.z + (b.z - a.z) * c.t);
        c.mesh.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      }
      for (const c of clouds) {
        c.m.position.x += c.vx * dt;
        if (c.m.position.x > q.drawDistance * 0.9) c.m.position.x = -q.drawDistance * 0.9;
      }
    }
    // The sun follows the camera so the shadow frustum always covers what is
    // on screen; a fixed sun shadows the origin and nothing else once you walk.
    sun.position.set(camera.position.x + q.drawDistance * 0.35, q.drawDistance * 0.5,
                     camera.position.z - q.drawDistance * 0.25);
    sun.target.position.set(camera.position.x, 0, camera.position.z);
    sun.target.updateMatrixWorld();
    sky.position.set(camera.position.x, 0, camera.position.z);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  // --- handle --------------------------------------------------------------
  const handle = {
    canvas, scene, camera, renderer, projection: proj,

    look(dYaw, dPitch) { yaw += dYaw; pitch += dPitch; aim(); },
    setHeading(y) { yaw = y; aim(); },

    /** Walk `metres` along the current heading (pitch ignored — your feet do
     *  not care where you are looking). Eye height is a constant, always. */
    walk(metres) {
      camera.position.x += Math.sin(yaw) * metres;
      camera.position.z += -Math.cos(yaw) * metres;
      camera.position.y = EYE_HEIGHT_M;
      aim();
    },

    setAmbient(on) {
      ambientOn = !!on;
      carGroup.visible = ambientOn;
      clouds.forEach(c => { c.m.visible = ambientOn; });
    },
    ambientOn: () => ambientOn,

    resize() {
      const w = container.clientWidth || 1, h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },

    /** Where you are standing, in real coordinates — for reloading the
     *  working set and for anchoring art. */
    geo() {
      const g = proj.toGeo(camera.position.x, camera.position.z);
      return { ...g, heading: yaw };
    },

    /** Everything verify:streetscene asserts on. Exposed deliberately: a gate
     *  that has to infer camera height from pixels cannot fail honestly. */
    state() {
      let nearest = Infinity, tallest = 0;
      for (const m of buildingMeshes) {
        m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox;
        const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
        nearest = Math.min(nearest, Math.hypot(cx - camera.position.x, cz - camera.position.z));
        tallest = Math.max(tallest, bb.max.y);
      }
      return {
        eyeHeightM: camera.position.y,
        buildingCount: buildingMeshes.length,
        nearestBuildingM: nearest,
        tallestBuildingM: tallest,
        drawDistance: q.drawDistance,
        tier: q.tier,
        shadows: !!q.shadows,
        ambientOn,
        carCount: cars.length,
        cloudCount: clouds.length,
        pitch,
        maxPitch: MAX_PITCH,
        roadsBuilt: !!roadMesh,
        wayIds: buildingMeshes.slice(0, 5).map(m => m.userData.wayId),
      };
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
      renderer.dispose();
      canvas.remove();
      try { if (globalThis.__lokStreetScene === handle) globalThis.__lokStreetScene = null; } catch {}
    },
  };
  // The verification gate reads real numbers off this — camera height in
  // metres, how far the nearest building is, whether pitch is clamped — rather
  // than trying to infer them from pixels. A gate that has to guess at its
  // subject passes vacuously, which is exactly how the 3,440 m eye height
  // survived every previous check. Disposed handles clear it.
  try { globalThis.__lokStreetScene = handle; } catch { /* non-browser host */ }
  return handle;
}

export const STREET_CONSTANTS = { EYE_HEIGHT_M, M_PER_STOREY, MAX_PITCH, M_PER_DEG_LAT };
