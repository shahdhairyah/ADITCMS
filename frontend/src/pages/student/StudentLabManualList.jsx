import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatCard from '../../components/common/StatCard';
import { BookOpen, EyeIcon, CheckIcon, ClockIcon, SearchIcon } from '../../utils/icons';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { labManualAPI } from '../../services/api';

export default function StudentLabManualList() {
  const navigate = useNavigate();
  const [manuals, setManuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSubject, setActiveSubject] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchManuals();
  }, []);

  const fetchManuals = async () => {
    try {
      setLoading(true);
      setError('');
      const [manualsRes, subsRes] = await Promise.allSettled([
        labManualAPI.getAll().catch(() => ({ success: false, data: [] })),
        labManualAPI.getStudentSubmissions().catch(() => ({ success: false, data: [] })),
      ]);

      const allManuals = manualsRes.status === 'fulfilled' ? (manualsRes.value.data || []) : [];
      const mySubmissions = subsRes.status === 'fulfilled' ? (subsRes.value.data || []) : [];

      const subMap = {};
      mySubmissions.forEach(s => { subMap[s.lab_manual_id] = s; });

      const enriched = allManuals.map(m => ({
        ...m,
        submission: subMap[m.id] || null,
      }));

      setManuals(enriched);
    } catch (err) {
      setError(err.message || 'Failed to load lab manuals');
    } finally {
      setLoading(false);
    }
  };

  const subjects = ['all', ...new Set(manuals.map((m) => m.subject_name || m.subject))];

  const filtered = manuals.filter((m) => {
    const subjectMatch = activeSubject === 'all' || (m.subject_name || m.subject) === activeSubject;
    const searchMatch = m.title?.toLowerCase().includes(search.toLowerCase());
    return subjectMatch && searchMatch;
  });

  const submitted = manuals.filter((m) => m.submission).length;
  const reviewed = manuals.filter((m) => m.submission?.status === 'reviewed' || m.submission?.status === 'graded').length;

  if (loading) return <LoadingSpinner size="lg" text="Loading lab manuals..." />;

  return (
    <div className="space-y-8">
      <PageHeader title="Lab Manuals" subtitle="View and submit your lab manual experiments" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard icon={<BookOpen size={22} />} label="Total Lab Manuals" value={manuals.length} color="primary" />
        <StatCard icon={<CheckIcon size={22} />} label="Submitted" value={submitted} color="success" />
        <StatCard icon={<ClockIcon size={22} />} label="Reviewed" value={reviewed} color="info" />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => setActiveSubject(subject)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeSubject === subject
                    ? 'bg-accent text-white'
                    : 'bg-surface-overlay text-muted hover:text-muted-light border border-surface-border/50'
                }`}
              >
                {subject === 'all' ? 'All Subjects' : subject}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-56">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dark" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search manuals..."
              className="w-full bg-surface-overlay border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50 placeholder:text-muted-dark"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={28} />}
            title="No Lab Manuals"
            description="No lab manuals found matching your criteria."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((manual) => {
              const sub = manual.submission;
              const status = sub?.status || 'pending';
              return (
                <div
                  key={manual.id}
                  className="p-5 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={18} className="text-accent-light" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-muted-light truncate">{manual.title}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent-light border border-accent/20">
                        {manual.subject_name || manual.subject}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted line-clamp-2 mb-3">
                    {manual.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-dark mb-3">
                    <span>Due: {formatDate(manual.due_date || manual.deadline)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(status)}`}>
                      {status === 'pending' ? 'Not Submitted' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>

                  {sub?.marks !== null && sub?.marks !== undefined && (
                    <p className="text-xs text-muted mb-3">Marks: <span className="text-white font-medium">{sub.marks}/{manual.max_marks || 100}</span></p>
                  )}

                  <button
                    onClick={() => navigate(`/student/lab-manuals/${manual.id}`)}
                    className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-accent/10 text-accent-light rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors"
                  >
                    <EyeIcon size={14} />
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
