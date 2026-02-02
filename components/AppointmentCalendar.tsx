import React, { useMemo, useState, useEffect } from 'react';
import { Appointment, Subject, AppointmentStatus, ChangeType } from '../types';
import { format, parseISO, startOfMonth, isValid as isDateValid, subDays, isBefore, startOfDay, isAfter, endOfMonth } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Search, 
  ArrowUpDown, 
  PieChart as PieIcon, 
  List, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  RefreshCw,
  X,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Info,
  LogOut,
  AlertTriangle,
  CalendarDays,
  ArrowLeft,
  History
} from 'lucide-react';
import { STATUS_COLORS } from '../constants';

interface Props {
  appointments: Appointment[];
  subjects: Subject[];
  onUpdateStatus: (id: string, status: AppointmentStatus, reason?: string) => void;
  onUpdateAppointment: (updated: Appointment) => void;
  onAddAppointment: (appt: Appointment) => void;
  onSubjectChange: (type: ChangeType, subject: Subject, comment: string) => void;
  statusFilter: AppointmentStatus | 'ALL';
  setStatusFilter: (filter: AppointmentStatus | 'ALL') => void;
  monthFilter: string;
  setMonthFilter: (filter: string) => void;
}

type SortOrder = 'asc' | 'desc';
type ViewMode = 'timeline' | 'analytics';

