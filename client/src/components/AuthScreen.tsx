import { useState, type FormEvent } from 'react';
import logoMark from '@/assets/logo-mark.png';
import { useAuth } from '@/contexts/AuthContext';

const EMPTY = {
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  password: ''
};

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof EMPTY, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signin') {
        await login(form.email, form.password);
      } else {
        await register({
          username: form.username,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password
        });
      }
    } catch {
      // login and register both surface the failure as a toast.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-bg-sunken px-4">
      <div className="w-full max-w-[340px]">
        <div className="flex items-center gap-2 mb-4">
          <img src={logoMark} alt="" aria-hidden className="logo-mono w-4 h-4" />
          <span className="text-[13px] font-semibold tracking-tight">WellnessHub</span>
        </div>

        <div className="panel">
          <div className="flex border-b">
            {(['signin', 'signup'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                aria-pressed={mode === option}
                className={`flex-1 h-8 text-[12px] font-medium transition-colors ${
                  mode === option
                    ? 'text-accent border-b-2 border-accent -mb-px'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                {option === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="p-3 space-y-2">
            {mode === 'signup' && (
              <>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="field-label">First name</span>
                    <input
                      className="input"
                      required
                      value={form.firstName}
                      onChange={(e) => set('firstName', e.target.value)}
                    />
                  </label>
                  <label className="flex-1">
                    <span className="field-label">Last name</span>
                    <input
                      className="input"
                      required
                      value={form.lastName}
                      onChange={(e) => set('lastName', e.target.value)}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="field-label">Username</span>
                  <input
                    className="input"
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[a-zA-Z0-9_]+"
                    title="Letters, numbers and underscores only"
                    value={form.username}
                    onChange={(e) => set('username', e.target.value)}
                  />
                </label>
              </>
            )}

            <label className="block">
              <span className="field-label">Email</span>
              <input
                className="input"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </label>

            <label className="block">
              <span className="field-label">Password</span>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
              />
            </label>

            <button type="submit" className="btn btn-accent w-full h-8" disabled={busy}>
              {busy ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="micro mt-3 text-center">
          Seeded dev account: john@example.com / Password123!
        </p>
      </div>
    </div>
  );
}
