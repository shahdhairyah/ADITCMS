import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { BookOpen, DownloadIcon, CheckIcon, ChevronDown } from '../../utils/icons';
import { syllabusAPI } from '../../services/api';

const STORAGE_KEY = 'syllabus_progress';

export default function StudentSyllabus() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [syllabus, setSyllabus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [studiedUnits, setStudiedUnits] = useState({});

  useEffect(() => {
    fetchSyllabus();
    loadProgress();
  }, []);

  useEffect(() => {
    if (syllabus?.id) saveProgress();
  }, [studiedUnits]);

  const loadProgress = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const userData = parsed[user?.profile?.id] || {};
        setStudiedUnits(userData);
      }
    } catch {
      // ignore
    }
  };

  const saveProgress = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const allData = stored ? JSON.parse(stored) : {};
      allData[user?.profile?.id] = { ...studiedUnits };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    } catch {
      // ignore
    }
  };

  const fetchSyllabus = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await syllabusAPI.getAll();
      if (res.success) {
        const data = res.data || [];
        // Group syllabus entries by subject
        const subjectMap = {};
        data.forEach(entry => {
          const key = entry.subject_id;
          if (!subjectMap[key]) {
            subjectMap[key] = {
              subject_id: entry.subject_id,
              subject_name: entry.subject_name,
              subject_code: entry.subject_code,
              units: [],
              id: entry.subject_id,
            };
          }
          subjectMap[key].units.push({
            id: entry.id,
            unit_number: entry.unit_number,
            title: entry.unit_title,
            topics: (() => {
              try {
                if (!entry.topics) return [];
                if (Array.isArray(entry.topics)) return entry.topics;
                return JSON.parse(entry.topics);
              } catch { return []; }
            })(),
            status: entry.status || 'not_started',
            file_path: entry.file_path,
          });
        });
        const grouped = Object.values(subjectMap);
        setSubjects(grouped);
        if (grouped.length > 0) {
          setSelectedSubject(grouped[0].subject_name);
          setSyllabus(grouped[0]);
        }
      } else {
        setError(res.message || 'Failed to load syllabus');
      }
    } catch (err) {
      setError(err.message || 'Failed to load syllabus');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectName) => {
    setSelectedSubject(subjectName);
    const sub = subjects.find((s) => (s.subject_name || s.subject) === subjectName);
    setSyllabus(sub || null);
    setExpanded({});
  };

  const toggleUnit = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleStudied = (unitId, e) => {
    e.stopPropagation();
    setStudiedUnits((prev) => ({
      ...prev,
      [`${syllabus?.id}_${unitId}`]: !prev[`${syllabus?.id}_${unitId}`],
    }));
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading syllabus..." />;

  const units = syllabus?.units || [];
  const completedUnits = units.filter((u) => u.status === 'completed' || u.completed || studiedUnits[`${syllabus?.id}_${u.id}`]).length;
  const totalUnits = units.length;
  const progress = totalUnits ? Math.round((completedUnits / totalUnits) * 100) : 0;

  const pdfUrl = syllabus?.file_path || syllabus?.file_url;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Syllabus"
        subtitle="View course syllabus and track progress"
        action={
          pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center gap-1.5 px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted-light hover:bg-surface-hover transition-colors"
            >
              <DownloadIcon size={16} />
              Download Syllabus
            </a>
          ) : undefined
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {subjects.length === 0 ? (
        <EmptyState title="No Syllabus" description="No syllabus data available." />
      ) : (
        <div className="space-y-6">
          {/* Subject Selector */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen size={18} className="text-accent-light" />
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-1.5 text-sm text-muted-light focus:outline-none focus:border-accent/50 flex-1 max-w-xs"
              >
                {subjects.map((s) => {
                  const name = s.subject_name || s.subject;
                  return <option key={name} value={name}>{name}{s.code ? ` (${s.code})` : ''}</option>;
                })}
              </select>
              {totalUnits > 0 && (
                <span className="text-xs text-muted">{completedUnits}/{totalUnits} units completed</span>
              )}
            </div>

            {/* Progress Tracker */}
            {totalUnits > 0 && (
              <div className="p-5 bg-surface-overlay rounded-xl border border-surface-border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-white">Syllabus Progress</h4>
                  <span className="text-sm font-bold text-accent-light">{progress}%</span>
                </div>
                <div className="relative w-full h-3 bg-surface-raised rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-2">
                  {completedUnits} of {totalUnits} units completed
                  {completedUnits === totalUnits && totalUnits > 0 ? ' - All done!' : ''}
                </p>
              </div>
            )}

            {/* Subject-wise Progress */}
            {subjects.length > 1 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Subject-wise Progress</h4>
                {subjects.map((sub, idx) => {
                  const subUnits = sub.units || [];
                  const subCompleted = subUnits.filter(
                    (u) => u.status === 'completed' || u.completed || studiedUnits[`${sub.id}_${u.id}`]
                  ).length;
                  const subTotal = subUnits.length;
                  const subPct = subTotal ? Math.round((subCompleted / subTotal) * 100) : 0;
                  const isSelected = (sub.subject_name || sub.subject) === selectedSubject;
                  return (
                    <div key={idx} className={`flex items-center gap-3 py-1.5 ${isSelected ? 'text-accent-light' : 'text-muted-light'}`}>
                      <span className="text-xs w-4 h-4 rounded-full bg-surface-overlay flex items-center justify-center flex-shrink-0">
                        {subPct >= 100 ? <CheckIcon size={10} className="text-success" /> : subPct > 0 ? subPct : '0'}
                      </span>
                      <span className="flex-1 text-sm truncate">{sub.subject_name || sub.subject}</span>
                      <div className="w-20 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${subPct >= 100 ? 'bg-success' : subPct > 0 ? 'bg-accent' : 'bg-surface-border'}`} style={{ width: `${subPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Units */}
          <div className="card">
            <h3 className="text-base font-semibold text-white mb-5">Course Units</h3>
            {units.length > 0 ? (
              <div className="space-y-3">
                {units.map((unit) => {
                  const isCompleted = unit.status === 'completed' || unit.completed;
                  const isInProgress = unit.status === 'in_progress';
                  const isStudied = studiedUnits[`${syllabus?.id}_${unit.id}`];
                  const topics = unit.topics || [];
                  return (
                    <div key={unit.id} className="bg-surface-overlay rounded-xl border border-surface-border/50 overflow-hidden">
                      <button onClick={() => toggleUnit(unit.id)} className="w-full flex items-center justify-between p-4 text-left">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            isCompleted || isStudied ? 'bg-success/20 text-success' : isInProgress ? 'bg-warning/20 text-warning' : 'bg-surface-hover text-muted-dark'
                          }`}>
                            {isCompleted || isStudied ? <CheckIcon size={12} /> : unit.unit_number || unit.id}
                          </div>
                          <span className="text-sm font-medium text-muted-light">{unit.title}</span>
                          {isInProgress && <span className="badge-warning text-[10px]">In Progress</span>}
                        </div>
                        <ChevronDown size={16} className={`text-muted-dark transition-transform ${expanded[unit.id] ? 'rotate-180' : ''}`} />
                      </button>
                      {expanded[unit.id] && (
                        <div className="px-4 pb-4 pl-12">
                          {topics.length > 0 && (
                            <ul className="space-y-1.5 mb-3">
                              {topics.map((topic, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm text-muted">
                                  <span className="w-1 h-1 rounded-full bg-muted-dark" />
                                  {topic}
                                </li>
                              ))}
                            </ul>
                          )}
                          <button
                            onClick={(e) => toggleStudied(unit.id, e)}
                            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                              isStudied ? 'text-success' : 'text-muted hover:text-muted-light'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isStudied ? 'bg-success/20 border-success text-success' : 'border-surface-border bg-surface-hover'
                            }`}>
                              {isStudied && <CheckIcon size={10} />}
                            </div>
                            {isStudied ? 'Marked as studied' : 'Mark as studied'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-muted">No units defined for this subject.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
