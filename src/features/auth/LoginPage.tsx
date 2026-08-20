import React, { useState, useEffect, useRef } from 'react';
import { getProfiles, hydrateDatabaseFromFirestore, initDB } from '@/data/mockDatabase';
import { Lock, Mail, Briefcase, Shield, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';

interface LoginPageProps {
  onLogin: (userId: string) => void;
}

function HerreraLogoMark() {
  return (
    <svg
      className="w-full h-full z-10 transform group-hover:scale-105 transition-transform duration-500 ease-out drop-shadow-2xl"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        {/* Left Shield Outline */}
        <path d="M 50 15 L 20 20 C 18 55, 30 85, 50 95" stroke="#002D56" />
        {/* Right Shield Outline */}
        <path d="M 50 15 L 80 20 C 82 55, 70 85, 50 95" stroke="#B6923C" />
      </g>

      {/* Left Pillar */}
      <rect x="25" y="28" width="15" height="50" fill="#002D56" />
      <rect x="25" y="28" width="5" height="50" fill="#1A4A78" /> {/* 3D Bevel Highlight */}

      {/* Right Pillar */}
      <rect x="60" y="28" width="15" height="50" fill="#002D56" />
      <rect x="60" y="28" width="5" height="50" fill="#1A4A78" /> {/* 3D Bevel Highlight */}

      {/* Arrow Cutout (Background color stroke for separation) */}
      <path d="M 18 64 L 43 39 L 53 49 L 83 19" stroke="#0A0B0C" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* The Arrow (Gold) */}
      <path d="M 18 64 L 43 39 L 53 49 L 83 19" stroke="#B6923C" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Arrowhead */}
      <polygon points="72,16 90,10 84,28" fill="#B6923C" stroke="#B6923C" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function AuthCheckScreen({ onEnded }: { onEnded: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    let cancelled = false;
    const attemptPlay = async () => {
      try {
        videoEl.muted = false;
        await videoEl.play();
      } catch {
        // Browser blocked autoplay-with-sound (no prior user gesture on this
        // page load, e.g. a hard refresh). Fall back to muted autoplay so the
        // loader still plays instead of sitting on a frozen first frame.
        if (cancelled) return;
        videoEl.muted = true;
        try {
          await videoEl.play();
        } catch {
          // Nothing more we can do if even muted autoplay is blocked.
        }
      }
    };
    attemptPlay();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black">
      <video
        ref={videoRef}
        src="/login-loader.mp4"
        playsInline
        onEnded={onEnded}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="absolute inset-x-0 bottom-12 z-10 flex flex-col items-center gap-3"
      >
        <p className="text-xs font-bold text-white/90 font-mono uppercase tracking-[0.2em] drop-shadow">
          Establishing Secure Session
        </p>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#00B67A]"
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.1, 0.85] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function SessionRestoreScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-4">
        <div className="h-16 w-16 animate-pulse">
          <HerreraLogoMark />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 font-mono">
          Restoring secure session
        </p>
      </div>
    </div>
  );
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [showLoginVideo, setShowLoginVideo] = useState(false);
  const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);
  const videoEndedRef = useRef(false);
  const freshSignInRef = useRef(false);

  const handleLoaderVideoEnded = () => {
    videoEndedRef.current = true;
    setShowLoginVideo(false);
    if (pendingProfileId) {
      onLogin(pendingProfileId);
    }
  };

  useEffect(() => {
    initDB();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsCheckingSession(true);
        try {
          await hydrateDatabaseFromFirestore();
        } catch (error: any) {
          await auth.signOut();
          freshSignInRef.current = false;
          setErrorMsg(error.message || "Unable to load the production database.");
          setIsLoading(false);
          setIsCheckingSession(false);
          return;
        }
        // Find if profile already exists for this email
        const profiles = getProfiles();
        const existingProfile = profiles.find(p => p.email.toLowerCase() === user.email?.toLowerCase());

        if (existingProfile) {
          // Persisted Firebase sessions should open the app immediately after
          // hydration. Only an interactive sign-in started on this page plays
          // the branded loader video.
          if (freshSignInRef.current && !videoEndedRef.current) {
            setPendingProfileId(existingProfile.id);
            setIsCheckingSession(false);
            setShowLoginVideo(true);
          } else {
            onLogin(existingProfile.id);
          }
        } else {
          // If not, sign out to prevent unauthorized access
          auth.signOut();
          freshSignInRef.current = false;
          setErrorMsg("Unauthorized account.");
          setIsLoading(false);
          setIsCheckingSession(false);
        }
      } else {
        setIsCheckingSession(false);
      }
    });

    return () => unsubscribe();
  }, [onLogin]);

  const handleSwitchMode = (next: 'signin' | 'signup') => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setErrorMsg('');
  };

  // Note: this only checks the domain suffix. Whether a real app profile exists
  // for this email can't be verified client-side before authentication (the
  // profile list is loaded from Firestore, which requires a signed-in user to
  // read). The actual authorization check happens post-login in
  // onAuthStateChanged above, which signs the user back out if no profile matches.
  const checkAuthorizedEmail = (lowerEmail: string): string | null => {
    if (!lowerEmail.endsWith('@herrera.com')) {
      return "Unauthorized email address. Only Herrera domain accounts are allowed.";
    }
    return null;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const lowerEmail = email.trim().toLowerCase();
    const authError = checkAuthorizedEmail(lowerEmail);
    if (authError) {
      setErrorMsg(authError);
      return;
    }
    if (!password) {
      setErrorMsg("Password required.");
      return;
    }

    if (mode === 'signup') {
      if (password.length < 8) {
        setErrorMsg("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg('');
    freshSignInRef.current = true;
    videoEndedRef.current = false;
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, lowerEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, lowerEmail, password);
      }
    } catch (err: any) {
      freshSignInRef.current = false;
      if (err.code === 'auth/email-already-in-use') {
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
        setErrorMsg("An account already exists for this email. Please sign in instead.");
      } else if (err.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid email or password.');
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showLoginVideo) {
    return <AuthCheckScreen onEnded={handleLoaderVideoEnded} />;
  }

  if (isCheckingSession) return <SessionRestoreScreen />;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            duration: 0.8, 
            type: "spring",
            stiffness: 100
          }}
          className="flex justify-center mb-4"
        >
          <div className="relative w-24 h-24 group">
            {/* Ambient glow */}
            <div className="absolute -inset-4 bg-gradient-to-br from-[#002D56]/40 to-[#B6923C]/40 rounded-full opacity-50 blur-xl group-hover:opacity-70 transition-opacity duration-1000"></div>
            
            {/* Core logo structure */}
            <div className="relative w-full h-full flex items-center justify-center">
              <HerreraLogoMark />
            </div>
          </div>
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-6 text-center text-3xl font-extrabold text-slate-900 font-display tracking-tight"
        >
          HERRERA FINANCE
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-2 text-center text-sm text-slate-600 font-mono"
        >
          Corporate Ledger & Treasury
        </motion.p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white py-8 px-4 shadow-2xl border border-slate-200 sm:rounded-3xl sm:px-10">
          <form className="space-y-6" onSubmit={handleEmailAuth}>
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg font-mono">
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2 font-mono">
                Identity Email
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mark@herrera.com"
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#00B67A] focus:border-[#00B67A] sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pin" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2 font-mono">
                {mode === 'signup' ? "Create Passphrase" : "Passphrase"}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="pin"
                  name="password"
                  type="password"
                  autoComplete={mode === 'signup' ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 placeholder-zinc-600 sm:text-sm focus:outline-hidden focus:ring-1 focus:ring-[#00B67A] focus:border-[#00B67A]"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label htmlFor="pin-confirm" className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2 font-mono">
                  Confirm Passphrase
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    id="pin-confirm"
                    name="passwordConfirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 placeholder-zinc-600 sm:text-sm focus:outline-hidden focus:ring-1 focus:ring-[#00B67A] focus:border-[#00B67A]"
                  />
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-xs text-sm font-bold uppercase tracking-widest text-slate-900 bg-[#00B67A] hover:bg-[#00B67A]/90 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#00B67A] transition-all disabled:opacity-50"
              >
                {isLoading
                  ? "Please wait..."
                  : mode === 'signup'
                    ? "Create Password & Sign In"
                    : "Access Mainframe"} <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSwitchMode(mode === 'signup' ? 'signin' : 'signup')}
              disabled={isLoading}
              className="w-full text-center text-xs text-slate-500 font-mono uppercase tracking-widest hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              {mode === 'signup' ? "Already have a password? Sign in" : "First time here? Set up your password"}
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              Live Connection Secured
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
