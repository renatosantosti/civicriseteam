import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

function SettingsPage() {
  const { user, updateProfile, updatePassword } = useAuth();
  const [name, setName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setZipCode(user.zipCode ?? '');
    }
  }, [user]);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setProfileLoading(true);
    try {
      await updateProfile(name.trim(), zipCode.trim() || undefined);
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const inputClass =
    'mt-1 w-full rounded-lg border border-gray-600 bg-civic-navy px-4 py-2 text-white placeholder-gray-500 focus:border-civic-orange focus:outline-none focus:ring-1 focus:ring-civic-orange';
  const labelClass = 'block text-sm font-medium text-gray-300';

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Profile */}
      <section className="rounded-xl border border-gray-700 bg-civic-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-white">Edit profile</h2>
        <p className="mt-1 text-sm text-gray-400">
          Update your name and ZIP code. Email cannot be changed.
        </p>
        <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="profile-name" className={labelClass}>
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Full name"
              required
            />
          </div>
          <div>
            <label htmlFor="profile-email" className={labelClass}>
              Email (cannot be changed)
            </label>
            <input
              id="profile-email"
              type="email"
              value={user.email}
              readOnly
              className={inputClass + ' cursor-not-allowed bg-gray-800/50'}
              aria-readonly="true"
            />
          </div>
          <div>
            <label htmlFor="profile-zip" className={labelClass}>
              ZIP code
            </label>
            <input
              id="profile-zip"
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className={inputClass}
              placeholder="ZIP code"
            />
          </div>
          {profileError && (
            <p className="text-sm text-red-400" role="alert">
              {profileError}
            </p>
          )}
          {profileSuccess && (
            <p className="text-sm text-green-400" role="status">
              Profile updated.
            </p>
          )}
          <button
            type="submit"
            disabled={profileLoading}
            className="rounded-lg bg-civic-orange px-4 py-2 font-medium text-white hover:bg-civic-orange-hover disabled:opacity-50"
          >
            {profileLoading ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      {/* Change password */}
      <section className="rounded-xl border border-gray-700 bg-civic-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-white">Change password</h2>
        <p className="mt-1 text-sm text-gray-400">
          Enter your current password and choose a new one (at least 6 characters).
        </p>
        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="current-password" className={labelClass}>
              Current password
            </label>
            <div className="relative">
              <input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass + ' pr-10'}
                placeholder="Current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="new-password" className={labelClass}>
              New password
            </label>
            <input
              id="new-password"
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder="At least 6 characters"
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className={labelClass}>
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              placeholder="Confirm new password"
            />
          </div>
          {passwordError && (
            <p className="text-sm text-red-400" role="alert">
              {passwordError}
            </p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-green-400" role="status">
              Password updated.
            </p>
          )}
          <button
            type="submit"
            disabled={passwordLoading}
            className="rounded-lg bg-civic-orange px-4 py-2 font-medium text-white hover:bg-civic-orange-hover disabled:opacity-50"
          >
            {passwordLoading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  );
}

export const Route = createFileRoute('/dashboard/settings')({
  head: () => ({
    meta: [{ title: 'Settings – CivicRise' }],
  }),
  component: SettingsPage,
});
