import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowRight, CheckIcon, ShieldIcon } from '../../utils/icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(email, password);
      if (userData && userData.role) {
        // An account still on the provisioning password cannot use the app
        // yet, so go to the change form instead of a dashboard that would
        // answer every request with 403.
        if (userData.must_change_password) {
          navigate('/change-password', { replace: true });
        } else {
          navigate(`/${userData.role}/dashboard`);
        }
      } else {
        setError('Invalid user data received');
      }
    } catch (err) {
      const message = err?.message || 'Invalid email or password';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const highlights = [
    { label: 'Attendance & Results', desc: 'Real-time tracking' },
    { label: 'Fees & Payments', desc: 'Pay online instantly' },
    { label: 'Timetable & Notices', desc: 'Always up to date' },
  ];

  return (
    <div className="min-h-screen flex bg-base">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-accent-dim via-surface to-base">
        <div className="absolute inset-0 bg-noise opacity-50" />
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-accent/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 -right-20 w-60 h-60 bg-info/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="relative p-12 flex flex-col justify-center z-10">
          <div className="max-w-lg">
            <div className="flex items-center gap-4 mb-10">
              <img
                src="/CVM.webp"
                alt="CVM University"
                className="w-14 h-14 rounded-2xl object-contain bg-white ring-2 ring-accent/40 shadow-glow animate-float"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="leading-tight">
                <p className="text-xl font-bold text-white">A.D. Institute of Technology</p>
                <p className="text-sm text-muted">Affiliated to CVM University, Anand</p>
              </div>
              <img
                src="/adit.webp"
                alt="ADIT"
                className="w-14 h-14 rounded-2xl object-contain bg-white ring-2 ring-accent/40 shadow-glow animate-float-slow"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              One Platform for the<br />
              <span className="gradient-text text-gradient-animate">ADIT Campus</span>
            </h2>
            <p className="text-muted text-lg mb-10 leading-relaxed">
              A centralized digital platform for managing all college operations
              including attendance, assignments, fees, examinations, and more.
            </p>
            <div className="space-y-3">
              {highlights.map(h => (
                <div key={h.label} className="flex items-center gap-3 bg-surface-raised/60 backdrop-blur-sm rounded-xl border border-surface-border px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-success/10 border border-success/20 flex items-center justify-center flex-shrink-0">
                    <CheckIcon size={13} className="text-success" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-muted-light">{h.label}</p>
                    <p className="text-xs text-muted">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-30" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile header with both logos */}
          <div className="flex items-center justify-between mb-10">
            <div className="lg:hidden flex items-center gap-3">
              <img
                src="/CVM.webp"
                alt="CVM University"
                className="w-9 h-9 rounded-xl object-contain bg-white ring-1 ring-accent/30"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <img
                src="/adit.webp"
                alt="ADIT"
                className="w-9 h-9 rounded-xl object-contain bg-white ring-1 ring-accent/30"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span className="text-xl font-bold text-white">ADIT CMS</span>
            </div>
          </div>

          {/* Gradient border card */}
          <div className="relative p-[1.5px] rounded-3xl overflow-hidden shadow-glow-lg">
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#6366f1,#06b6d4,#f59e0b,#6366f1)] opacity-40 animate-spin-slow" />
            <div className="relative rounded-3xl bg-surface-raised p-8 sm:p-10">
              <div className="mb-8">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-[11px] font-semibold uppercase tracking-widest mb-4">
                  <ShieldIcon size={12} /> Secure Portal
                </span>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
                <p className="text-muted">Sign in to access your dashboard</p>
              </div>

              {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 animate-slide-down">
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

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dark">
                      <LockIcon size={18} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-11 pr-11"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-dark hover:text-muted transition-colors"
                    >
                      {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-surface-border bg-surface-overlay text-accent focus:ring-accent/40"
                    />
                    <span className="text-muted">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-accent-light hover:text-accent transition-colors font-medium">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent text-white py-3 rounded-xl font-semibold text-sm
                    hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200 shadow-sm hover:shadow-glow-sm animate-pulse-glow
                    flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-muted text-sm mt-8">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-accent-light hover:text-accent font-medium transition-colors">
                  Contact admin
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
