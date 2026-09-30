import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { MailIcon, ArrowLeft, CheckIcon, ShieldIcon } from '../../utils/icons';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authAPI.forgotPassword({ email });
      if (res.success) {
        setSent(true);
      } else {
        setError(res.message || 'Something went wrong');
      }
    } catch (err) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-30" />
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-info/10 rounded-full blur-3xl animate-pulse-slow" />

      <div className="w-full max-w-md relative z-10">
        {/* Both logos with college name */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <img
            src="/CVM.webp"
            alt="CVM University"
            className="w-11 h-11 rounded-xl object-contain bg-white ring-1 ring-accent/30 shadow-glow-sm animate-float"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="text-center leading-tight">
            <p className="text-lg font-bold text-white">A.D. Institute of Technology</p>
            <p className="text-xs text-muted">Affiliated to CVM University, Anand</p>
          </div>
          <img
            src="/adit.webp"
            alt="ADIT"
            className="w-11 h-11 rounded-xl object-contain bg-white ring-1 ring-accent/30 shadow-glow-sm animate-float-slow"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* Gradient border card */}
        <div className="relative p-[1.5px] rounded-3xl overflow-hidden shadow-glow-lg">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#6366f1,#06b6d4,#f59e0b,#6366f1)] opacity-40 animate-spin-slow" />
          <div className="relative rounded-3xl bg-surface-raised p-8">
            {sent ? (
              <div className="text-center animate-scale-in">
                <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-5">
                  <CheckIcon size={32} className="text-success" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Check Your Email</h2>
                <p className="text-muted text-sm mb-6 leading-relaxed">
                  If an account exists with <strong className="text-muted-light">{email}</strong>, we&apos;ve sent a password reset link.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-accent text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-accent-hover transition-all duration-200"
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <MailIcon size={20} className="text-accent-light" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Forgot Password?</h2>
                    <p className="text-muted text-sm">We&apos;ll send you a reset link</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-[11px] font-semibold uppercase tracking-widest mb-5">
                  <ShieldIcon size={12} /> Secure Recovery
                </span>

                {error && (
                  <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2 animate-slide-down">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="label">Email Address</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dark">
                        <MailIcon size={18} />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field pl-11"
                        placeholder="your.email@adit.edu"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent text-white py-3 rounded-xl font-semibold text-sm
                      hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50
                      transition-all duration-200 shadow-sm hover:shadow-glow-sm animate-pulse-glow"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>

                <p className="text-center text-muted text-sm mt-6">
                  Remember your password?{' '}
                  <Link to="/login" className="text-accent-light hover:text-accent font-medium transition-colors">
                    Sign In
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
