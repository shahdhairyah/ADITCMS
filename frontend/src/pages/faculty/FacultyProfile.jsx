import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import { authAPI } from '../../services/api';
import { ProfileIcon, MailIcon, LockIcon, BookOpen } from '../../utils/icons';

export default function FacultyProfile() {
  const { user, updateUser } = useAuth();
  // `user?.profile || {}` created a new object identity on every render
  // while the profile was still loading, and the effect below depends on it
  // while calling setForm() - which re-renders. That is an infinite render
  // loop. useMemo keeps the reference stable.
  const profile = useMemo(() => user?.profile || {}, [user?.profile]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', qualification: '',
    specialization: '', experience_years: '', bio: '',
  });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [showPwForm, setShowPwForm] = useState(false);

  useEffect(() => {
    setForm({
      first_name: profile.first_name || '', last_name: profile.last_name || '',
      phone: profile.phone || '', qualification: profile.qualification || '',
      specialization: profile.specialization || '', experience_years: profile.experience_years || '',
      bio: profile.bio || '',
    });
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await authAPI.updateProfile(form);
      if (res.success) {
        updateUser({ profile: { ...profile, ...(res.data.profile || {}) } });
        setSuccess('Profile updated successfully');
        setEditing(false);
      } else {
        setError(res.message || 'Update failed');
      }
    } catch (err) {
      setError(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    setPwError('');
    setPwSuccess('');

    if (pwForm.new_password !== pwForm.confirm) {
      setPwError('Passwords do not match');
      setPwLoading(false);
      return;
    }

    try {
      const res = await authAPI.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      if (res.success) {
        setPwSuccess('Password changed successfully');
        setPwForm({ current_password: '', new_password: '', confirm: '' });
        setShowPwForm(false);
      } else {
        setPwError(res.message || 'Failed');
      }
    } catch (err) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const inputClass = 'w-full px-3.5 py-2.5 bg-surface-overlay border border-surface-border rounded-xl focus:ring-2 focus:ring-accent/40 focus:border-accent/50 outline-none text-sm text-muted-light placeholder-muted-dark transition-all duration-200';
  const labelClass = 'block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5';

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View and manage your faculty profile" />

      {success && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="card">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-surface-overlay border border-surface-border flex items-center justify-center mx-auto mb-4">
              <span className="text-accent-light font-bold text-2xl">
                {(profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">{profile.first_name} {profile.last_name}</h3>
            <p className="text-sm text-muted mt-0.5">{user?.email}</p>
            <span className="inline-block mt-3 badge-info capitalize text-xs">{user?.role}</span>
          </div>
          <div className="mt-6 space-y-3 text-sm pt-6 border-t border-surface-border">
            <div className="flex justify-between">
              <span className="text-muted">Employee ID</span>
              <span className="font-medium text-muted-light">{profile.employee_id || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Department</span>
              <span className="font-medium text-muted-light">{profile.department_id || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Qualification</span>
              <span className="font-medium text-muted-light">{profile.qualification || '-'}</span>
            </div>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-white">Profile Information</h3>
            {!editing && (
              <button onClick={() => setEditing(true)} className="text-accent-light hover:text-accent text-sm font-medium transition-colors">
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Qualification</label>
                  <input value={form.qualification} onChange={e => setForm({...form, qualification: e.target.value})} className={inputClass} placeholder="e.g. Ph.D." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Specialization</label>
                  <input value={form.specialization} onChange={e => setForm({...form, specialization: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Experience (years)</label>
                  <input type="number" value={form.experience_years} onChange={e => setForm({...form, experience_years: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Bio</label>
                <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} className={inputClass} rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => { setEditing(false); setForm({ first_name: profile.first_name || '', last_name: profile.last_name || '', phone: profile.phone || '', qualification: profile.qualification || '', specialization: profile.specialization || '', experience_years: profile.experience_years || '', bio: profile.bio || '' }); }} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted text-xs">First Name</span>
                  <p className="font-medium text-muted-light mt-1">{profile.first_name || '-'}</p>
                </div>
                <div>
                  <span className="text-muted text-xs">Last Name</span>
                  <p className="font-medium text-muted-light mt-1">{profile.last_name || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted text-xs">Phone</span>
                  <p className="font-medium text-muted-light mt-1">{profile.phone || '-'}</p>
                </div>
                <div>
                  <span className="text-muted text-xs">Qualification</span>
                  <p className="font-medium text-muted-light mt-1">{profile.qualification || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted text-xs">Specialization</span>
                  <p className="font-medium text-muted-light mt-1">{profile.specialization || '-'}</p>
                </div>
                <div>
                  <span className="text-muted text-xs">Experience</span>
                  <p className="font-medium text-muted-light mt-1">{profile.experience_years ? `${profile.experience_years} years` : '-'}</p>
                </div>
              </div>
              {profile.bio && (
                <div>
                  <span className="text-muted text-xs">Bio</span>
                  <p className="font-medium text-muted-light mt-1">{profile.bio}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change Password */}
      <div className="mt-6 card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <LockIcon size={18} className="text-accent-light" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Change Password</h3>
              <p className="text-xs text-muted">Update your account password</p>
            </div>
          </div>
          <button onClick={() => setShowPwForm(!showPwForm)} className={`text-sm font-medium transition-colors ${showPwForm ? 'text-muted hover:text-muted-light' : 'text-accent-light hover:text-accent'}`}>
            {showPwForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPwForm && (
          <form onSubmit={handlePasswordChange} className="mt-6 space-y-4 max-w-md border-t border-surface-border pt-6">
            {pwSuccess && <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-xl text-sm flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" />{pwSuccess}</div>}
            {pwError && <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0" />{pwError}</div>}
            <div>
              <label className={labelClass}>Current Password</label>
              <input type="password" placeholder="Enter current password" value={pwForm.current_password} onChange={e => setPwForm({...pwForm, current_password: e.target.value})} className={inputClass} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>New Password</label>
                <input type="password" placeholder="Min 8 characters" value={pwForm.new_password} onChange={e => setPwForm({...pwForm, new_password: e.target.value})} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Confirm</label>
                <input type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} className={inputClass} required />
              </div>
            </div>
            <button type="submit" disabled={pwLoading} className="btn-primary">
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
