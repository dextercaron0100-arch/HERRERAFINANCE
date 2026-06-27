import React, { useState, useEffect } from 'react';
import { getProfiles, getRoles, initDB } from '../data/mockDatabase';
import { Lock, Mail, Briefcase, Shield, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';

interface LoginPageProps {
  onLogin: (userId: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  useEffect(() => {
    initDB();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Find if profile already exists for this email
        const profiles = getProfiles();
        const existingProfile = profiles.find(p => p.email.toLowerCase() === user.email?.toLowerCase());
        
        if (existingProfile) {
          onLogin(existingProfile.id);
        } else {
          // If not, sign out to prevent unauthorized access
          auth.signOut();
          setErrorMsg("Unauthorized account.");
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [onLogin]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Email and password required.");
      return;
    }

    const lowerEmail = email.trim().toLowerCase();
    const validEmails = ["mark@herrera.com", "ryan@herrera.com", "marvin@herrera.com", "accounting@herrera.com", "it@herrera.com"];
    const isHerrera = validEmails.includes(lowerEmail);

    if (!isHerrera) {
      setErrorMsg("Unauthorized email address. Only Herrera domain accounts are allowed.");
      return;
    }

    if (isHerrera && password === "Herrera2027") {
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } catch (err: any) {
         try {
           await createUserWithEmailAndPassword(auth, email.trim(), password);
         } catch(e) {}
      }
      setIsLoading(true);
      if (lowerEmail === "mark@herrera.com") onLogin("u-mark");
      if (lowerEmail === "ryan@herrera.com") onLogin("u-ryan");
      if (lowerEmail === "marvin@herrera.com") onLogin("u-marvin");
      if (lowerEmail === "accounting@herrera.com") onLogin("u-accounting");
      if (lowerEmail === "it@herrera.com") onLogin("u-it");
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email.trim(), password);
        } catch (createErr: any) {
          setErrorMsg(createErr.message);
        }
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setIsLoading(true);
    setErrorMsg('');
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsLoading(false);
    }
  };

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
                Passphrase
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="pin"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 placeholder-zinc-600 sm:text-sm focus:outline-hidden focus:ring-1 focus:ring-[#00B67A] focus:border-[#00B67A]"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-xs text-sm font-bold uppercase tracking-widest text-slate-900 bg-[#00B67A] hover:bg-[#00B67A]/90 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#00B67A] transition-all disabled:opacity-50"
              >
                {isLoading ? "Authenticating..." : "Access Mainframe"} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500 font-mono text-xs uppercase tracking-widest">Or</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-slate-200 rounded-xl shadow-xs text-sm font-bold text-slate-900 bg-slate-50 hover:bg-slate-50 transition-all disabled:opacity-50 items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
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
