import { useEffect, useRef, useState } from 'react';
import { GLOBE_CONFIG, THEME_GLOBE_SETTINGS } from '../constants.jsx';

export default function WorldMapViewer({ posts = [], userLocation, theme = 'default', onPostClick, onClose }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [globeReady, setGlobeReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dynamically import globe.gl only in browser environment
    import('globe.gl').then(({ default: Globe }) => {
      // Get theme settings with fallback to default
      const themeSettings = THEME_GLOBE_SETTINGS[theme] || THEME_GLOBE_SETTINGS.default;

      // Initialize globe
      const globe = Globe()
        .globeImageUrl('//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg')
        .bumpImageUrl('//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png')
        .backgroundColor(themeSettings.backgroundColor)
        .atmosphereColor(themeSettings.atmosphereColor)
        .atmosphereAltitude(0.1)
        .autoRotate(GLOBE_CONFIG.autoRotate)
        .autoRotateSpeed(GLOBE_CONFIG.autoRotateSpeed);

      globeRef.current = globe;
      globe(containerRef.current);
      setGlobeReady(true);

      // Set camera position
      globe.pointOfView({ altitude: 2.5 });

      // Add user location marker if available
      if (userLocation) {
        const userMarkers = [{
          lat: userLocation.lat,
          lng: userLocation.lng,
          size: 0.8,
          color: '#4f46e5',
        }];
        globe.pointsData(userMarkers)
          .pointColor(d => d.color)
          .pointSize(d => d.size)
          .pointAltitude(0.01);
      }

      // Add post location markers (only show public locations)
      const postMarkers = posts
        .filter(post => post.latitude && post.longitude && post.location_privacy === 'everyone')
        .map((post, idx) => ({
          id: post.id,
          lat: post.latitude,
          lng: post.longitude,
          size: 0.5,
          color: '#ec4899',
          post,
        }));

      if (postMarkers.length > 0) {
        globe.pointsData(postMarkers)
          .pointColor(d => d.color)
          .pointSize(d => d.size)
          .pointAltitude(0.01)
          .onPointClick(d => {
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
    }).catch(err => console.warn('Failed to load globe.gl', err));
  }, [posts, userLocation, theme, onPostClick]);

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
        }}
      />

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
