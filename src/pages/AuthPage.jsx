import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { Leaf, Eye, EyeOff, Mail, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function InputField({ icon: Icon, type = 'text', placeholder, value, onChange, rightElement }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
      )}
    </div>
  );
}

function SignIn({ onSwitchToSignUp, onSwitchToForgot }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
    // On success, AuthContext listener will update state
  };

  return (
    <motion.div
      key="signin"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
    >
      <div className="text-center mb-7">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">Sign in to your NUTRIMETH account</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          icon={Mail} type="email" placeholder="Email address"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <InputField
          icon={Lock} type={showPass ? 'text' : 'password'} placeholder="Password"
          value={password} onChange={e => setPassword(e.target.value)}
          rightElement={
            <button type="button" onClick={() => setShowPass(!showPass)} className="text-muted-foreground hover:text-foreground transition-colors">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        <div className="flex justify-end">
          <button type="button" onClick={onSwitchToForgot} className="text-xs text-primary hover:underline">
            Forgot password?
          </button>
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Don&apos;t have an account?{' '}
        <button onClick={onSwitchToSignUp} className="text-primary font-medium hover:underline">Sign Up</button>
      </p>
    </motion.div>
  );
}

function SignUp({ onSwitchToSignIn }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) { toast.error(error.message); setLoading(false); }
    else { setDone(true); }
  };

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Mail className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-2">Check your email</h2>
      <p className="text-sm text-muted-foreground mb-6">We sent a verification link to <strong>{email}</strong>. Click it to activate your account.</p>
      <button onClick={onSwitchToSignIn} className="text-primary text-sm font-medium hover:underline flex items-center gap-1 mx-auto">
        <ArrowLeft className="w-4 h-4" /> Back to Sign In
      </button>
    </motion.div>
  );

  return (
    <motion.div
      key="signup"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
    >
      <div className="text-center mb-7">
        <h1 className="text-2xl font-bold text-foreground">Create account</h1>
        <p className="text-sm text-muted-foreground mt-1">Join your NUTRIMETH team</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          icon={User} placeholder="Full name"
          value={fullName} onChange={e => setFullName(e.target.value)}
        />
        <InputField
          icon={Mail} type="email" placeholder="Email address"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <InputField
          icon={Lock} type={showPass ? 'text' : 'password'} placeholder="Password (min 6 chars)"
          value={password} onChange={e => setPassword(e.target.value)}
          rightElement={
            <button type="button" onClick={() => setShowPass(!showPass)} className="text-muted-foreground hover:text-foreground transition-colors">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />
        <InputField
          icon={Lock} type="password" placeholder="Confirm password"
          value={confirm} onChange={e => setConfirm(e.target.value)}
        />
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Account'}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{' '}
        <button onClick={onSwitchToSignIn} className="text-primary font-medium hover:underline">Sign In</button>
      </p>
    </motion.div>
  );
}

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) { toast.error(error.message); setLoading(false); }
    else { setDone(true); }
  };

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Mail className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-2">Email sent</h2>
      <p className="text-sm text-muted-foreground mb-6">Check your inbox for password reset instructions.</p>
      <button onClick={onBack} className="text-primary text-sm font-medium hover:underline flex items-center gap-1 mx-auto">
        <ArrowLeft className="w-4 h-4" /> Back to Sign In
      </button>
    </motion.div>
  );

  return (
    <motion.div
      key="forgot"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
    >
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="text-center mb-7">
        <h1 className="text-2xl font-bold text-foreground">Forgot password?</h1>
        <p className="text-sm text-muted-foreground mt-1">Enter your email to reset your password</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          icon={Mail} type="email" placeholder="Email address"
          value={email} onChange={e => setEmail(e.target.value)}
        />
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Reset Email'}
        </button>
      </form>
    </motion.div>
  );
}

export default function AuthPage() {
  const [view, setView] = useState('signin'); // 'signin' | 'signup' | 'forgot'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
            <Leaf className="w-7 h-7 text-primary-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground tracking-wide">NUTRIMETH BMS</h2>
          <p className="text-xs text-muted-foreground">Business Management System</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8">
          <AnimatePresence mode="wait">
            {view === 'signin' && (
              <SignIn
                key="signin"
                onSwitchToSignUp={() => setView('signup')}
                onSwitchToForgot={() => setView('forgot')}
              />
            )}
            {view === 'signup' && (
              <SignUp key="signup" onSwitchToSignIn={() => setView('signin')} />
            )}
            {view === 'forgot' && (
              <ForgotPassword key="forgot" onBack={() => setView('signin')} />
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Shared team system — all data is visible to all team members
        </p>
      </div>
    </div>
  );
}
