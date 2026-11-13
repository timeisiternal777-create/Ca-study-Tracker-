import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, GraduationCap, Trophy, Sparkles } from 'lucide-react';
import { sfx } from '../soundEffects';
import HorizontalLoader from './HorizontalLoader';

interface LoginScreenProps {
  onGoogleSignIn: () => Promise<void>;
  isLoading: boolean;
}

export default function LoginScreen({ onGoogleSignIn, isLoading }: LoginScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    sfx.playClick();
    setError(null);
    setSigningIn(true);
    try {
      await onGoogleSignIn();
      sfx.playSuccessReward();
    } catch (err: any) {
      console.error(err);
      sfx.playCancel();
      let msg = 'Failed to sign in. Please verify your connection and try again.';
      if (err?.message?.includes('popup-closed-by-user')) {
        msg = 'Sign-in popup was closed before completion. Please try again.';
      }
      setError(msg);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient light leaks */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-500/5 blur-3xl -z-10" />

      {/* Main card panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-slate-900/40 border border-slate-800 backdrop-blur-xl p-8 rounded-3xl shadow-2xl relative overflow-hidden"
      >
        {/* Colorful top border edge */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-teal-500 to-purple-500" />
        
        <div className="flex flex-col items-center text-center">
          {/* Logo icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 p-0.5 shadow-lg shadow-indigo-600/20 mb-6 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-indigo-400" />
            </div>
          </div>

          <span className="text-xs uppercase tracking-[0.2em] text-indigo-400 font-bold mb-2 block">
            Chartered Accountancy 2026
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            CA Inter 2026
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-300">
              Study Tracker
            </span>
          </h1>

          <p className="text-slate-400 text-sm mt-3 max-w-sm">
            The ultimate productivity companion and real-time ledger to conquer your CA Intermediate examinations.
          </p>

          <div className="grid grid-cols-3 gap-3 w-full my-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <div className="text-center">
              <BookOpen className="w-4 h-4 text-indigo-400 mx-auto mb-1.5" />
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Track</span>
              <span className="text-xs font-bold text-slate-300">6 Subjects</span>
            </div>
            <div className="text-center border-x border-slate-800/80">
              <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1.5" />
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Mock Logs</span>
              <span className="text-xs font-bold text-slate-300">Score Trends</span>
            </div>
            <div className="text-center">
              <Sparkles className="w-4 h-4 text-teal-400 mx-auto mb-1.5" />
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Sync</span>
              <span className="text-xs font-bold text-slate-300">Real-time</span>
            </div>
          </div>

          {error && (
            <div className="w-full text-left p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs mb-4">
              {error}
            </div>
          )}

          {isLoading || signingIn ? (
            <div className="w-full mb-4">
              <HorizontalLoader label="Signing you in..." durationMs={2000} />
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="w-full py-4 px-6 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-xl text-sm transition-all shadow-xl hover:shadow-white/5 flex items-center justify-center gap-3 cursor-pointer"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.245-3.123C18.29.92 15.446 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.4-.195-1.925H12.24z"
                />
              </svg>
              Sign in with Google
            </button>
          )}
          
          <div className="mt-8 text-[11px] text-slate-600 max-w-xs">
            By signing in, you access real-time Cloud Ledger synchronization. Your study data is fully secured and available on all devices.
          </div>
        </div>
      </motion.div>
    </div>
  );
}
