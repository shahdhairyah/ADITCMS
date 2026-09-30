import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { FeeIcon } from '../../utils/icons';
import { formatCurrency } from '../../utils/helpers';
import api from '../../services/api';

export default function HODFeeReport() {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hod/fee-report');
      if (res.success) setReport(res.data || []);
      else setError(res.message || 'Failed to load fee report');
    } catch (err) {
      setError(err.message || 'Failed to load fee report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading fee report..." />;

  const totalCollected = report.reduce((s, r) => s + parseFloat(r.collected_amount || 0), 0);
  const totalDue = report.reduce((s, r) => s + (parseFloat(r.total_amount || 0) - parseFloat(r.collected_amount || 0)), 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Fee Report" subtitle="Department fee collection summary." />

      {error && <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <StatCard icon={<FeeIcon size={22} />} label="Total Collected" value={formatCurrency(totalCollected)} color="success" />
        <StatCard icon={<FeeIcon size={22} />} label="Total Pending" value={formatCurrency(Math.max(0, totalDue))} color={totalDue > 0 ? 'warning' : 'success'} />
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5">Fee Collection Details</h3>
        {report.length === 0 ? (
          <EmptyState title="No Data" description="No fee data available for your department." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Fee Type</th>
                  <th className="text-center py-3 pr-4">Semester</th>
                  <th className="text-right py-3 pr-4">Total Amount</th>
                  <th className="text-right py-3 pr-4">Collected</th>
                  <th className="text-right py-3">Pending</th>
                </tr>
              </thead>
              <tbody>
                {report.map((item, idx) => {
                  const pending = parseFloat(item.total_amount || 0) - parseFloat(item.collected_amount || 0);
                  return (
                    <tr key={idx} className="border-b border-surface-border/50 last:border-0">
                      <td className="py-3.5 pr-4 text-muted-light font-medium">{item.fee_type}</td>
                      <td className="py-3.5 pr-4 text-center text-muted">Sem {item.semester}</td>
                      <td className="py-3.5 pr-4 text-right text-white font-medium">{formatCurrency(item.total_amount)}</td>
                      <td className="py-3.5 pr-4 text-right text-success font-medium">{formatCurrency(item.collected_amount)}</td>
                      <td className="py-3.5 text-right text-warning font-medium">{formatCurrency(Math.max(0, pending))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}