const AppointmentCalendar: React.FC<Props> = ({ 
  appointments, 
  subjects, 
  onUpdateStatus, 
  onUpdateAppointment,
  onAddAppointment,
  onSubjectChange,
  statusFilter,
  setStatusFilter,
  monthFilter,
  setMonthFilter
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reasonBuffer, setReasonBuffer] = useState('');
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [showPastRecords, setShowPastRecords] = useState(false);

  const [rescheduleApp, setRescheduleApp] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const [completionApp, setCompletionApp] = useState<Appointment | null>(null);
  const [completionDate, setCompletionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isApproximate, setIsApproximate] = useState(false);
  
  const [postVisitAction, setPostVisitAction] = useState<'NEXT_APPT' | 'EXIT' | null>(null);
  const [nextApptDate, setNextApptDate] = useState('');
  const [nextApptTime, setNextApptTime] = useState('10:00');
  const [nextApptNotes, setNextApptNotes] = useState('');

  const [exitReason, setExitReason] = useState<'REMOVAL' | 'EXPULSION' | 'COMPLETED' | 'OTHER'>('COMPLETED');
  const [exitOtherReason, setExitOtherReason] = useState('');
  const [exitDate, setExitDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (monthFilter !== 'ALL') {
      setExpandedMonths(prev => ({ ...prev, [monthFilter]: true }));
      // Automatically show past records if user navigates to a past month from dashboard
      const monthStart = startOfMonth(parseISO(monthFilter + '-01'));
      if (isBefore(monthStart, startOfMonth(new Date()))) {
        setShowPastRecords(true);
      }
    }
  }, [monthFilter]);

  const processedData = useMemo(() => {
    let filtered = appointments.filter(app => {
      const sub = subjects.find(s => s.id === app.subjectId);
      const matchesSearch = 
        sub?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        sub?.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
      
      const appMonthKey = format(parseISO(app.date), 'yyyy-MM');
      const matchesMonth = monthFilter === 'ALL' || appMonthKey === monthFilter;
      
      return matchesSearch && matchesStatus && matchesMonth;
    });

    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [appointments, subjects, searchTerm, statusFilter, monthFilter, sortOrder]);

  const groupedData = useMemo(() => {
    const currentMonthStart = startOfMonth(new Date());
    const upcoming: Record<string, Appointment[]> = {};
    const past: Record<string, Appointment[]> = {};

    processedData.forEach(app => {
      const date = parseISO(app.date);
      const key = format(startOfMonth(date), 'yyyy-MM');
      
      if (isBefore(startOfMonth(date), currentMonthStart)) {
        if (!past[key]) past[key] = [];
        past[key].push(app);
      } else {
        if (!upcoming[key]) upcoming[key] = [];
        upcoming[key].push(app);
      }
    });

    return { upcoming, past };
  }, [processedData]);

  const getSubject = (id: string) => subjects.find(s => s.id === id);

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  const handleStatusUpdate = (id: string, newStatus: AppointmentStatus) => {
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    if (newStatus === AppointmentStatus.MISSED) {
      const isFuture = isAfter(parseISO(app.date), new Date());
      if (isFuture) {
        alert("You cannot record a 'Missed' status for a future appointment. This status is only for dates that have passed.");
        return;
      }
      setEditingId(id);
      setReasonBuffer(app.followUpReason || '');
    } else if (newStatus === AppointmentStatus.COMPLETED) {
      initCompletionFlow(app);
    } else {
      onUpdateStatus(id, newStatus);
    }
  };

  const initCompletionFlow = (app: Appointment) => {
    setCompletionApp(app);
    setCompletionDate(format(new Date(), 'yyyy-MM-dd'));
    setPostVisitAction(null);
    setIsApproximate(false);
    setNextApptDate('');
    setExitReason('COMPLETED');
    setExitOtherReason('');
    setExitDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleCompletionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionApp) return;

    const compDateObj = parseISO(completionDate);
    const limitDate = startOfDay(subDays(new Date(), 5));
    if (completionApp.status === AppointmentStatus.MISSED && isBefore(compDateObj, limitDate)) {
      alert("Invalid Completion Date. You cannot record corrected visits more than 5 days in the past.");
      return;
    }

    if (!postVisitAction) {
      alert("Please either schedule the next appointment or exit the study.");
      return;
    }

    const originalTime = format(parseISO(completionApp.date), 'HH:mm');
    onUpdateAppointment({
      ...completionApp,
      status: AppointmentStatus.COMPLETED,
      date: new Date(`${completionDate}T${originalTime}`).toISOString(),
      followUpReason: undefined,
      notes: (completionApp.notes || '') + ` [Attended on ${completionDate}${isApproximate ? ' (approx)' : ''}]`
    });

    if (postVisitAction === 'NEXT_APPT') {
      if (!nextApptDate) { alert("Please select a date for the next appointment."); return; }
      onAddAppointment({
        id: crypto.randomUUID(),
        subjectId: completionApp.subjectId,
        date: new Date(`${nextApptDate}T${nextApptTime}`).toISOString(),
        status: AppointmentStatus.SCHEDULED,
        notes: nextApptNotes
      });
    } else {
      const sub = getSubject(completionApp.subjectId);
      if (sub) {
        let finalExitReason = exitReason === 'OTHER' ? `OTHER: ${exitOtherReason}` : exitReason;
        if (exitReason === 'OTHER' && !exitOtherReason.trim()) {
           alert("Please specify the 'Other' reason."); return;
        }
        onSubjectChange('DELETE', sub, `Exit Study: ${finalExitReason} on ${exitDate}${isApproximate ? ' (approx)' : ''}`);
      }
    }

    setCompletionApp(null);
  };

  const saveReason = (id: string) => {
    onUpdateStatus(id, AppointmentStatus.MISSED, reasonBuffer);
    setEditingId(null);
  };

  const openRescheduleModal = (app: Appointment) => {
    setRescheduleApp(app);
    let d = new Date();
    d.setDate(d.getDate() + 1);
    setRescheduleDate(format(d, 'yyyy-MM-dd'));
    setRescheduleTime('10:00');
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleApp || !rescheduleDate || !rescheduleTime) return;
    
    const newIso = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
    const isPast = isBefore(parseISO(newIso), startOfDay(new Date()));
    
    if (isPast) {
      alert("Rescheduling must be to a future date. To record a past visit, please use the 'Correct to Attended' flow.");
      return;
    }

    onUpdateAppointment({
      ...rescheduleApp,
      date: newIso,
      status: AppointmentStatus.SCHEDULED,
      notes: (rescheduleApp.notes || '') + ` [System: Rescheduled from ${new Date(rescheduleApp.date).toLocaleDateString()}]`
    });
    setRescheduleApp(null);
  };

  const MonthGroup = ({ monthKey, apps }: { monthKey: string, apps: Appointment[] }) => {
    const isExpanded = expandedMonths[monthKey] ?? true;
    const displayMonth = format(parseISO(monthKey + '-01'), 'MMMM yyyy');
    return (
      <div key={monthKey} className="relative">
        <div className="sticky top-[84px] lg:top-0 z-10 bg-slate-50 py-2 mb-4 flex items-center gap-4">
          <button onClick={() => toggleMonth(monthKey)} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm hover:bg-slate-50 transition">
             {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
             <span className="font-bold text-slate-700 text-sm">{displayMonth}</span>
             <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{apps.length}</span>
          </button>
          <div className="h-px bg-slate-200 flex-1"></div>
        </div>

        {isExpanded && (
          <div className="ml-6 border-l-2 border-slate-200 space-y-6 pb-6">
            {apps.map((app) => {
              const sub = getSubject(app.subjectId);
              const isMissed = app.status === AppointmentStatus.MISSED;
              const isDone = app.status === AppointmentStatus.COMPLETED;
              const isUpcoming = isAfter(parseISO(app.date), new Date());

              return (
                <div key={app.id} className="relative pl-8 group">
                  <div className={`absolute left-[-9px] top-6 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${isDone ? 'bg-green-500' : isMissed ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                  <div className={`bg-white rounded-lg border shadow-sm p-5 hover:shadow-md transition-all ${isMissed ? 'border-l-4 border-l-red-500' : isDone ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-blue-500'}`}>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-400">{format(parseISO(app.date), 'dd MMM')}</span>
                          <span className="text-xs font-bold text-slate-400 uppercase">{format(parseISO(app.date), 'hh:mm a')}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[app.status].replace('border', '')}`}>{app.status}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                          {sub?.name || 'Unknown'} <span className="text-xs font-normal text-slate-400">({app.subjectId})</span>
                        </h4>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {sub?.phone && <span className="flex items-center gap-1"><Phone size={12}/> {sub.phone}</span>}
                          {app.notes && <span className="flex items-center gap-1 max-w-[200px] truncate" title={app.notes}>Notes: {app.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:border-l md:border-slate-100 md:pl-6">
                        {editingId === app.id ? (
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <input autoFocus value={reasonBuffer} onChange={(e) => setReasonBuffer(e.target.value)} placeholder="Reason for missing..." className="text-xs border border-red-200 bg-red-50 rounded p-2 outline-none"/>
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:bg-slate-100 px-2 py-1 rounded">Cancel</button>
                              <button onClick={() => saveReason(app.id)} className="text-xs bg-red-600 text-white px-3 py-1 rounded">Save</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {(app.status === AppointmentStatus.SCHEDULED || app.status === AppointmentStatus.MISSED) && (
                              <button onClick={() => openRescheduleModal(app)} className="flex flex-col items-center gap-1 text-slate-400 hover:text-indigo-600 p-2 rounded-lg transition" title="Move/Re-schedule to Future"><RefreshCw size={18} /></button>
                            )}
                            {app.status === AppointmentStatus.SCHEDULED && (
                              <>
                                <button onClick={() => handleStatusUpdate(app.id, AppointmentStatus.COMPLETED)} className="flex flex-col items-center gap-1 text-slate-400 hover:text-green-600 p-2 rounded-lg transition" title="Mark as Attended"><CheckCircle2 size={18} /></button>
                                {!isUpcoming && (
                                  <button onClick={() => handleStatusUpdate(app.id, AppointmentStatus.MISSED)} className="flex flex-col items-center gap-1 text-slate-400 hover:text-red-600 p-2 rounded-lg transition" title="Missed"><XCircle size={18} /></button>
                                )}
                              </>
                            )}
                            {isMissed && (
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-[10px] text-slate-400 uppercase font-bold">Reason</p>
                                  <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">{app.followUpReason || 'Auto-miss'}</p>
                                </div>
                                <button 
                                  onClick={() => initCompletionFlow(app)}
                                  className="flex items-center gap-1.5 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition shadow-sm text-xs font-bold"
                                >
                                  <CheckCircle2 size={14}/> Correct to Attended
                                </button>
                              </div>
                            )}
                            {isDone && <CheckCircle2 size={24} className="text-green-500"/>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const TimelineView = () => (
    <div className="space-y-12">
      {/* Current & Future Months */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2">
           <CalendarDays size={20} className="text-indigo-600" />
           <h3 className="font-bold">Active & Upcoming Schedule</h3>
        </div>
        {Object.keys(groupedData.upcoming).length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 italic">No upcoming appointments scheduled.</div>
        ) : (
          Object.keys(groupedData.upcoming)
            .sort((a, b) => a.localeCompare(b))
            .map(key => <MonthGroup key={key} monthKey={key} apps={groupedData.upcoming[key]} />)
        )}
      </div>

      {/* Past Months Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 text-slate-600">
             <History size={20} className="text-slate-400" />
             <h3 className="font-bold">Past History</h3>
          </div>
          <button 
            onClick={() => setShowPastRecords(!showPastRecords)}
            className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-full transition"
          >
            {showPastRecords ? 'Collapse History' : 'Show All Past Records'}
          </button>
        </div>

        {showPastRecords ? (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            {Object.keys(groupedData.past).length === 0 ? (
              <div className="text-center py-10 bg-slate-100/50 rounded-xl border border-dashed border-slate-300 text-slate-400 italic">No historical records found.</div>
            ) : (
              Object.keys(groupedData.past)
                .sort((a, b) => b.localeCompare(a)) // Sort past months reverse chronological
                .map(key => <MonthGroup key={key} monthKey={key} apps={groupedData.past[key]} />)
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs italic">
            Click 'Show All Past Records' to view previous month data.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between gap-4 items-center sticky top-0 z-20">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><CalendarIcon size={24} /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Study Timeline</h2>
            <p className="text-xs text-slate-500">Subject Tracking & Analytics</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg ml-4">
            <button onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'timeline' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><List size={14}/> Timeline</button>
            <button onClick={() => setViewMode('analytics')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'analytics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><PieIcon size={14}/> Insights</button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {monthFilter !== 'ALL' && (
            <div className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold border border-indigo-100 animate-in fade-in zoom-in-95">
              <CalendarDays size={14}/>
              {format(parseISO(monthFilter + '-01'), 'MMMM yyyy')}
              <button onClick={() => setMonthFilter('ALL')} className="hover:text-indigo-900 ml-1">
                <X size={14}/>
              </button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
            <input type="text" placeholder="Search subject..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 w-full sm:w-48 outline-none"/>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer text-slate-600 font-bold">
            <option value="ALL">All Status</option>
            <option value={AppointmentStatus.SCHEDULED}>Scheduled</option>
            <option value={AppointmentStatus.MISSED}>Missed</option>
            <option value={AppointmentStatus.COMPLETED}>Attended</option>
          </select>
          <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition min-w-[120px]"><ArrowUpDown size={14}/> {sortOrder === 'asc' ? 'Earliest' : 'Latest'}</button>
        </div>
      </div>

      {processedData.length === 0 ? <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">No records match your filters.</div> : <>{viewMode === 'timeline' ? <TimelineView /> : <div className="p-20 text-center text-slate-400 italic">Insights view expanded in dashboard.</div>}</>}
      
      {/* Reschedule Modal */}
      {rescheduleApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
              <div><h3 className="text-lg font-bold text-indigo-900">Re-schedule</h3><p className="text-xs text-indigo-700">Must be a future date</p></div>
              <button onClick={() => setRescheduleApp(null)} className="text-indigo-400 hover:text-indigo-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4">
              <div className="bg-amber-50 p-3 rounded border border-amber-200 text-amber-800 text-[10px] font-bold uppercase mb-2">
                <AlertTriangle size={12} className="inline mr-1 mb-1"/> Past dates are restricted for rescheduling
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">New Date</label>
                <input 
                  type="date" 
                  required 
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={rescheduleDate} 
                  onChange={(e) => setRescheduleDate(e.target.value)} 
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">New Time</label>
                <input type="time" required value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="flex flex-col gap-2 mt-4">
                <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded text-sm font-bold shadow-sm">Confirm Reschedule</button>
                <button type="button" onClick={() => setRescheduleApp(null)} className="w-full py-2 text-slate-400 text-xs font-bold hover:bg-slate-50 rounded flex items-center justify-center gap-2">
                  <ArrowLeft size={14}/> Mistake? Go Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE Completion Modal */}
      {completionApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-emerald-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <CalendarCheck size={24} />
                <div>
                  <h3 className="text-lg font-bold">Record Visit Attendance</h3>
                  <p className="text-xs text-emerald-100">Subject: {getSubject(completionApp.subjectId)?.name || completionApp.subjectId}</p>
                </div>
              </div>
              <button onClick={() => setCompletionApp(null)} className="text-emerald-100 hover:text-white transition" title="Go back / Cancel"><X size={24} /></button>
            </div>

            <form onSubmit={handleCompletionSubmit} className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
                <div className="col-span-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Info size={12}/> Subject Details
                </div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">ID</p><p className="text-sm font-bold text-slate-700">{completionApp.subjectId}</p></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">Name</p><p className="text-sm font-bold text-slate-700">{getSubject(completionApp.subjectId)?.name}</p></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-slate-800">Visit Attended On</label>
                   {completionApp.status === AppointmentStatus.MISSED && (
                     <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase">Correction: Max 5 days past</span>
                   )}
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="date" 
                    required 
                    value={completionDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    min={completionApp.status === AppointmentStatus.MISSED ? format(subDays(new Date(), 5), 'yyyy-MM-dd') : undefined}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="flex-1 border p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none border-slate-200 font-medium"
                  />
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-3 rounded-xl border border-slate-200">
                    <input type="checkbox" checked={isApproximate} onChange={(e) => setIsApproximate(e.target.checked)} className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"/>
                    <span className="text-xs font-bold text-slate-600">Approximate?</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <p className="text-sm font-bold text-slate-800">Follow-up Action <span className="text-red-500">*</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPostVisitAction('NEXT_APPT')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${postVisitAction === 'NEXT_APPT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}>
                    <CalendarIcon size={24}/><span className="text-xs font-bold">Schedule Next Visit</span>
                  </button>
                  <button type="button" onClick={() => setPostVisitAction('EXIT')} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition ${postVisitAction === 'EXIT' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'}`}>
                    <LogOut size={24}/><span className="text-xs font-bold">Exit Subject (End Study)</span>
                  </button>
                </div>

                {postVisitAction === 'NEXT_APPT' && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">Visit Date</label>
                        <input type="date" required min={format(new Date(), 'yyyy-MM-dd')} value={nextApptDate} onChange={(e) => setNextApptDate(e.target.value)} className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">Time</label>
                        <input type="time" value={nextApptTime} onChange={(e) => setNextApptTime(e.target.value)} className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">Internal Notes</label>
                      <textarea value={nextApptNotes} onChange={(e) => setNextApptNotes(e.target.value)} placeholder="Monthly follow up notes..." className="w-full border p-2 rounded-lg text-xs min-h-[60px] outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                )}

                {postVisitAction === 'EXIT' && (
                  <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-2 mb-2 items-center text-red-800"><AlertTriangle size={16}/><span className="text-xs font-bold">Subject will be removed from directory</span></div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-red-600 uppercase block">Reason for Exit</label>
                      <select value={exitReason} onChange={(e) => setExitReason(e.target.value as any)} className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-red-500 text-xs font-bold">
                        <option value="REMOVAL">Removal</option>
                        <option value="EXPULSION">Expulsion</option>
                        <option value="COMPLETED">Completed Study</option>
                        <option value="OTHER">Other</option>
                      </select>
                      {exitReason === 'OTHER' && <textarea required value={exitOtherReason} onChange={(e) => setExitOtherReason(e.target.value)} placeholder="Specify reason..." className="w-full border p-2 rounded-lg text-xs min-h-[60px] outline-none focus:ring-2 focus:ring-red-500" />}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-red-600 uppercase mb-1 block">Date of Event</label>
                      <input type="date" required value={exitDate} onChange={(e) => setExitDate(e.target.value)} className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-red-500" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button type="submit" className={`w-full py-4 rounded-xl font-bold shadow-lg transition transform active:scale-[0.98] ${postVisitAction === 'EXIT' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                  Save visit and {postVisitAction === 'EXIT' ? 'Exit Subject' : 'Schedule Next'}
                </button>
                <button type="button" onClick={() => setCompletionApp(null)} className="w-full py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-2 transition">
                  <ArrowLeft size={16} /> Mistake? Go Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentCalendar;