'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface StaffUser {
  _id: string;
  fullName: string;
  workEmail: string;
  employeeId: string;
  walletBalance: number;
  isActive: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', employeeId: '', workEmail: '', walletBalance: '' });
  const [tempPassword, setTempPassword] = useState('');
  const [passwordResetUser, setPasswordResetUser] = useState<StaffUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<StaffUser | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [balanceUpdate, setBalanceUpdate] = useState<{
    name: string;
    email: string;
    previousBalance: number;
    newBalance: number;
    emailSent: boolean;
  } | null>(null);

  const loadUsers = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadUsers(search), 300);
    return () => clearTimeout(timer);
  }, [search, loadUsers]);

  // Activate / Deactivate
  async function toggleStatus(user: StaffUser) {
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed to update user status.');
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: !user.isActive } : u))
      );
    } catch {
      alert('Network error.');
    }
  }

  // Edit details
  function startEdit(user: StaffUser) {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      employeeId: user.employeeId,
      workEmail: user.workEmail,
      walletBalance: String(user.walletBalance ?? 0),
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    const balance = Number(editForm.walletBalance);
    if (Number.isNaN(balance) || balance < 0) {
      alert('Please enter a valid balance (0 or more).');
      return;
    }

    const editedUser = editingUser;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editedUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editForm.fullName,
          employeeId: editForm.employeeId,
          workEmail: editForm.workEmail,
          walletBalance: balance,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed to update user details.');
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u._id === editedUser._id
            ? { ...u, fullName: editForm.fullName, employeeId: editForm.employeeId, workEmail: editForm.workEmail, walletBalance: balance }
            : u
        )
      );
      setEditingUser(null);

      // If the balance actually changed, confirm the details + email to the admin.
      if (data.balanceChanged) {
        setBalanceUpdate({
          name: editForm.fullName,
          email: data.workEmail,
          previousBalance: data.previousBalance,
          newBalance: data.newBalance,
          emailSent: data.emailSent,
        });
      }
    } catch {
      alert('Network error.');
    } finally {
      setEditSaving(false);
    }
  }

  // Reset password
  async function resetPassword(user: StaffUser) {
    if (!confirm(`Are you sure you want to reset the password for ${user.fullName}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed to reset password.');
        return;
      }
      setTempPassword(data.tempPassword);
      setPasswordResetUser(user);
    } catch {
      alert('Network error.');
    }
  }

  // Delete user permanently
  async function confirmDelete() {
    if (!deletingUser) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${deletingUser._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? 'Failed to delete user.');
        return;
      }
      setUsers((prev) => prev.filter((u) => u._id !== deletingUser._id));
      setDeletingUser(null);
    } catch {
      alert('Network error.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[var(--foreground)]">Staff Management</h1>

      {/* Search */}
      <div className="relative">
        <input
          id="user-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or ID…"
          className="w-full h-12 px-3.5 rounded-xl border-2 border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm focus:ring-2 focus:ring-[var(--foreground)] focus:border-[var(--foreground)] transition-all duration-150"
        />
      </div>

      {error && (
        <div className="px-3.5 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted)]">
          <p className="font-semibold text-sm">No staff found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user._id}
              className="bg-[var(--card)] rounded-2xl border-2 border-[var(--border)] p-4 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-start">
                <Link href={`/admin/users/${user._id}`} className="min-w-0 flex-1 hover:underline">
                  <p className="font-bold text-sm text-[var(--foreground)] truncate">{user.fullName}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{user.workEmail}</p>
                  <p className="text-xs text-[var(--muted)] font-semibold mt-1">ID: {user.employeeId} · Balance: Rs.{user.walletBalance.toFixed(2)}</p>
                </Link>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase shrink-0 ml-3 ${
                  user.isActive
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
                <button
                  onClick={() => startEdit(user)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold bg-white hover:bg-slate-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleStatus(user)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    user.isActive
                      ? 'border-red-200 bg-red-50/50 text-red-700 hover:bg-red-50'
                      : 'border-green-200 bg-green-50/50 text-green-700 hover:bg-green-50'
                  }`}
                >
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => resetPassword(user)}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold bg-white hover:bg-slate-50 transition-colors"
                >
                  Reset PW
                </button>
                <button
                  onClick={() => setDeletingUser(user)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50/50 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors ml-auto"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Details Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-[var(--foreground)]">Edit Staff Details</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Employee ID</label>
                <input
                  type="text"
                  required
                  value={editForm.employeeId}
                  onChange={(e) => setEditForm((f) => ({ ...f, employeeId: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={editForm.workEmail}
                  onChange={(e) => setEditForm((f) => ({ ...f, workEmail: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Wallet Balance (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editForm.walletBalance}
                  onChange={(e) => setEditForm((f) => ({ ...f, walletBalance: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--border)] text-sm"
                />
                <p className="text-[11px] text-[var(--muted)] font-semibold mt-1">
                  Sets the balance to this exact amount. Use TopUp to add funds with a record.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={editSaving}
                  className="flex-1 h-10 rounded-lg border border-[var(--border)] text-sm font-semibold disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 h-10 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold disabled:opacity-60"
                >
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Balance Change Confirmation Modal */}
      {balanceUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-[var(--foreground)]">Balance Updated</h3>
            <p className="text-sm text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">{balanceUpdate.name}</strong>&apos;s wallet balance was changed.
            </p>

            <div className="bg-slate-50 border border-[var(--border)] rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--muted)] font-semibold">Previous Balance</span>
                <span className="text-sm font-bold text-[var(--muted)] line-through">Rs.{balanceUpdate.previousBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[var(--muted)] font-semibold">New Balance</span>
                <span className="text-lg font-extrabold text-[var(--foreground)]">Rs.{balanceUpdate.newBalance.toFixed(2)}</span>
              </div>
            </div>

            <div className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center ${
              balanceUpdate.emailSent
                ? 'bg-[var(--success-light)] text-[var(--success)] border border-[var(--muted)]/30'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {balanceUpdate.emailSent
                ? `Notification email sent to ${balanceUpdate.email}`
                : `Balance updated, but the email to ${balanceUpdate.email} could not be sent.`}
            </div>

            <button
              onClick={() => setBalanceUpdate(null)}
              className="w-full h-10 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Modal (Shows password once) */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-[var(--foreground)] text-red-600">Password Reset Completed</h3>
            <p className="text-sm text-[var(--muted)]">
              Here is the temporary password for <strong>{passwordResetUser.fullName}</strong>. Please share it with them. It will not be shown again.
            </p>
            <div className="bg-slate-100 p-3 rounded-lg text-center font-mono text-lg font-bold tracking-wider select-all text-[var(--foreground)]">
              {tempPassword}
            </div>
            <button
              onClick={() => {
                setPasswordResetUser(null);
                setTempPassword('');
              }}
              className="w-full h-10 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-red-600">Delete Staff Member</h3>
            <p className="text-sm text-[var(--muted)]">
              This will permanently delete <strong>{deletingUser.fullName}</strong> ({deletingUser.workEmail})
              along with all of their meal requests and top-up history. This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={deleteBusy}
                className="flex-1 h-10 rounded-lg border border-[var(--border)] text-sm font-semibold disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteBusy}
                className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleteBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
