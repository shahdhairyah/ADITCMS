import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LockIcon, EyeIcon, EyeOffIcon, CheckIcon, ShieldIcon, WarningIcon } from '../../utils/icons';

/**
 * Forced password change.
 *
 * Reached by an account that still holds the provisioning password written by
 * api/setup_passwords.php. While the server-side must_change_password flag is
 * set, AuthMiddleware refuses every endpoint except /auth/change-password,
 * /auth/me, /auth/logout and /health, so this page is the only way out - which
 * is why it is deliberately reachable from the login screen and by any role.
 */
export default function ChangePasswordPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current one');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (res?.success) {
        // The server cleared must_change_password, so mirror that here and let
        // the user into the application.
        updateUser({ must_change_password: false });
        setDone(true);
        setTimeout(() => navigate('/', { replace: true }), 1500);
      } else {
        setError(res?.message || 'Failed to change password');
      }
    } catch (err) {
      setError(err?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-6 sm:p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-30" />
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-warning/10 rounded-full blur-3xl animate-pulse-slow" />

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center gap-4 mb-10">
          <img
            src="/adit.webp"
            alt="ADIT"
            className="w-11 h-11 rounded-xl object-contain bg-white ring-1 ring-accent/30"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="text-center leading-tight">
            <p className="text-lg font-bold text-white">A.D. Institute of Technology</p>
            <p className="text-xs text-muted">Change your temporary password</p>
          </div>
        </div>

        <div className="relative p-[1.5px] rounded-3xl overflow-hidden shadow-glow-lg">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#f59e0b,#6366f1,#f59e0b)] opacity-40 animate-spin-slow" />
          <div className="relative rounded-3xl bg-surface-raised p-8">
            {done ? (
              <div className="text-center animate-scale-in">
                <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-5">
                  <CheckIcon size={32} className="text-success" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Password Updated</h2>
                <p className="text-muted text-sm">Taking you to your dashboard...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
                    <WarningIcon size={20} className="text-warning" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Set a New Password</h2>
                    <p className="text-muted text-sm">Required before you can continue</p>
                  </div>
                </div>

                <div className="bg-warning/10 border border-warning/20 text-warning px-4 py-3 rounded-xl mb-5 text-sm flex items-start gap-2">
                  <ShieldIcon size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    This account is still using the temporary password issued during
                    setup. {user?.email ? <>Signed in as <strong>{user.email}</strong>.</> : null}
                  </span>
                </div>

                {error && (
                  <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2 animate-slide-down">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0" />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="label">Current Password</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dark">
                        <LockIcon size={18} />
                      </span>
                      <input
                        type={show ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="input-field pl-11 pr-11"
                        placeholder="admin123"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShow((v) => !v)}
                        aria-label={show ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-dark hover:text-muted"
                      >
                        {show ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">New Password</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dark">
                        <LockIcon size={18} />
                      </span>
                      <input
                        type={show ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input-field pl-11"
                        placeholder="Min 8 characters"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Confirm New Password</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dark">
                        <LockIcon size={18} />
                      </span>
                      <input
                        type={show ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field pl-11"
                        placeholder="Re-enter new password"
                        autoComplete="new-password"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent text-white py-3 rounded-xl font-semibold text-sm
                      hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50
                      transition-all duration-200 shadow-sm hover:shadow-glow-sm"
                  >
                    {loading ? 'Saving...' : 'Change Password'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
