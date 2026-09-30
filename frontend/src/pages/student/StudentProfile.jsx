import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import StudentIDCard from '../../components/common/StudentIDCard';
import { authAPI, studentAPI } from '../../services/api';
import { LockIcon, IdCardIcon, CameraIcon, CheckIcon, XIcon } from '../../utils/icons';
import { getInitials } from '../../utils/helpers';

const API_URL = import.meta.env.VITE_API_URL || 'https://adit.shahdhairyah.in/api';
function getPhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith('http')) return photo;
  return `${API_URL}/${photo}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function StudentProfile() {
  const { user, updateUser } = useAuth();
  // `user?.profile || {}` produced a NEW object on every render while the
  // profile was absent, and the effect below depends on it and calls
  // setForm() - which re-renders - so the page entered an infinite render
  // loop until the profile arrived. useMemo keeps the identity stable.
  const profile = useMemo(() => user?.profile || {}, [user?.profile]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', dob: '', gender: '', address: '', semester: '',
  });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');
  const [showPwForm, setShowPwForm] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');
  const fileInputRef = useRef(null);
  const photoUrl = getPhotoUrl(profile.photo);

  useEffect(() => {
    setForm({
      first_name: profile.first_name || '', last_name: profile.last_name || '',
      phone: profile.phone || '', dob: profile.dob || '',
      gender: profile.gender || '', address: profile.address || '',
      semester: profile.semester || '',
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setPhotoSuccess('');
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo must be less than 5MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Only JPG, PNG, and WebP images are allowed');
      return;
    }
    try {
      setPhotoUploading(true);
      const base64 = await fileToBase64(file);
      const studentId = profile.id;
      const res = await studentAPI.uploadPhoto(studentId, { photo_base64: base64 });
      if (res.success) {
        updateUser({ profile: { ...profile, photo: res.data.photo_url } });
        setPhotoSuccess('Photo updated successfully');
        setTimeout(() => setPhotoSuccess(''), 3000);
      } else {
        setPhotoError(res.message || 'Upload failed');
      }
    } catch (err) {
      setPhotoError(err.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const inputClass = 'w-full px-3.5 py-2.5 bg-surface-overlay border border-surface-border rounded-lg focus:ring-2 focus:ring-accent/40 focus:border-accent/50 outline-none text-sm text-muted-light placeholder-muted-dark transition-all duration-200';
  const labelClass = 'block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5';

  const deptDisplay = profile.department_name || profile.department || `Department ${profile.department_id || ''}`.trim() || '-';

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View and manage your profile information" />

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
            {/* Photo */}
            <div className="relative w-24 h-24 mx-auto mb-4 group">
              {photoUrl ? (
                <img src={photoUrl} alt={profile.first_name} className="w-24 h-24 rounded-full object-cover border-2 border-surface-border" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              ) : null}
              <div className={`w-24 h-24 rounded-full bg-surface-overlay border-2 border-surface-border items-center justify-center ${photoUrl ? 'hidden' : 'flex'}`}>
                <span className="text-accent-light font-bold text-3xl">
                  {getInitials(profile.first_name, profile.last_name)}
                </span>
              </div>
              {/* Hover overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-all duration-200"
              >
                {photoUploading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CameraIcon size={20} className="text-white" />
                    <span className="text-white/80 text-[10px] font-medium">Change Photo</span>
                  </>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
            </div>

            {/* Photo status */}
            {photoError && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-danger mb-2">
                <XIcon size={12} />
                {photoError}
              </div>
            )}
            {photoSuccess && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-success mb-2">
                <CheckIcon size={12} />
                {photoSuccess}
              </div>
            )}

            <h3 className="text-lg font-semibold text-white">{profile.first_name} {profile.last_name}</h3>
            <p className="text-sm text-muted mt-0.5">{user?.email}</p>
            <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-xs font-medium capitalize">{user?.role}</span>
          </div>

          <div className="mt-5 space-y-3 text-sm pt-5 border-t border-surface-border">
            <InfoRow label="Roll No." value={profile.roll_number} />
            <InfoRow label="Department" value={deptDisplay} />
            <InfoRow label="Semester" value={profile.semester ? `Sem ${profile.semester}` : null} />
            <InfoRow label="Batch" value={profile.batch} />
            {profile.phone && <InfoRow label="Phone" value={profile.phone} />}
          </div>

          <button
            onClick={() => setShowIdCard(!showIdCard)}
            className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent/10 rounded-lg text-sm font-medium text-accent-light hover:bg-accent/20 transition-colors"
          >
            <IdCardIcon size={16} />
            {showIdCard ? 'Hide ID Card' : 'View ID Card'}
          </button>
        </div>

        {/* Edit Profile */}
        <div className="card lg:col-span-2">
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
                  <input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className={inputClass} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputClass} placeholder="Enter phone number" />
                </div>
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Gender</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className={inputClass}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Semester</label>
                  <select value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} className={inputClass}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className={inputClass} rows={2} placeholder="Enter your address" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => { setEditing(false); setForm({ first_name: profile.first_name || '', last_name: profile.last_name || '', phone: profile.phone || '', dob: profile.dob || '', gender: profile.gender || '', address: profile.address || '', semester: profile.semester || '' }); }} className="px-5 py-2.5 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted-light hover:bg-surface-hover transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5 text-sm">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <ProfileField label="First Name" value={profile.first_name} />
                <ProfileField label="Last Name" value={profile.last_name} />
                <ProfileField label="Email" value={user?.email} />
                <ProfileField label="Phone" value={profile.phone} />
                <ProfileField label="Date of Birth" value={profile.dob} />
                <ProfileField label="Gender" value={profile.gender} />
                <ProfileField label="Semester" value={profile.semester ? `Semester ${profile.semester}` : null} />
                <ProfileField label="Department" value={deptDisplay} />
                <ProfileField label="Roll Number" value={profile.roll_number} />
                <ProfileField label="Batch" value={profile.batch} />
              </div>
              {profile.address && (
                <div className="pt-3 border-t border-surface-border">
                  <ProfileField label="Address" value={profile.address} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ID Card */}
      {showIdCard && (
        <div className="mt-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Student ID Card</h3>
            <button onClick={() => setShowIdCard(false)} className="text-sm text-muted hover:text-muted-light transition-colors">
              Close
            </button>
          </div>
          <StudentIDCard profile={profile} user={user} />
        </div>
      )}

      {/* Change Password */}
      <div className="card mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
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
              <button type="submit" disabled={pwLoading} className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors">
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-muted-light">{value || '-'}</span>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div>
      <span className="text-muted text-xs">{label}</span>
      <p className="font-medium text-muted-light mt-0.5">{value || '-'}</p>
    </div>
  );
}
