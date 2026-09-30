import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { NoticeIcon, SearchIcon, XIcon, CalendarIcon, ChevronRight } from '../../utils/icons';
import { formatDate } from '../../utils/helpers';
import { noticeAPI } from '../../services/api';

const typeColors = {
  Academic: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Event: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  General: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  Exam: 'bg-red-500/10 text-red-400 border-red-500/20',
  Holiday: 'bg-green-500/10 text-green-400 border-green-500/20',
};

const filterTabs = ['All', 'College', 'Department', 'Exam', 'Holiday'];
const PAGE_SIZE = 10;

export default function StudentNotices() {
  const [filterType, setFilterType] = useState('All');
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await noticeAPI.getStudent().catch(() => ({ success: true, data: [] }));
      if (res && res.success !== false) {
        setNotices(res.data || res || []);
      } else {
        setNotices([]);
      }
    } catch (err) {
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = notices.filter((n) => {
    const typeMatch = filterType === 'All' || (n.type && n.type.toLowerCase() === filterType.toLowerCase());
    const searchMatch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase());
    return typeMatch && searchMatch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filterType, search]);

  if (loading) return <LoadingSpinner size="lg" text="Loading notices..." />;

  return (
    <div className="space-y-8">
      <PageHeader title="Notices" subtitle="College and department announcements" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-1 bg-surface-overlay rounded-lg p-1 border border-surface-border/50">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterType === tab
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-muted hover:text-muted-light'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dark" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title..."
              className="w-full bg-surface-overlay border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50 placeholder:text-muted-dark"
            />
          </div>
        </div>

        {paginated.length === 0 ? (
          <EmptyState title="No Notices" description="No notices found matching your criteria." />
        ) : (
          <div className="space-y-3">
            {paginated.map((notice) => (
              <div
                key={notice.id}
                onClick={() => setSelected(notice)}
                className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <NoticeIcon size={16} className="text-accent-light flex-shrink-0" />
                    <p className="font-medium text-sm text-muted-light truncate">{notice.title}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ml-2 ${typeColors[notice.type] || typeColors.General}`}>
                    {notice.type}
                  </span>
                </div>
                <p className="text-xs text-muted line-clamp-2">{notice.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-dark">
                  <span className="flex items-center gap-1">
                    <CalendarIcon size={12} />
                    {formatDate(notice.published_at || notice.date || notice.created_at)}
                  </span>
                  {notice.department_name && <span>{notice.department_name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-surface-border">
            <p className="text-xs text-muted">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-surface-overlay border border-surface-border rounded-lg text-xs text-muted-light hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={12} className="rotate-180" />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 bg-surface-overlay border border-surface-border rounded-lg text-xs text-muted-light hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-surface-raised rounded-xl border border-surface-border shadow-xl max-w-lg w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${typeColors[selected.type] || typeColors.General}`}>
                        {selected.type}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white leading-snug">{selected.title}</h3>
                    {selected.author && (
                      <p className="text-xs text-muted mt-1">Posted by {selected.author}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-8 h-8 rounded-lg bg-surface-overlay flex items-center justify-center text-muted-dark hover:text-muted-light hover:bg-surface-hover transition-colors flex-shrink-0 ml-3"
                  >
                    <XIcon size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-dark mb-4 pb-4 border-b border-surface-border">
                  <CalendarIcon size={12} />
                  {formatDate(selected.published_at || selected.date || selected.created_at)}
                  {selected.department_name && <span className="ml-2 text-muted">| {selected.department_name}</span>}
                </div>

                <div className="text-sm text-muted-light leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {selected.content}
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
