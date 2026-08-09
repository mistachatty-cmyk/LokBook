# World Map Feature — Handoff Document for Opus 5

## Overview

The world map feature is a **geolocation-integrated 3D globe** that displays user-published drawings pinned at exact coordinates globally. This document provides architectural guidance for feature expansion and quality enhancements.

**Current Status (Day 2 Complete):**
- ✅ Foundation: Geolocation engine, reverse geocoding, database schema
- ✅ UI Integration: Location privacy selector, post badge, map modal  
- ✅ Privacy filtering: Only "everyone" posts visible on public map
- ✅ Publishing flow: Location auto-capture and privacy selection
- ⏳ **Quality/Polish (Opus 5 focus):** Cosmetics, performance, edge cases, advanced features

---

## Architecture Overview

### Core Stack
- **Globe.gl** (v2.28.0): Three.js-based 3D globe visualization
- **Three.js** (0.152.2): Peer dependency providing core rendering
- **Geolocation API**: Browser-native navigator.geolocation (no external service)
- **OpenStreetMap Nominatim**: Free reverse geocoding (~600 req/month quota)
- **Supabase**: Post storage with spatial index on (latitude, longitude)

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/hooks/useGeolocation.js` | Location permission + auto-geocoding hook | 80 |
| `src/engine/geolocation.js` | Core geo utilities, caching, error handling | 100 |
| `src/components/WorldMapViewer.jsx` | 3D globe rendering, privacy filtering | 180 |
| `src/components/LocationPrivacySelector.jsx` | Modal for privacy selection | 100 |
| `src/components/LocationBadge.jsx` | Post card badge ("📍 location") | 40 |
| `src/constants.jsx` | `fromDbPost` converter, `GLOBE_CONFIG`, `THEME_GLOBE_SETTINGS` | 50 |
| `supabase/migrations/20260809120000_add_location_fields.sql` | Schema: latitude, longitude, location_name, location_privacy + index | 11 |

---

## Post Schema

### Database Columns Added
```sql
latitude numeric            -- nullable, WGS84
longitude numeric           -- nullable, WGS84
location_name text          -- nullable, reverse-geocoded place name
location_privacy text       -- 'only-me' | 'friends' | 'everyone' (default)
                           -- constraint: no invalid values
