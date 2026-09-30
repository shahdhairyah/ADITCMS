import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatCard from '../../components/common/StatCard';
import { MarksIcon, ResultIcon, ActivityIcon } from '../../utils/icons';
import { examAPI, facultyAPI } from '../../services/api';

const TEST_TYPES = ['Unit Test', 'Mid Semester', 'Assignment', 'Other'];
const TEST_NAMES_BY_TYPE = {
  'Unit Test': ['Unit Test 1', 'Unit Test 2', 'Unit Test 3'],
  'Mid Semester': ['Mid Semester'],
  'Assignment': ['Assignment 1', 'Assignment 2', 'Assignment 3'],
  'Other': ['Quiz', 'Practical', 'Surprise Test'],
};

export default function FacultyMarks() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('entry');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [testType, setTestType] = useState('Unit Test');
  const [testName, setTestName] = useState('Unit Test 1');
  const [maxMarks, setMaxMarks] = useState(30);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      fetchStudents();
    }
  }, [selectedSubject]);

  useEffect(() => {
    const names = TEST_NAMES_BY_TYPE[testType] || ['Unit Test 1'];
    if (!names.includes(testName)) {
      setTestName(names[0]);
    }
  }, [testType]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await facultyAPI.getSubjects();
      if (res.success) {
        const subs = res.data || [];
        setSubjects(subs);
        if (subs.length > 0) setSelectedSubject(subs[0].id || subs[0].subject_id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await examAPI.getResults({ subject_id: selectedSubject, faculty_id: user?.profile?.id });
      if (res.success) {
        setStudents(res.data?.students || []);
      } else {
        setError(res.message || 'Failed to load students');
      }
    } catch (err) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleMarksChange = (studentId, field, value) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId || s.student_id === studentId) ? { ...s, [field]: Number(value) || 0 } : s)
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      const data = {
        subject_id: selectedSubject,
        test_name: testName,
        test_type: testType,
        max_marks: maxMarks,
        faculty_id: user?.profile?.id,
        marks: students.map((s) => ({
          student_id: s.id || s.student_id,
          internal_marks: s.internal_marks || s.internal || 0,
        })),
      };
      const res = await examAPI.enterInternalMarks(data);
      if (res.success) {
        setSuccess('Marks saved successfully');
      } else {
        setError(res.message || 'Failed to save marks');
      }
    } catch (err) {
      setError(err.message || 'Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !students.length && activeTab === 'entry') return <LoadingSpinner size="lg" text="Loading marks data..." />;

  const marksList = students.map((s) => Number(s.internal_marks ?? s.internal ?? 0));
  const classAvg = marksList.length ? (marksList.reduce((a, b) => a + b, 0) / marksList.length) : 0;
  const highest = marksList.length ? Math.max(...marksList) : 0;
  const lowest = marksList.length ? Math.min(...marksList) : 0;
  const passThreshold = maxMarks * 0.4;
  const passed = marksList.filter((m) => m >= passThreshold).length;
  const failed = marksList.length - passed;

  const gradeDist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  marksList.forEach((m) => {
    const pct = maxMarks ? (m / maxMarks) * 100 : 0;
    if (pct >= 90) gradeDist.A++;
    else if (pct >= 75) gradeDist.B++;
    else if (pct >= 60) gradeDist.C++;
    else if (pct >= 40) gradeDist.D++;
    else gradeDist.F++;
  });

  const sortedStudents = [...students]
    .map((s) => ({ ...s, marks: Number(s.internal_marks ?? s.internal ?? 0) }))
    .sort((a, b) => b.marks - a.marks);

  return (
    <div className="space-y-8">
      <PageHeader title="Marks Entry" subtitle="Enter and manage assessment marks" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-xl text-sm">{success}</div>
      )}

      <div className="flex gap-2 border-b border-surface-border pb-0">
        {['entry', 'performance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-accent text-accent-light'
                : 'border-transparent text-muted hover:text-muted-light'
            }`}
          >
            {tab === 'entry' ? 'Marks Entry' : 'Performance'}
          </button>
        ))}
      </div>

      {activeTab === 'entry' && (
        <>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <MarksIcon size={16} className="text-muted" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50"
              >
                {subjects.map((sub) => {
                  const id = sub.id || sub.subject_id;
                  return <option key={id} value={id}>{sub.subject_name || sub.name || sub.subject}</option>;
                })}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">Type:</span>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50"
              >
                {TEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">Test:</span>
              <select
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50"
              >
                {(TEST_NAMES_BY_TYPE[testType] || []).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">Max Marks:</span>
              <input
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value) || 30)}
                className="w-20 bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50"
                min={1}
              />
            </div>
          </div>

          {students.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <StatCard icon={<ActivityIcon size={22} />} label="Class Average" value={classAvg.toFixed(1)} color="primary" subtext={`out of ${maxMarks}`} />
              <StatCard icon={<ResultIcon size={22} />} label="Highest" value={highest} color="success" />
              <StatCard icon={<ResultIcon size={22} />} label="Lowest" value={lowest} color="error" />
              <StatCard icon={<MarksIcon size={22} />} label="Passed / Total" value={`${passed}/${marksList.length}`} color="info" subtext={`${Math.round((passed / marksList.length) * 100)}% pass rate`} />
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Student Marks - {testName}</h3>
              {students.length > 0 && (
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Save Marks'}
                </button>
              )}
            </div>

            {students.length === 0 ? (
              <EmptyState title="No Students" description="No students found for this subject." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4">Roll No</th>
                      <th className="text-left py-3 pr-4">Name</th>
                      <th className="text-center py-3 pr-4">Marks (/{maxMarks})</th>
                      <th className="text-center py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const sid = student.id || student.student_id;
                      const marks = student.internal_marks ?? student.internal ?? 0;
                      const pct = maxMarks ? (marks / maxMarks) * 100 : 0;
                      const grade = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';
                      const isPassed = pct >= 40;
                      return (
                        <tr key={sid} className="border-b border-surface-border/50 last:border-0">
                          <td className="py-3 pr-4 text-muted">{student.roll_number || student.roll_no || '-'}</td>
                          <td className="py-3 pr-4 text-muted-light">{student.first_name ? `${student.first_name} ${student.last_name || ''}` : student.name}</td>
                          <td className="py-3 pr-4 text-center">
                            <input
                              type="number"
                              value={marks}
                              onChange={(e) => handleMarksChange(sid, 'internal_marks', e.target.value)}
                              className="w-20 text-center bg-surface-overlay border border-surface-border rounded-lg px-2 py-1.5 text-sm text-muted-light focus:outline-none focus:border-accent/50"
                              min={0}
                              max={maxMarks}
                            />
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${isPassed ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                              {grade}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {students.length === 0 ? (
            <EmptyState title="No Data" description="Select a subject with students to view performance." />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <StatCard icon={<ActivityIcon size={22} />} label="Class Average" value={classAvg.toFixed(1)} color="primary" subtext={`out of ${maxMarks}`} />
                <StatCard icon={<ResultIcon size={22} />} label="Highest" value={highest} color="success" />
                <StatCard icon={<ResultIcon size={22} />} label="Lowest" value={lowest} color="error" />
                <StatCard icon={<MarksIcon size={22} />} label="Pass / Fail" value={`${passed}/${failed}`} color={passed >= failed ? 'success' : 'error'} subtext={`${Math.round((passed / marksList.length) * 100)}% pass rate`} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-base font-semibold text-white mb-4">Pass/Fail Distribution</h3>
                  <div className="flex items-center justify-center py-4">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      <circle cx="70" cy="70" r="55" fill="none" stroke="#1e293b" strokeWidth="22" />
                      {marksList.length > 0 && (
                        <>
                          <circle
                            cx="70" cy="70" r="55" fill="none" stroke="#22c55e" strokeWidth="22"
                            strokeDasharray={`${(passed / marksList.length) * 345} ${345 - (passed / marksList.length) * 345}`}
                            strokeDashoffset="0" transform="rotate(-90 70 70)"
                          />
                          <circle
                            cx="70" cy="70" r="55" fill="none" stroke="#ef4444" strokeWidth="22"
                            strokeDasharray={`${(failed / marksList.length) * 345} ${345 - (failed / marksList.length) * 345}`}
                            strokeDashoffset={`${-(passed / marksList.length) * 345}`}
                            transform="rotate(-90 70 70)"
                          />
                        </>
                      )}
                    </svg>
                  </div>
                  <div className="flex justify-center gap-8 text-sm mt-2">
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-success" /> Pass ({passed})</span>
                    <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-danger" /> Fail ({failed})</span>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-base font-semibold text-white mb-4">Grade Distribution</h3>
                  <div className="space-y-3">
                    {[
                      { grade: 'A', label: 'A (90%+)', count: gradeDist.A, color: 'bg-success' },
                      { grade: 'B', label: 'B (75%+)', count: gradeDist.B, color: 'bg-info' },
                      { grade: 'C', label: 'C (60%+)', count: gradeDist.C, color: 'bg-warning' },
                      { grade: 'D', label: 'D (40%+)', count: gradeDist.D, color: 'bg-orange-500' },
                      { grade: 'F', label: 'F (<40%)', count: gradeDist.F, color: 'bg-danger' },
                    ].map((item) => {
                      const pct = marksList.length ? Math.round((item.count / marksList.length) * 100) : 0;
                      return (
                        <div key={item.grade}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-light">{item.label}</span>
                            <span className="text-muted">{item.count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-base font-semibold text-white mb-4">Student-wise Marks (Ranked)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                        <th className="text-left py-3 pr-4">Rank</th>
                        <th className="text-left py-3 pr-4">Roll No</th>
                        <th className="text-left py-3 pr-4">Name</th>
                        <th className="text-center py-3 pr-4">Marks</th>
                        <th className="text-center py-3">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudents.map((student, idx) => {
                        const pct = maxMarks ? (student.marks / maxMarks) * 100 : 0;
                        const grade = pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : pct >= 40 ? 'D' : 'F';
                        return (
                          <tr key={student.id || student.student_id || idx} className="border-b border-surface-border/50 last:border-0">
                            <td className="py-3 pr-4">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                idx === 0 ? 'bg-warning/20 text-warning' : idx === 1 ? 'bg-surface-hover text-muted' : idx === 2 ? 'bg-orange-500/20 text-orange-500' : 'text-muted-dark'
                              }`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-muted">{student.roll_number || student.roll_no || '-'}</td>
                            <td className="py-3 pr-4 text-muted-light">{student.first_name ? `${student.first_name} ${student.last_name || ''}` : student.name}</td>
                            <td className="py-3 pr-4 text-center text-white font-medium">{student.marks}/{maxMarks}</td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                grade === 'A' ? 'text-success bg-success/10' : grade === 'B' ? 'text-info bg-info/10' : grade === 'C' ? 'text-warning bg-warning/10' : grade === 'D' ? 'text-orange-500 bg-orange-500/10' : 'text-danger bg-danger/10'
                              }`}>{grade}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
