import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Calendar, Settings, FileOutput, History, Menu, LogOut, Shield } from 'lucide-react';
import { Subject, Appointment, ViewState, AppointmentStatus, ChangeLogEntry, ChangeType, User } from './types';
import Dashboard from './components/Dashboard';
import SubjectManager from './components/SubjectManager';
import AppointmentCalendar from './components/AppointmentCalendar';
import ImportExport from './components/ImportExport';
import Communications from './components/Communications';
import ChangeLog from './components/ChangeLog';
import Login from './components/Login';
import UserManagement from './components/UserManagement';

// Mock Data for Initial State if empty
const MOCK_SUBJECTS: Subject[] = [
  { id: 'A001', name: 'Alice Freeman (AIIMS)', email: 'alice@aiims.edu', phone: '9876543210', insertionDate: new Date().toISOString() },
  { id: 'S002', name: 'Bob Smith (SJH)', phone: '8765432109', insertionDate: new Date().toISOString() },
  { id: 'M003', name: 'Charlie Davis (Meerut)', phone: '7654321098', insertionDate: new Date().toISOString() },
];

const DEFAULT_ADMIN: User = {
  username: 'admin',
  password: 'password123',
  name: 'Head Admin',
  role: 'ADMIN'
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<ViewState>('dashboard');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [changeLogs, setChangeLogs] = useState<ChangeLogEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Navigation State for pre-filtering the calendar
  const [calendarFilter, setCalendarFilter] = useState<AppointmentStatus | 'ALL'>('ALL');
  const [calendarMonthFilter, setCalendarMonthFilter] = useState<string>('ALL');

  useEffect(() => {
    const savedSubs = localStorage.getItem('pt_subjects');
    const savedApps = localStorage.getItem('pt_appointments');
    const savedLogs = localStorage.getItem('pt_changelogs');
    const savedUsers = localStorage.getItem('pt_users');
    
    let loadedUsers = savedUsers ? JSON.parse(savedUsers) : [DEFAULT_ADMIN];
    if (!loadedUsers.find((u: User) => u.username === 'admin')) {
      loadedUsers.push(DEFAULT_ADMIN);
    }
    setUsers(loadedUsers);

    if (savedSubs) setSubjects(JSON.parse(savedSubs));
    else setSubjects(MOCK_SUBJECTS);
    
    let loadedApps: Appointment[] = [];
    if (savedApps) {
      loadedApps = JSON.parse(savedApps);
    }

    const now = new Date();
    const updatedApps = loadedApps.map(app => {
      const appDate = new Date(app.date);
      if (appDate < now && app.status === AppointmentStatus.SCHEDULED) {
        return {
          ...app,
          status: AppointmentStatus.MISSED,
          followUpReason: 'Auto-detected: Past date',
          notes: (app.notes || '') + ' [System: Marked as Missed]'
        };
      }
      return app;
    });

    setAppointments(updatedApps);
    if (savedLogs) setChangeLogs(JSON.parse(savedLogs));

    const storedUser = localStorage.getItem('pt_current_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pt_subjects', JSON.stringify(subjects));
      localStorage.setItem('pt_appointments', JSON.stringify(appointments));
      localStorage.setItem('pt_changelogs', JSON.stringify(changeLogs));
      localStorage.setItem('pt_users', JSON.stringify(users));
      localStorage.setItem('pt_current_user', JSON.stringify(currentUser));
    }
  }, [subjects, appointments, changeLogs, users, currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pt_current_user');
    setView('dashboard');
  };

  const handleAddUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleDeleteUser = (username: string) => {
    setUsers(prev => prev.filter(u => u.username !== username));
  };

  const addChangeLog = (type: ChangeType, sub: Subject, details: string, comment: string) => {
    const newEntry: ChangeLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      subjectId: sub.id,
      subjectName: sub.name,
      changeType: type,
      details,
      comment
    };
    setChangeLogs(prev => [...prev, newEntry]);
  };

  const handleSubjectChange = (type: ChangeType, subjectData: Subject, comment: string) => {
    if (type === 'CREATE') {
      if (subjects.find(s => s.id === subjectData.id)) {
        alert('Error: Subject ID already exists.');
        return;
      }
      setSubjects(prev => [...prev, subjectData]);
      addChangeLog('CREATE', subjectData, 'Created new subject entry', comment);
    } else if (type === 'UPDATE') {
      const oldSub = subjects.find(s => s.id === subjectData.id);
      if (!oldSub) return;
      setSubjects(prev => prev.map(s => s.id === subjectData.id ? subjectData : s));
      addChangeLog('UPDATE', subjectData, 'Updated subject details', comment);
    } else if (type === 'DELETE') {
      setSubjects(prev => prev.filter(s => s.id !== subjectData.id));
      addChangeLog('DELETE', subjectData, 'Exited Subject from study', comment);
    }
  };

  const handleBulkAdd = (items: { 
    subjectId: string, 
    name: string, 
    phone: string, 
    insertionDate: string, 
    appointmentDate: string, 
    remark: string 
  }[]) => {
    const newApps: Appointment[] = [];
    const newSubs: Subject[] = [];
    const updatedSubs: Subject[] = [];
    const now = new Date();

    items.forEach(item => {
      let existingSubIndex = subjects.findIndex(s => s.id === item.subjectId);
      let subInNew = newSubs.find(s => s.id === item.subjectId);
      
      if (existingSubIndex === -1 && !subInNew) {
        const newSub: Subject = {
          id: item.subjectId,
          name: item.name || `Subject ${item.subjectId}`,
          phone: item.phone,
          insertionDate: item.insertionDate || now.toISOString(),
          notes: 'Auto-created via Bulk Multi-Column Entry'
        };
        newSubs.push(newSub);
      } else if (existingSubIndex !== -1) {
        const existing = subjects[existingSubIndex];
        const updated = {
          ...existing,
          name: item.name || existing.name,
          phone: item.phone || existing.phone,
          insertionDate: item.insertionDate || existing.insertionDate
        };
        if (JSON.stringify(updated) !== JSON.stringify(existing)) {
           updatedSubs.push(updated);
        }
      }

      const apptDate = new Date(item.appointmentDate);
      const isPast = apptDate < now;

      newApps.push({
        id: crypto.randomUUID(),
        subjectId: item.subjectId,
        date: apptDate.toISOString(),
        status: isPast ? AppointmentStatus.MISSED : AppointmentStatus.SCHEDULED,
        followUpReason: isPast ? 'Past date on bulk entry' : undefined,
        notes: item.remark
      });
    });

    if (newSubs.length > 0 || updatedSubs.length > 0) {
      setSubjects(prev => {
        let next = [...prev];
        next = [...next, ...newSubs];
        updatedSubs.forEach(u => {
          const idx = next.findIndex(s => s.id === u.id);
          if (idx !== -1) next[idx] = u;
        });
        return next;
      });
      addChangeLog('UPDATE', { id: 'BATCH', name: 'Bulk Ops' } as Subject, `Added ${newSubs.length} new subjects and updated ${updatedSubs.length}.`, 'Bulk Entry Operation');
    }

    if (newApps.length > 0) {
      setAppointments(prev => [...prev, ...newApps]);
      addChangeLog('CREATE', { id: 'BATCH', name: 'Bulk Appts' } as Subject, `Bulk scheduled ${newApps.length} appointments.`, 'Bulk Entry Operation');
    }

    setCalendarFilter('ALL');
    setCalendarMonthFilter('ALL');
    setView('calendar');
  };

  const updateStatus = (id: string, status: AppointmentStatus, reason?: string) => {
    const oldApp = appointments.find(a => a.id === id);
    setAppointments(prev => prev.map(a => 
      a.id === id ? { ...a, status, followUpReason: reason || a.followUpReason } : a
    ));

    if (oldApp && oldApp.status !== status) {
      const sub = subjects.find(s => s.id === oldApp.subjectId);
      if (sub) {
        addChangeLog('UPDATE', sub, `Status: ${oldApp.status} -> ${status}`, `Manual change. ${reason || ''}`);
      }
    }
  };

  const updateAppointment = (updated: Appointment) => {
    setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const addAppointment = (appt: Appointment) => {
    setAppointments(prev => [...prev, appt]);
  };

  const navigateWithFilter = (v: ViewState, f: AppointmentStatus | 'ALL' = 'ALL', m: string = 'ALL') => {
    setCalendarFilter(f);
    setCalendarMonthFilter(m);
    setView(v);
  };

  const NavItem = ({ v, icon, label, adminOnly = false }: { v: ViewState, icon: React.ReactNode, label: string, adminOnly?: boolean }) => {
    if (adminOnly && currentUser?.role !== 'ADMIN') return null;
    return (
      <button 
        onClick={() => { navigateWithFilter(v, 'ALL', 'ALL'); setSidebarOpen(false); }}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all ${
          view === v ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        {icon}
        <span>{label}</span>
      </button>
    );
  };

  if (!currentUser) return <Login users={users} onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">P</div>
            ProTrack
          </h1>
          <p className="text-xs text-slate-500 mt-1">Appointment Manager</p>
        </div>
        <nav className="px-4 space-y-2 mt-4">
          <NavItem v="dashboard" icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <NavItem v="subjects" icon={<Users size={18}/>} label="Subjects" />
          <NavItem v="calendar" icon={<Calendar size={18}/>} label="Schedule" />
          <NavItem v="communications" icon={<Settings size={18}/>} label="Communications" />
          <NavItem v="export" icon={<FileOutput size={18}/>} label="Data Management" />
          <div className="pt-4 mt-4 border-t border-slate-700">
             <NavItem v="changelog" icon={<History size={18}/>} label="Change Log" />
             <NavItem v="users" icon={<Shield size={18}/>} label="User Admin" adminOnly={true} />
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-600" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 capitalize">{view.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right text-xs">
              <div className="font-bold text-slate-900">{currentUser.name}</div>
              <div className="text-slate-500">{currentUser.role}</div>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 rounded-full transition"><LogOut size={20} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto">
            {view === 'dashboard' && <Dashboard subjects={subjects} appointments={appointments} onNavigate={navigateWithFilter} />}
            {view === 'subjects' && <SubjectManager subjects={subjects} appointments={appointments} onAddAppointment={addAppointment} onSubjectChange={handleSubjectChange} />}
            {view === 'calendar' && (
              <AppointmentCalendar 
                appointments={appointments} 
                subjects={subjects} 
                onUpdateStatus={updateStatus} 
                onUpdateAppointment={updateAppointment} 
                onAddAppointment={addAppointment} 
                onSubjectChange={handleSubjectChange}
                statusFilter={calendarFilter}
                setStatusFilter={setCalendarFilter}
                monthFilter={calendarMonthFilter}
                setMonthFilter={setCalendarMonthFilter}
              />
            )}
            {view === 'communications' && <Communications subjects={subjects} appointments={appointments} />}
            {view === 'export' && (
              <ImportExport 
                subjects={subjects} 
                appointments={appointments} 
                changeLogs={changeLogs}
                onImport={(data) => handleBulkAdd(data as any)} 
              />
            )}
            {view === 'changelog' && <ChangeLog logs={changeLogs} />}
            {view === 'users' && currentUser.role === 'ADMIN' && <UserManagement users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} currentUser={currentUser} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;