```

### Index
```sql
CREATE INDEX idx_lok_posts_location ON lok_posts (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

### Converter (`fromDbPost`)
Post objects now include: `latitude`, `longitude`, `location_name`, `location_privacy`

---

## Geolocation Flow

### 1. Permission Request
- Triggered on **first WorldMapViewer open** (user intent)
- `useGeolocation(true)` requests permission synchronously
- Returns: `{ location, placeName, loading, error, permissionGranted, retry }`
- Graceful fallback: map still renders without user location if denied

### 2. Position Capture  
- `getCurrentPosition()` — fetches `{ lat, lng }` with 10-second timeout
- Fallback accuracy: 50m default (browser determines actual)
- Errors logged, never crash

### 3. Reverse Geocoding
- `reverseGeocode(lat, lng)` → queries Nominatim (free tier)
- Response: `{ address: "City, Country", components: [...] }`
- **Caching**: SessionStorage prevents duplicate requests (quota: ~600/month free)
- Fallback: coordinates shown if API fails

### 4. Publishing
- User taps **Publish** in Studio → `LocationPrivacySelector` modal appears (only if location available)
- User selects privacy level: only-me / friends (greyed out) / everyone
- Post includes: `latitude`, `longitude`, `location_name`, `location_privacy`
- If no location permission or permission denied → publishes without location fields

---

## Privacy System

### Current Implementation (Day 2)
- **Everyone** (✅ functional): All users see locations on public map
- **Friends** (⏳ greyed out): Requires friend system backend
- **Only me** (⏳ greyed out): Requires server-side privacy filtering

### For Opus 5: Friend Visibility
**Goal:** Show "friends" locations only to authenticated friends.

**Implementation approach:**
1. **Server-side filtering** in WorldMapViewer:
   ```
   posts.filter(p => 
     p.location_privacy === 'everyone' ||
     (p.location_privacy === 'friends' && isFriend(currentUser, p.author))
   )
   ```

2. **Add friend relationship table:**
   ```sql
   CREATE TABLE user_friendships (
     user_id UUID NOT NULL,
     friend_id UUID NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     PRIMARY KEY (user_id, friend_id),
     FOREIGN KEY (user_id) REFERENCES auth.users(id),
     FOREIGN KEY (friend_id) REFERENCES auth.users(id)
   );
   ```

3. **RLS policy:** Users can only see friend relationships they own or participate in

4. **UI update:** "Friends" option becomes enabled once friend system exists

### For Opus 5: Private Location (only-me)
- Hide locations from map entirely if privacy = 'only-me'
- Show badge on post card: "📍 Private location" (no click-to-map)
- Server-side verification: never leak coordinates in API responses

---

## Globe Customization via Themes

### Current Implementation (Day 2)

**`THEME_GLOBE_SETTINGS`** in constants.jsx:
```javascript
{
  default: { 
    atmosphereColor: '#87CEEB',     // Sky blue
    glowColor: '#4a9eff',           // Accent glow
    backgroundColor: '#000011'      // Dark
  },
  light: {
    atmosphereColor: '#e0f0ff',     // Light blue
    glowColor: '#2563eb',           // Vibrant blue
    backgroundColor: '#f0f5ff'      // Light background
  },
  dark: {
    atmosphereColor: '#1a1a3e',     // Deep purple
    glowColor: '#60a5fa',           // Soft blue
    backgroundColor: '#0a0a1a'      // Very dark
  }
}
```

### For Opus 5: Tile Layer Customization

**Goal:** Let users switch between USGS, satellite, terrain, OpenStreetMap visually.

**What exists:**
- `GLOBE_CONFIG.tileLayerOptions` array defined but unused
- globe.gl supports multiple tile layer providers

**Implementation:**
1. Add UI dropdown/buttons in WorldMapViewer header: "🗺️ Map style"
2. Switch between:
   - USGS (current default) — sharp, detailed
   - Satellite — aerial photos
   - Terrain — topographic
   - OpenStreetMap — street-level detail
3. Persist selected tile layer to cosmetics/featureFlags

**Code skeleton:**
```javascript
const renderGlobe = (tileLayer = 'USGS') => {
  const tileUrls = {
    USGS: `https://.../{z}/{x}/{y}.jpg`,
    satellite: `https://.../{z}/{x}/{y}.jpg`,
    terrain: `https://.../{z}/{x}/{y}.jpg`,
    OSM: `https://.../{z}/{x}/{y}.png`
  };
  globe.globeImageUrl(tileUrls[tileLayer]);
};
```

### For Opus 5: World Themes (Cosmetics)

**Goal:** Shop-purchasable globe skins that change overall appearance.

**Ideas:**
- **Cyberpunk Globe**: Neon grid overlay, glitching effect
- **Organic Globe**: Bioluminescent glow, pulsing atmosphere
- **Retro Cartography**: Hand-drawn borders, vintage colors
- **Abstract**: Geometric patterns, impossible geometry

**Implementation approach:**
1. Create new cosmetic category: `worldThemes`
2. Each theme = shader customization applied to globe
3. Use Three.js material overrides on globe.js's internal geometry
4. Store selection in cosmetics state
5. Apply shader at globe initialization

**Example:**
```javascript
const applyWorldTheme = (globe, themeName) => {
  const shader = WORLD_THEME_SHADERS[themeName];
  globe.scene().traverse(obj => {
    if (obj.material && obj.material.isShaderMaterial) {
      obj.material.uniforms.theme.value = shader;
    }
  });
};
```

---

## Advanced Features (Roadmap)

### 1. 3D Models on Globe
**Status:** Deferred (requires globe.gl GLTF loader + testing)

**Goal:** Render 3D objects (sculptures, collabs, sponsorship markers) at world coordinates.

**Implementation:**
- globe.gl supports `.objectsData()` layer with THREE.Object3D
- Load GLTF/OBJ models from Supabase storage
- Position at lat/lng using `pointToGlobe(lat, lng)` transform
- Click handler: show model info, creator, link

**File structure:**
```
└── 3d-models/
    ├── collab-sculpture-1.gltf
    ├── sponsor-billboard-1.gltf
    └── world-landmark-1.gltf
