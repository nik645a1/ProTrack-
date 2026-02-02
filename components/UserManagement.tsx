import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Users, UserPlus, Shield, Trash2, Key } from 'lucide-react';

interface Props {
  users: User[];
  onAddUser: (user: User) => void;
  onDeleteUser: (username: string) => void;
  currentUser: User | null;
}

const UserManagement: React.FC<Props> = ({ users, onAddUser, onDeleteUser, currentUser }) => {
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'USER' });
  const [error, setError] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.name) {
      setError('All fields are required.');
      return;
    }
    
    // Check duplicate
    if (users.find(u => u.username === newUser.username)) {
      setError('Username already exists.');
      return;
    }

    onAddUser({
      username: newUser.username,
      password: newUser.password,
      name: newUser.name,
      role: newUser.role as UserRole
    });
    setNewUser({ role: 'USER', username: '', password: '', name: '' });
    setError('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-indigo-900">
          <Shield className="text-indigo-600" />
          Admin Console
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Manage system access. Only the Head Admin can create or remove users.
        </p>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Create User Form */}
          <div className="lg:col-span-1 bg-slate-50 p-5 rounded-lg border border-slate-100 h-fit">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus size={18} /> Create New User
            </h3>
            
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input 
                  value={newUser.name || ''}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Dr. John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                <input 
                  value={newUser.username || ''}
                  onChange={e => setNewUser({...newUser, username: e.target.value})}
                  className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="johndoe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                <input 
                  type="password"
                  value={newUser.password || ''}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                <select 
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                  className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="USER">Standard User</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

              <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm">
                Create User
              </button>
            </form>
          </div>

          {/* User List */}
          <div className="lg:col-span-2">
             <div className="overflow-hidden rounded-lg border border-slate-200">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-100 text-slate-500 font-medium">
                   <tr>
                     <th className="px-4 py-3">User</th>
                     <th className="px-4 py-3">Role</th>
                     <th className="px-4 py-3 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                   {users.map(u => (
                     <tr key={u.username} className="hover:bg-slate-50">
                       <td className="px-4 py-3">
                         <div className="font-medium text-slate-800">{u.name}</div>
                         <div className="text-xs text-slate-400">@{u.username}</div>
                       </td>
                       <td className="px-4 py-3">
                         <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                           u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                         }`}>
                           {u.role}
                         </span>
                       </td>
                       <td className="px-4 py-3 text-right">
                         {u.username !== currentUser?.username && u.username !== 'admin' && (
                           <button 
                             onClick={() => onDeleteUser(u.username)}
                             className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded transition"
                             title="Remove User"
                           >
                             <Trash2 size={16} />
                           </button>
                         )}
                         {u.username === 'admin' && <span className="text-xs text-slate-400 italic">System Owner</span>}
                         {u.username === currentUser?.username && <span className="text-xs text-indigo-400 italic">You</span>}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserManagement;