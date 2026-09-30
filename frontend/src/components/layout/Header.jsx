import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRoleName } from '../../utils/helpers';
import { BellIcon, MenuIcon } from '../../utils/icons';
import { announcementAPI } from '../../services/api';

export default function Header({ onToggleSidebar }) {
  const { user, role } = useAuth();
  const profile = user?.profile;
  const [announcements, setAnnouncements] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const loadAnnouncements = useCallback(async () => {
    try {
      const res = await announcementAPI.getAll();
      const list = res?.data || [];
      setAnnouncements(list);
      setUnread(list.filter((a) => !a.is_read).length);
    } catch {
      // A failed notification poll must not break the dashboard chrome.
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const markRead = async (id) => {
    setOpen(false);
    try {
      await announcementAPI.markRead(id);
    } finally {
      loadAnnouncements();
    }
  };

  return (
    <header className="h-16 border-b border-surface-border bg-base/80 backdrop-blur-xl sticky top-0 z-20">
      <div className="h-full px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-2 text-muted hover:text-muted-light hover:bg-surface-hover rounded-lg transition-colors"
          >
            <MenuIcon size={20} />
          </button>
          <img
            src="/adit.webp"
            alt="ADIT"
            className="w-8 h-8 rounded-lg object-contain bg-white ring-1 ring-accent/30 flex-shrink-0"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <h2 className="text-sm font-semibold text-muted-light">
              {getRoleName(role)} Portal
            </h2>
            <p className="text-xs text-muted">A.D. Institute of Technology</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications - backed by GET /announcements and POST /announcements/:id/read */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Notifications"
              className="relative p-2 text-muted hover:text-muted-light hover:bg-surface-hover rounded-lg transition-colors"
            >
              <BellIcon size={18} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] leading-4 text-center shadow-sm shadow-danger/50">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-surface-border bg-surface-raised shadow-xl shadow-black/40 z-30">
                <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted border-b border-surface-border">
                  Announcements
                </p>
                {announcements.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted text-center">No announcements.</p>
                ) : (
                  announcements.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => markRead(a.id)}
                      className={`w-full text-left px-4 py-3 border-b border-surface-border/60 last:border-0 hover:bg-surface-hover transition-colors ${a.is_read ? 'opacity-60' : ''}`}
                    >
                      <p className="text-sm font-medium text-muted-light">{a.title}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{a.content}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="flex items-center gap-3 pl-2 border-l border-surface-border">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-muted-light leading-tight">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-[11px] text-muted">{user?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0 border border-accent/20">
              <span className="text-accent-light text-sm font-medium">
                {(profile?.first_name || 'U')[0]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