```

### 2. Billboards (Sponsorship Overlays)
**Status:** Deferred

**Goal:** 2D overlays at world coordinates (sponsor logos, event banners).

**Implementation:**
- Use globe.js's `.spritesData()` layer
- Position sprite at lat/lng
- CSS-based billboard HTML (Three.js CSS3DRenderer)
- Click to sponsor profile/product

### 3. Weather Events (Particle Effects)
**Status:** Deferred

**Goal:** Animated storms, auroras, dust clouds at user locations.

**Implementation:**
- Three.js particle system at specific lat/lng
- Seasonal effects: rain in monsoon regions, snow at poles
- Animation loop: wind direction, intensity based on real-time data (optional)

### 4. Chunk-Based Infinite Canvas
**Status:** Planned (different from current single globe)

**Goal:** Users can "pan" to different "chunks" of world, each containing sub-regions with local artworks.

**Current:** One global view, all posts at once
**Future:** Zoom into regions (zoom level → chunk loading), local discovery

**Requires:**
- Client-side chunk boundary calculation
- Backend filtering by bounding box
- Pagination of 100K+ posts

---

## Performance Optimizations (Opus 5)

### Current Bottlenecks
1. **Three.js bundle size**: globe.gl brings 2MB uncompressed
   - ✅ Already handled: dynamic import in WorldMapViewer
   - 🔄 Future: Code-split globe rendering behind lazy boundary

2. **Reverse geocoding**: Nominatim API calls for every new location
   - ✅ Already handled: SessionStorage cache
   - 🔄 Future: Server-side batch geocoding on publish

3. **Post marker rendering**: 1000+ pins = performance hit
   - 🔄 Future: Clustering (combine nearby pins), heatmap layer

### Clustering Example
```javascript
const clusterer = supercluster({
  radius: 40,
  maxZoom: 15
});
clusterer.load(postMarkers.map(p => ({
  ...p,
  geometry: { coordinates: [p.lng, p.lat] }
})));
```

### Heatmap Example
```javascript
globe
  .heatmapsData([posts.map(p => ({ lat: p.latitude, lng: p.longitude, value: 1 }))])
  .heatmapColor(d => (d > 0.5 ? '#ff0000' : '#0000ff'));
