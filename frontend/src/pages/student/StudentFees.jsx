import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { FeeIcon, DownloadIcon, CalendarIcon, LoaderIcon } from '../../utils/icons';
import { formatDate, formatCurrency, getStatusColor } from '../../utils/helpers';
import { feeAPI, downloadFile } from '../../services/api';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function StudentFees() {
  const { user } = useAuth();
  const [structure, setStructure] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pendingDues, setPendingDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchFees();
  }, []);

  const handleReceipt = async (pay) => {
    setError('');
    try {
      // The receipt endpoint is authenticated, so it has to be fetched with
      // the Authorization header rather than opened in a new tab.
      const no = pay.receipt_no || pay.id;
      await downloadFile(
        `/fees/receipt/${pay.id}/download`,
        `receipt-${no}.html`
      );
    } catch (err) {
      setError(err.message || 'Failed to download receipt');
    }
  };

  const fetchFees = async () => {
    try {
      setLoading(true);
      setError('');
      const [structRes, payRes] = await Promise.allSettled([
        feeAPI.getStructure({ student_id: user?.profile?.id }).catch(() => ({ success: false, data: [] })),
        feeAPI.getPayments(user?.profile?.id).catch(() => ({ success: false, data: {} })),
      ]);
      if (structRes.status === 'fulfilled' && structRes.value.success) setStructure(structRes.value.data || []);
      if (payRes.status === 'fulfilled' && payRes.value.success) {
        const payData = payRes.value.data;
        setPayments(payData?.payments || (Array.isArray(payData) ? payData : []));
        setPendingDues(payData?.pending_dues || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load fee data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Pay one fee line, or every outstanding due.
   *
   * `handlePay(null)` used to crash immediately on `feeItem.id`, and the
   * "pay all" branch reduced the id list to its first element while sending
   * the summed amount - so it would have charged one structure and marked it
   * paid. The backend derives the amount from the database, so the client
   * only needs to name the structure.
   */
  const handlePay = async (feeItem = null) => {
    try {
      if (!feeItem && pendingDues.length === 0) {
        setError('There are no pending dues to pay.');
        return;
      }

      setProcessing(feeItem ? feeItem.id : 'all');
      setError('');

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded) {
        setError('Failed to load payment gateway. Please try again.');
        setProcessing(null);
        return;
      }

      // A single order covers one structure, so a combined payment is
      // processed line by line rather than pretending one order covers all.
      const targets = feeItem ? [feeItem] : pendingDues;

      for (const target of targets) {
        const structureId = target.id;
        if (!structureId) {
          setError('A pending due is missing its fee reference. Please contact the accounts office.');
          setProcessing(null);
          return;
        }

        const response = await feeAPI.createOrder({
          fee_structure_id: structureId,
        });

        if (!response.success) {
          setError(response.message || 'Failed to create payment order');
          setProcessing(null);
          return;
        }

        const { order_id, amount: orderAmount, currency, key_id } = response.data;

        const options = {
          key: key_id,
          amount: orderAmount,
          currency: currency || 'INR',
          name: 'ADIT College',
          description: 'Fee Payment',
          order_id,
          prefill: {
            name: user?.profile?.first_name ? `${user.profile.first_name} ${user.profile.last_name || ''}` : '',
            email: user?.email || '',
            contact: user?.profile?.phone || '',
          },
          theme: { color: '#6366f1' },
          handler: async function (razorpayResponse) {
            try {
              const verifyRes = await feeAPI.verifyPayment({
                razorpay_order_id: razorpayResponse.razorpay_order_id,
                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                razorpay_signature: razorpayResponse.razorpay_signature,
              });
              if (verifyRes.success) {
                await fetchFees();
              } else {
                setError(verifyRes.message || 'Payment verification failed');
              }
            } catch (err) {
              setError('Payment verification failed. Please contact support.');
            } finally {
              setProcessing(null);
            }
          },
          modal: {
            ondismiss: () => setProcessing(null),
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function () {
          setError('Payment failed. Please try again.');
          setProcessing(null);
        });
        rzp.open();
        // Razorpay opens a modal, so only one line can be in flight at a time.
        return;
      }
    } catch (err) {
      setError(err.message || 'Failed to process payment');
      setProcessing(null);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading fee details..." />;

  const totalFee = structure.reduce((s, item) => s + (item.amount || 0), 0);
  const paidAmount = payments.filter((p) => p.status === 'paid' || p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0);
  const pendingAmount = totalFee - paidAmount;
  const totalPaid = payments.filter((p) => p.status === 'paid' || p.status === 'completed').length;

  return (
    <div className="space-y-8">
      <PageHeader title="Fee Management" subtitle="View fee structure and payment history" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard icon={<FeeIcon size={22} />} label="Total Fee" value={formatCurrency(totalFee)} color="primary" />
        <StatCard icon={<FeeIcon size={22} />} label="Paid" value={formatCurrency(paidAmount)} color="success" subtext={`${totalPaid} payment(s)`} />
        <StatCard icon={<FeeIcon size={22} />} label="Pending" value={formatCurrency(pendingAmount)} color={pendingAmount > 0 ? 'warning' : 'success'} />
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5">Fee Structure</h3>
        {structure.length === 0 ? (
          <EmptyState title="No Fee Structure" description="Fee structure not available yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Fee Head</th>
                  <th className="text-right py-3 pr-4">Amount</th>
                  <th className="text-center py-3">Due Date</th>
                  <th className="text-center py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {structure.map((item, idx) => {
                  const isPaid = payments.some(p =>
                    p.fee_structure_id === item.id &&
                    (p.status === 'paid' || p.status === 'completed')
                  );
                  return (
                    <tr key={idx} className="border-b border-surface-border/50 last:border-0">
                      <td className="py-3.5 pr-4 text-muted-light">{item.head || item.fee_type || item.name}</td>
                      <td className="py-3.5 pr-4 text-right text-white font-medium">{formatCurrency(item.amount)}</td>
                      <td className="py-3.5 text-center text-muted">{item.due_date ? formatDate(item.due_date) : '-'}</td>
                      <td className="py-3.5 text-center">
                        {isPaid ? (
                          <span className="text-xs text-success font-medium">Paid</span>
                        ) : (
                          <button
                            onClick={() => handlePay(item)}
                            disabled={processing !== null}
                            className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
                          >
                            {processing === (item.id || 'all') ? (
                              <LoaderIcon size={14} className="animate-spin" />
                            ) : 'Pay Now'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pendingDues.length > 1 && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white">Pending Dues</h3>
            <button
              onClick={() => handlePay(null)}
              disabled={processing !== null}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {processing === 'all' ? (
                <LoaderIcon size={16} className="animate-spin" />
              ) : (
                <FeeIcon size={16} />
              )}
              Pay All Pending
            </button>
          </div>
          <div className="space-y-2">
            {pendingDues.map((due, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 bg-surface-overlay rounded-xl border border-surface-border/50">
                <div>
                  <p className="text-sm font-medium text-muted-light">{due.fee_type}</p>
                  <p className="text-xs text-muted">{due.course_name} - Semester {due.semester}</p>
                </div>
                <span className="text-sm font-semibold text-warning">{formatCurrency(due.pending_amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Payment History</h3>
        </div>

        {payments.length === 0 ? (
          <EmptyState title="No Payments" description="No payment history available." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Receipt</th>
                  <th className="text-left py-3 pr-4">Date</th>
                  <th className="text-left py-3 pr-4">Fee Type</th>
                  <th className="text-right py-3 pr-4">Amount</th>
                  <th className="text-center py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pay, idx) => (
                  <tr key={pay.id || idx} className="border-b border-surface-border/50 last:border-0">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-light">#{pay.receipt_no || pay.id || '-'}</span>
                        {pay.id && (
                          <button
                            type="button"
                            onClick={() => handleReceipt(pay)}
                            className="text-accent-light hover:text-accent"
                            title="Download Receipt"
                          >
                            <DownloadIcon size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-muted">{formatDate(pay.paid_at || pay.created_at || pay.date)}</td>
                    <td className="py-3.5 pr-4 text-muted-light">{pay.fee_type || '-'}</td>
                    <td className="py-3.5 pr-4 text-right text-white font-medium">{formatCurrency(pay.amount)}</td>
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
        )}
      </div>
    </div>
  );
}
