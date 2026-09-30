import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { FeeIcon, DownloadIcon, PlusIcon, EditIcon, TrashIcon, LoaderIcon } from '../../utils/icons';
import { formatDate, formatCurrency, getStatusColor } from '../../utils/helpers';
import { feeAPI, courseAPI } from '../../services/api';

export default function AdminFees() {
  const [activeTab, setActiveTab] = useState('structures');
  const [structures, setStructures] = useState([]);
  const [payments, setPayments] = useState([]);
  const [report, setReport] = useState({ summary: {}, details: [] });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    course_id: '', semester: '', fee_type: '', amount: '', due_date: ''
  });
  const [saving, setSaving] = useState(false);
  const filtersPerPage = 10;

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'structures') loadStructures();
    else if (activeTab === 'payments') loadPayments();
    else if (activeTab === 'reports') loadReport();
  }, [activeTab, page]);

  const loadDepartments = async () => {
    try {
      const res = await courseAPI.getAll();
      if (res.success) setDepartments(res.data || []);
    } catch (err) {
      // Filter data only - a failure here must not break the fee table.
      console.error('AdminFees: could not load courses', err);
    }
  };

  const loadStructures = async () => {
    try {
      setLoading(true);
      const res = await feeAPI.getAllStructures();
      if (res.success) setStructures(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load structures');
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await feeAPI.getAllPayments({ page, page_size: filtersPerPage });
      if (res.success) {
        setPayments(res.data?.data || []);
        setTotal(res.data?.total || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await feeAPI.getFeeReport();
      if (res.success) {
        setReport(res.data || { summary: {}, details: [] });
      }
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        semester: parseInt(formData.semester),
        course_id: parseInt(formData.course_id),
      };

      let res;
      if (editing) {
        res = await feeAPI.updateStructure(editing, payload);
      } else {
        res = await feeAPI.createStructure(payload);
      }

      if (res.success) {
        setShowForm(false);
        setEditing(null);
        setFormData({ course_id: '', semester: '', fee_type: '', amount: '', due_date: '' });
        loadStructures();
      } else {
        setError(res.message || 'Failed to save');
      }
    } catch (err) {
      setError(err.message || 'Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      course_id: item.course_id?.toString() || '',
      semester: item.semester?.toString() || '',
      fee_type: item.fee_type || '',
      amount: item.amount?.toString() || '',
      due_date: item.due_date || '',
    });
    setEditing(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this fee structure?')) return;
    try {
      const res = await feeAPI.deleteStructure(id);
      if (res.success) {
        loadStructures();
      } else {
        setError(res.message || 'Failed to delete');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const tabs = [
    { id: 'structures', label: 'Fee Structures' },
    { id: 'payments', label: 'Payment History' },
    { id: 'reports', label: 'Fee Reports' },
  ];

  const totalPages = Math.ceil(total / filtersPerPage);

  return (
    <div className="space-y-8">
      <PageHeader title="Fee Management" subtitle="Configure fee structures, view payments, and generate reports." />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="flex gap-2 border-b border-surface-border pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-accent/20 text-accent-light border border-accent/30'
                : 'text-muted hover:text-muted-light hover:bg-surface-overlay'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'structures' && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white">Fee Structures</h3>
            <button
              onClick={() => { setShowForm(true); setEditing(null); setFormData({ course_id: '', semester: '', fee_type: '', amount: '', due_date: '' }); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              <PlusIcon size={16} /> Add Structure
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSave} className="mb-6 p-5 bg-surface-overlay rounded-xl border border-surface-border">
              <h4 className="text-sm font-semibold text-white mb-4">{editing ? 'Edit' : 'Add'} Fee Structure</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-muted mb-1">Course</label>
                  <select
                    value={formData.course_id}
                    onChange={e => setFormData({...formData, course_id: e.target.value})}
                    className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                    required
                  >
                    <option value="">Select course</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name || d.code || `Course #${d.id}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={e => setFormData({...formData, semester: e.target.value})}
                    className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                    required
                  >
                    <option value="">Select</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Fee Type</label>
                  <input
                    type="text"
                    value={formData.fee_type}
                    onChange={e => setFormData({...formData, fee_type: e.target.value})}
                    placeholder="e.g. Tuition Fee"
                    className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={e => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? <LoaderIcon size={16} className="animate-spin" /> : editing ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditing(null); }}
                  className="px-4 py-2 bg-surface-hover text-muted rounded-lg text-sm font-medium hover:text-muted-light transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <LoadingSpinner size="md" text="Loading structures..." />
          ) : structures.length === 0 ? (
            <EmptyState title="No Fee Structures" description="Create fee structures for courses." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                    <th className="text-left py-3 pr-4">Fee Type</th>
                    <th className="text-left py-3 pr-4">Course</th>
                    <th className="text-center py-3 pr-4">Semester</th>
                    <th className="text-right py-3 pr-4">Amount</th>
                    <th className="text-center py-3 pr-4">Due Date</th>
                    <th className="text-center py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {structures.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-surface-border/50 last:border-0">
                      <td className="py-3.5 pr-4 text-muted-light font-medium">{item.fee_type}</td>
                      <td className="py-3.5 pr-4 text-muted">{item.course_name || '-'}</td>
                      <td className="py-3.5 pr-4 text-center text-muted">Sem {item.semester}</td>
                      <td className="py-3.5 pr-4 text-right text-white font-medium">{formatCurrency(item.amount)}</td>
                      <td className="py-3.5 pr-4 text-center text-muted">{item.due_date ? formatDate(item.due_date) : '-'}</td>
                      <td className="py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(item)} className="p-1.5 text-muted hover:text-accent-light transition-colors">
                            <EditIcon size={15} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-muted hover:text-danger transition-colors">
                            <TrashIcon size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white">All Payments</h3>
            <span className="text-xs text-muted">{total} total payment(s)</span>
          </div>

          {loading ? (
            <LoadingSpinner size="md" text="Loading payments..." />
          ) : payments.length === 0 ? (
            <EmptyState title="No Payments" description="No payments have been made yet." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4">Receipt</th>
                      <th className="text-left py-3 pr-4">Student</th>
                      <th className="text-left py-3 pr-4">Department</th>
                      <th className="text-left py-3 pr-4">Fee Type</th>
                      <th className="text-right py-3 pr-4">Amount</th>
                      <th className="text-center py-3 pr-4">Date</th>
                      <th className="text-center py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((pay, idx) => (
                      <tr key={pay.id || idx} className="border-b border-surface-border/50 last:border-0">
                        <td className="py-3.5 pr-4">
                          <span className="text-muted-light">#{pay.receipt_no || pay.id || '-'}</span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="text-muted-light">{pay.first_name} {pay.last_name}</span>
                          <span className="text-xs text-muted block">{pay.roll_number}</span>
                        </td>
                        <td className="py-3.5 pr-4 text-muted">{pay.department_name || '-'}</td>
                        <td className="py-3.5 pr-4 text-muted-light">{pay.fee_type || '-'}</td>
                        <td className="py-3.5 pr-4 text-right text-white font-medium">{formatCurrency(pay.amount)}</td>
                        <td className="py-3.5 pr-4 text-center text-muted">{formatDate(pay.paid_at || pay.created_at)}</td>
                        <td className="py-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(pay.status)}`}>
                            {(pay.status || 'completed').charAt(0).toUpperCase() + (pay.status || 'completed').slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted hover:text-muted-light disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted hover:text-muted-light disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard icon={<FeeIcon size={22} />} label="Total Collected" value={formatCurrency(report.summary?.total_collected || 0)} color="success" />
            <StatCard icon={<FeeIcon size={22} />} label="Total Transactions" value={report.summary?.total_transactions || 0} color="primary" />
            <StatCard icon={<FeeIcon size={22} />} label="Students Paid" value={report.summary?.total_students_paid || 0} color="info" />
          </div>

          <div className="card">
            <h3 className="text-base font-semibold text-white mb-5">Collection by Fee Type</h3>
            {loading ? (
              <LoadingSpinner size="md" text="Loading report..." />
            ) : report.details.length === 0 ? (
              <EmptyState title="No Data" description="No fee collection data available." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4">Fee Type</th>
                      <th className="text-center py-3 pr-4">Semester</th>
                      <th className="text-right py-3 pr-4">Total Collected</th>
                      <th className="text-right py-3 pr-4">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.details.map((item, idx) => (
                      <tr key={idx} className="border-b border-surface-border/50 last:border-0">
                        <td className="py-3.5 pr-4 text-muted-light font-medium">{item.fee_type}</td>
                        <td className="py-3.5 pr-4 text-center text-muted">Sem {item.semester}</td>
                        <td className="py-3.5 pr-4 text-right text-white font-medium">{formatCurrency(item.total_collected)}</td>
                        <td className="py-3.5 pr-4 text-right text-muted">{item.total_transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}