import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Mail, Lock, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from     = location.state?.from?.pathname || '/';

  const [mode,         setMode]         = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [fullName,  setFullName]  = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message === 'Invalid login credentials'
        ? 'Incorrect email or password'
        : (err.message || 'Sign in failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (error) throw error;
      toast.success('Account created! You can now sign in.');
      setMode('signin');
    } catch (err) {
      toast.error(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      toast.error(err.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f5] flex flex-col items-center justify-center px-4">

      {/* Brand */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg mb-4">
          <Leaf className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-wide">NUTRIMETH BMS</h1>
        <p className="text-sm text-gray-500 mt-1">Business Management System</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm px-8 py-8">

        {/* ── SIGN IN ── */}
        {mode === 'signin' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 mb-6">Sign in to your NUTRIMETH account</p>

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button type="button" onClick={() => setMode('forgot')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <button onClick={() => setMode('signup')}
                className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Sign Up
              </button>
            </p>
          </>
        )}

        {/* ── SIGN UP ── */}
        {mode === 'signup' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Create account</h2>
            <p className="text-sm text-gray-500 mb-6">Join NUTRIMETH BMS</p>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={6}
                  required
                  className="w-full pl-10 pr-10 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Account
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <button onClick={() => setMode('signin')}
                className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Sign In
              </button>
            </p>
          </>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === 'forgot' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Reset password</h2>
            <p className="text-sm text-gray-500 mb-6">Enter your email to receive a reset link</p>

            {resetSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Check your inbox</p>
                <p className="text-xs text-gray-500 mt-1">Reset link sent to {email}</p>
                <button onClick={() => { setMode('signin'); setResetSent(false); }}
                  className="mt-4 text-sm text-emerald-600 font-semibold hover:text-emerald-700">
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Reset Link
                </button>
              </form>
            )}

            {!resetSent && (
              <p className="text-center text-sm text-gray-500 mt-6">
                <button onClick={() => setMode('signin')}
                  className="text-emerald-600 hover:text-emerald-700 font-semibold">
                  ← Back to Sign In
                </button>
              </p>
            )}
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Shared team system — all data is visible to all team members
      </p>
    </div>
  );
}
