import { useState } from 'react';

export function LocationPrivacySelector({ onSelect, onClose, currentPrivacy = 'everyone' }) {
  const [selected, setSelected] = useState(currentPrivacy);

  const options = [
    { value: 'only-me', label: '🔒 Only me', desc: 'Only you can see your location' },
    { value: 'friends', label: '👥 Friends', desc: 'Friends can see (coming soon)', disabled: true },
    { value: 'everyone', label: '🌍 Everyone', desc: 'Anyone can see your location' }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: 16,
        padding: 20,
        maxWidth: 340,
        border: '2px solid #4f46e5',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 700, color: '#fff' }}>
          📍 Location Privacy
        </h3>
        <p style={{ margin: '0 0 20px 0', fontSize: 12, color: '#aaa', opacity: 0.8 }}>
          Choose who can see where you created this drawing
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '12px',
                borderRadius: 8,
                border: `2px solid ${selected === opt.value ? '#4f46e5' : 'transparent'}`,
                background: selected === opt.value ? 'rgba(79, 70, 229, 0.1)' : '#252541',
                cursor: opt.disabled ? 'not-allowed' : 'pointer',
                opacity: opt.disabled ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              <input
                type="radio"
                name="privacy"
                value={opt.value}
                checked={selected === opt.value}
                onChange={e => !opt.disabled && setSelected(e.target.value)}
                disabled={opt.disabled}
                style={{ marginTop: 2, cursor: opt.disabled ? 'not-allowed' : 'pointer', accentColor: '#4f46e5' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                  {opt.label}
                  {opt.disabled && <span style={{ marginLeft: 6, fontSize: 11, color: '#999' }}>coming soon</span>}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => onClose()}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 8,
              border: '2px solid #4f46e5',
              background: 'transparent',
              color: '#4f46e5',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSelect(selected);
              onClose();
            }}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#4f46e5',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
