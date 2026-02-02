import React, { useState } from 'react';
import { Lock, ArrowRight, User as UserIcon, Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { User } from '../types';

interface Props {
  users: User[];
  onLogin: (user: User) => void;
}

const Login: React.FC<Props> = ({ users, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for realism
    setTimeout(() => {
      const user = users.find(u => u.username === username && u.password === password);
      
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid username or password.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto">
        
        <div className="w-full p-8 flex flex-col h-full relative">
           {/* Header / Logo */}
           <div className="flex items-center gap-2 mb-8">
             <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
                <span className="text-white font-bold text-xl">P</span>
             </div>
             <div>
                <h1 className="text-xl font-bold text-slate-800">ProTrack</h1>
                <p className="text-xs text-slate-400 font-medium tracking-wider">ADMIN LOGIN</p>
             </div>
           </div>

           {/* Main Form Area */}
           <div className="flex-1 flex flex-col justify-center animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back</h2>
              <p className="text-slate-500 mb-8 text-sm">Please sign in to access the management dashboard.</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">Username</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition" size={18} />
                    <input 
                      type="text" 
                      autoFocus
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1 ml-1">Password</label>
                  <div className="relative group">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition" size={18} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-red-500 font-medium flex items-center gap-1 animate-in fade-in bg-red-50 p-3 rounded-lg border border-red-100">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block"></span>
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      Secure Login <ShieldCheck size={18} />
                    </>
                  )}
                </button>
              </form>
           </div>

           {/* Footer */}
           <div className="mt-8 pt-6 border-t border-slate-50 text-center">
             <p className="text-[10px] text-slate-300 flex items-center justify-center gap-1">
               <Lock size={10} /> Authorized Personnel Only
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;