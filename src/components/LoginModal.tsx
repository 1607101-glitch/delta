import React, { useState } from 'react';
import { StudentSession } from '../types';
import { X, Lock, User, School, Check, Sparkles, KeyRound } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: StudentSession;
  onUpdateSession: (newSession: StudentSession) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  session,
  onUpdateSession,
}) => {
  const [studentName, setStudentName] = useState(session.studentName || 'Jacob Mitchell');
  const [email, setEmail] = useState(session.email || 'jacob221355photos@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [teacherName, setTeacherName] = useState(session.teacherName || 'Mr. Henderson');
  const [schoolName, setSchoolName] = useState(session.schoolName || 'Lincoln High School');
  const [period, setPeriod] = useState(session.period || 'Period 3 (Honors Alg 2)');
  const [classCode, setClassCode] = useState(session.classCode || 'HEND-8842');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      const updated: StudentSession = {
        isLoggedIn: true,
        studentName,
        email,
        teacherName,
        schoolName,
        period,
        classCode,
        sessionToken: `dm_tok_${Math.random().toString(36).substring(2, 10)}`,
      };
      onUpdateSession(updated);
      setIsSubmitting(false);
      setAuthSuccess(true);
      setTimeout(() => {
        setAuthSuccess(false);
        onClose();
      }, 700);
    }, 600);
  };

  const handleGoogleSso = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const updated: StudentSession = {
        isLoggedIn: true,
        studentName: 'Jacob (Google Account)',
        email: 'jacob221355photos@gmail.com',
        teacherName: 'Mr. Henderson',
        schoolName: 'Lincoln High School',
        period: 'Period 3 (Honors Alg 2)',
        classCode: 'HEND-8842',
        sessionToken: `dm_google_sso_${Date.now()}`,
      };
      onUpdateSession(updated);
      setIsSubmitting(false);
      setAuthSuccess(true);
      setTimeout(() => {
        setAuthSuccess(false);
        onClose();
      }, 700);
    }, 800);
  };

  const handleLogout = () => {
    onUpdateSession({
      isLoggedIn: false,
      studentName: 'Guest Student',
      email: '',
      teacherName: 'Not Assigned',
      schoolName: 'Public Demo Session',
      period: 'Period 1',
      classCode: '',
      sessionToken: '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* DeltaMath Classic Blue Header */}
        <div className="bg-gradient-to-r from-blue-700 via-sky-600 to-indigo-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner font-bold text-lg">
              Δ
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">DeltaMath Student Portal</h2>
              <p className="text-xs text-blue-100">In-App Authentication & Session Bridge</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {session.isLoggedIn && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 font-bold text-sm">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-semibold text-emerald-300">
                    DeltaMath Active Session Linked
                  </div>
                  <div className="text-sm font-medium text-slate-200">
                    {session.studentName} • {session.period}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/40"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleSso}
            disabled={isSubmitting}
            className="w-full mb-4 py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-medium rounded-xl border border-slate-300 shadow-sm flex items-center justify-center gap-3 transition active:scale-[0.99] disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Log In with Google SSO (DeltaMath)</span>
          </button>

          <div className="relative my-4 flex items-center justify-center">
            <div className="border-t border-slate-700 w-full"></div>
            <span className="bg-slate-900 px-3 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Or Manual Student Login
            </span>
          </div>

          <form onSubmit={handleSaveLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                Student Name / Username
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                placeholder="e.g. Jacob Mitchell"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-sky-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                  placeholder="student@school.edu"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-sky-400" />
                  Teacher / Class Code
                </label>
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                  placeholder="e.g. HEND-8842"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Teacher Name</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                  placeholder="e.g. Mr. Henderson"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Period / Course Section</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                placeholder="e.g. Period 3 (Honors Algebra 2)"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {authSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Logged In Successfully!</span>
                  </>
                ) : isSubmitting ? (
                  <span>Authenticating with DeltaMath...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sky-200" />
                    <span>Save & Connect In-App Session</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