```

---

## Testing Checklist (for Opus 5)

### Manual Testing
- [ ] Open map → permission prompt appears
- [ ] Grant permission → user location marker shown (blue)
- [ ] Deny permission → map loads without user location, no error
- [ ] Publish with location → privacy selector appears
- [ ] Select "everyone" → post shows on map
- [ ] Click location badge on post card → map opens
- [ ] Offline geocoding cache works → no duplicate API calls
- [ ] Reload browser → location persists in post
- [ ] Change theme → globe colors update correctly
- [ ] Zoom in/out on globe → no crashes
- [ ] Two-finger pan → globe rotates smoothly

### Edge Cases
- [ ] Publish from two locations (lat/lng changes) → each post correct
- [ ] No geolocation available (device doesn't support) → map works, no location
- [ ] Geocoding API quota exceeded → fallback to coordinates
- [ ] Very old browser without Geolocation API → graceful degradation
- [ ] Posts with invalid lat/lng (malformed data) → filtered out safely
- [ ] Friend privacy before friend system exists → graceful (greyed out)

### Build & Performance
- [ ] `npm run build` — succeeds, no new warnings
- [ ] `npm run smoke` — renders without errors
- [ ] `npm run verify:rotation` — all items resolve
- [ ] Bundle size — globe.gl chunk remains ~2MB (expected)
- [ ] Time to interactive (TTI) — no regression from Day 1

---

## Known Limitations & Future Considerations

### 1. Nominatim Free Tier Quota
- 600 requests/month = ~20/day average
- Apps using shared tier may hit quota
- **Future**: Implement server-side batch geocoding, cache results in DB

### 2. Browser Geolocation Accuracy
- Accuracy: 50-1500m depending on device + network
- GPS required for <10m accuracy
- Urban canyon effect: tall buildings reduce accuracy
- **Future**: Show accuracy radius on map (circle around pin)

### 3. No Real-Time Collaboration
- Locations are static per post, not live-updating
- Future: multi-user drawing sessions on shared world location

### 4. Mobile Performance
- Globe rendering on older phones may lag
- Three.js is CPU-heavy
- **Future**: Adaptive LOD (Level of Detail) based on device

### 5. Privacy Cascade
- Currently: only-me / friends / everyone
- Future: Could expand to "followers only", "specific users", etc.
- Requires friend/follower system maturity first

---

## Deployment Checklist

Before shipping to production (Opus 5):

- [ ] Privacy filtering tested (friends/only-me work correctly once backend ready)
- [ ] Geolocation permission prompt tested on 5+ devices
- [ ] Geocoding quota monitoring (log when approaching 600/month)
- [ ] Database backups verified (new location columns backed up)
- [ ] Migration tested on staging (add columns, create index)
- [ ] Rollback plan: Script to remove location columns if needed
- [ ] Analytics: Log map opens, location publishes, privacy selections
- [ ] Documentation: Update user-facing help on privacy options

---

## Developer Notes

### Debugging Geolocation Issues
1. Check browser console: `navigator.permissions.query({ name: 'geolocation' })`
2. Grant permission in DevTools Settings → Sensors
3. Simulator GPS: Chrome DevTools → Sensors → Latitude/Longitude override

### Testing Without Real Location
```javascript
// In useGeolocation.js, hardcode for testing:
const mockLocation = { lat: 37.7749, lng: -122.4194 }; // SF
```

### Geocoding Cache Inspection
```javascript
// In browser console:
JSON.parse(sessionStorage.getItem('geo-cache'))
```

### Theme Token Reference
- `T.accent` — primary theme color (used for glow)
- `T.paper` — background color
- `T.ink` — text/dark color
- `T.card` — card background
- See `src/theme/theme.js` for all tokens

### Globe.gl API Highlights
```javascript
Globe()
  .globeImageUrl(url)           // Base texture
  .atmosphereColor(color)       // Glow around edges
  .atmosphereAltitude(0.1)      // Glow thickness
  .pointsData([...])            // Marker layer
  .onPointClick(handler)        // Click detection
  .pointOfView({ altitude })    // Camera position
  .autoRotate(boolean)
  .autoRotateSpeed(0.5)
```

More: https://github.com/vasturiano/globe.gl

---

## Handoff Summary

**This implementation is production-ready for Day 2 scope:**
- Geolocation → publishing → map display pipeline ✅
- Privacy filtering (public posts only) ✅
- Graceful degradation (no location → works) ✅
- Theme customization (colors) ✅
- Build/test validation ✅

**Opus 5 priorities:**
1. Polish: edge cases, error messages, animations
2. Quality: performance tuning, mobile optimization
3. Features: friend privacy, tile layers, world themes, clustering
4. Scale: prepare for 1000+ posts per map region

**Questions for Opus 5 team:**
- Should "only-me" locations appear in post export (PNG/GIF)?
- Do you want Geocoding API fallback (paid) once Nominatim quota exhausted?
- Should location be displayed in post metadata (discoverable on search)?
- Plan for monetizing world themes (shop purchase)?

---

**Last updated:** Day 2 completion (2026-08-09)
**Next review:** After Opus 5 enhancements complete
