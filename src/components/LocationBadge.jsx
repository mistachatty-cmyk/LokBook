export function LocationBadge({ locationName, latitude, longitude, onLocationClick }) {
  if (!latitude || !longitude) return null;

  return (
    <button
      onClick={onLocationClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 6,
        background: 'rgba(79, 70, 229, 0.15)',
        border: '1px solid rgba(79, 70, 229, 0.3)',
        color: '#4f46e5',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(79, 70, 229, 0.25)';
        e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.5)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(79, 70, 229, 0.15)';
        e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.3)';
      }}
    >
      📍 {locationName || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`}
    </button>
  );
}
