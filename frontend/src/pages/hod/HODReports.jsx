import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ReportIcon, DownloadIcon } from '../../utils/icons';
import api from '../../services/api';

export default function HODReports() {
  const [reportType, setReportType] = useState('summary');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/hod/reports?type=${reportType}`);
      if (res.success) setData(res.data || []);
      else setData([]);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(r => headers.map(h => `"${r[h] || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hod-${reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'performance', label: 'Performance' },
    { id: 'faculty_load', label: 'Faculty Load' },
  ];

  const columns = data.length ? Object.keys(data[0]).map(k => ({
    key: k,
    label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  })) : [];

  return (
    <div className="space-y-8">
      <PageHeader title="Department Reports" subtitle="View and export department data." />

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <ReportIcon size={16} className="text-muted flex-shrink-0" />
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setReportType(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  reportType === tab.id
                    ? 'bg-accent/15 text-accent-light border border-accent/30'
                    : 'bg-surface-overlay text-muted hover:bg-surface-hover hover:text-muted-light border border-surface-border/50'
                }`}>{tab.label}</button>
            ))}
          </div>
          {data.length > 0 && (
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors flex-shrink-0">
              <DownloadIcon size={16} /> Export CSV
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSpinner size="md" text="Loading report..." />
        ) : data.length === 0 ? (
          <EmptyState title="No Data" description={`No ${reportType} data available.`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  {columns.map(col => (
                    <th key={col.key} className="text-left py-3 pr-4">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-surface-border/50 last:border-0">
                    {columns.map(col => (
                      <td key={col.key} className="py-3.5 pr-4 text-muted-light">{row[col.key] ?? '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}