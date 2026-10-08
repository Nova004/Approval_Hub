import { NavLink } from 'react-router-dom';

const navItems = [
  { icon: '📊', label: 'Dashboard', to: '/' },
  { icon: '📋', label: 'Approval Matrix', to: '/matrix' },
  { icon: '🔍', label: 'Simulator', to: '/simulator' },
];

export default function Sidebar() {
  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #4f8ef7, #7c5cfc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0, boxShadow: '0 0 16px rgba(79,142,247,0.4)'
          }}>
            ✅
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
              Approval Hub
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              Admin Panel
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 2 }}>
            AGT_SMART_SY
          </div>
          Stateless Routing Engine
        </div>
      </div>
    </div>
  );
}
