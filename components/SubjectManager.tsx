import React, { useState, useMemo } from 'react';
import { Subject, Appointment, ChangeType, AppointmentStatus } from '../types';
import { Search, Plus, User, Phone, Pencil, Trash2, X, AlertTriangle, Calendar, Clock, FileText, ArrowUpDown, Info, LogOut, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  subjects: Subject[];
  appointments: Appointment[];
  onAddAppointment: (a: Appointment) => void;
  onSubjectChange: (type: ChangeType, subject: Subject, comment: string) => void;
}

type ModalMode = 'CREATE' | 'EDIT' | 'DELETE' | null;
type SortKey = 'id' | 'name' | 'A' | 'S' | 'M';

const SubjectManager: React.FC<Props> = ({ subjects, appointments, onAddAppointment, onSubjectChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sorting State
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Subject Management Modal State
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<Partial<Subject>>({});
  const [comment, setComment] = useState('');

  // Exit Study Specific State
  const [exitReason, setExitReason] = useState<'REMOVAL' | 'EXPULSION' | 'COMPLETED' | 'OTHER'>('COMPLETED');
  const [exitOtherReason, setExitOtherReason] = useState('');
  const [exitDate, setExitDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exitApproximate, setExitApproximate] = useState(false);

  // Appointment Booking Modal State
  const [bookingSubject, setBookingSubject] = useState<Subject | null>(null);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('09:00');
  const [bookNotes, setBookNotes] = useState('');

  // Compute stats for segregation and filtering
  const processedSubjects = useMemo(() => {
    const filtered = subjects.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const withStats = filtered.map(sub => {
      const subApps = appointments.filter(a => a.subjectId === sub.id);
      return {
        ...sub,
        stats: {
          A: subApps.filter(a => a.status === AppointmentStatus.COMPLETED).length,
          S: subApps.filter(a => a.status === AppointmentStatus.SCHEDULED).length,
          M: subApps.filter(a => a.status === AppointmentStatus.MISSED).length,
          Total: subApps.length
        }
      };
    });

    return withStats.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortKey === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortKey === 'id') {
        valA = a.id.toLowerCase();
        valB = b.id.toLowerCase();
      } else {
        valA = (a.stats as any)[sortKey];
        valB = (b.stats as any)[sortKey];
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  }, [subjects, appointments, searchTerm, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className={`inline-block ml-1 ${sortKey === col ? 'text-indigo-600' : 'text-slate-300'}`}>
      <ArrowUpDown size={12} />
    </span>
  );

  const openCreateModal = () => {
    setModalMode('CREATE');
    setSelectedSubject(null);
    setFormData({ id: '', name: '', phone: '', altPhone: '' });
    setComment('');
  };

  const openEditModal = (sub: Subject) => {
    setModalMode('EDIT');
    setSelectedSubject(sub);
    setFormData({ ...sub });
    setComment('');
  };

  const openDeleteModal = (sub: Subject) => {
    setModalMode('DELETE');
    setSelectedSubject(sub);
    setComment('');
    setExitReason('COMPLETED');
    setExitOtherReason('');
    setExitDate(format(new Date(), 'yyyy-MM-dd'));
    setExitApproximate(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (modalMode === 'CREATE') {
      if (!comment.trim()) { alert("Please provide a comment."); return; }
      if (formData.id && formData.name) {
        onSubjectChange('CREATE', {
          id: formData.id,
          name: formData.name,
          phone: formData.phone,
          altPhone: formData.altPhone,
          insertionDate: new Date().toISOString(),
          notes: 'Manually added'
        }, comment);
      }
    } else if (modalMode === 'EDIT' && selectedSubject) {
      if (!comment.trim()) { alert("Please provide a comment."); return; }
      onSubjectChange('UPDATE', {
        ...selectedSubject,
        ...formData
      } as Subject, comment);
    } else if (modalMode === 'DELETE' && selectedSubject) {
      let finalReason = exitReason === 'OTHER' ? `OTHER: ${exitOtherReason}` : exitReason;
      if (exitReason === 'OTHER' && !exitOtherReason.trim()) {
        alert("Please specify the 'Other' reason.");
        return;
      }
      const exitNote = `Exit Study: ${finalReason} on ${exitDate}${exitApproximate ? ' (approx)' : ''}`;
      onSubjectChange('DELETE', selectedSubject, exitNote);
    }

    setModalMode(null);
  };

  const openBookingModal = (sub: Subject) => {
    setBookingSubject(sub);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookDate(tomorrow.toISOString().split('T')[0]);
    setBookTime('10:00');
    setBookNotes('');
  };

  const handleBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSubject || !bookDate || !bookTime) return;
    const isoDateTime = new Date(`${bookDate}T${bookTime}`).toISOString();
    onAddAppointment({
      id: crypto.randomUUID(),
      subjectId: bookingSubject.id,
      date: isoDateTime,
      status: AppointmentStatus.SCHEDULED,
      notes: bookNotes
    });
    setBookingSubject(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <User className="text-indigo-600"/> Subject Directory
        </h2>
        <button 
          onClick={openCreateModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16}/> New Subject
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18}/>
        <input 
          type="text" 
          placeholder="Search by ID or Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('id')}>
                  ID <SortIcon col="id"/>
                </th>
                <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>
                  Name <SortIcon col="name"/>
                </th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('A')} title="Attended / Completed">
                  <span className="text-green-600 font-bold">A</span> <SortIcon col="A"/>
                </th>
                <th className="px-6 py-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('S')} title="Scheduled / Upcoming">
                  <span className="text-blue-600 font-bold">S</span> <SortIcon col="S"/>
                </th>
                <th className="px-6 py-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('M')} title="Missed">
                  <span className="text-red-600 font-bold">M</span> <SortIcon col="M"/>
                </th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {processedSubjects.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-50/50 group">
                  <td className="px-6 py-4 font-mono text-slate-500">{sub.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{sub.name}</td>
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-slate-400"/>
                      <span>{sub.phone || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {sub.stats.A > 0 ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">{sub.stats.A}</span> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {sub.stats.S > 0 ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{sub.stats.S}</span> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {sub.stats.M > 0 ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">{sub.stats.M}</span> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button onClick={() => openBookingModal(sub)} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-100 font-medium flex items-center gap-1"><Calendar size={12} /> Book</button>
                      <button onClick={() => openEditModal(sub)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"><Pencil size={16} /></button>
                      <button onClick={() => openDeleteModal(sub)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition" title="Exit Study"><LogOut size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {processedSubjects.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No subjects found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Management */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`px-6 py-4 border-b flex justify-between items-center ${modalMode === 'DELETE' ? 'bg-red-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`}>
              <div className="flex items-center gap-3">
                {modalMode === 'DELETE' ? <LogOut size={20}/> : <Plus size={20}/>}
                <h3 className="text-lg font-bold">
                  {modalMode === 'CREATE' ? 'Add New Subject' : modalMode === 'EDIT' ? 'Edit Details' : 'Exit Study Flow'}
                </h3>
              </div>
              <button onClick={() => setModalMode(null)} className={`${modalMode === 'DELETE' ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalMode === 'DELETE' ? (
                <div className="space-y-4">
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-800 space-y-2">
                    <div className="flex items-center gap-2 font-bold"><AlertTriangle size={16}/> Warning</div>
                    <p className="text-xs leading-relaxed">You are exiting <strong>{selectedSubject?.name}</strong> from the study. This subject will be removed from the directory and excluded from dashboard totals.</p>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase block">Reason for Exit <span className="text-red-500">*</span></label>
                    <select value={exitReason} onChange={e => setExitReason(e.target.value as any)} className="w-full border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-red-500 text-sm font-bold">
                      <option value="REMOVAL">Removal</option>
                      <option value="EXPULSION">Expulsion</option>
                      <option value="COMPLETED">Completed Study</option>
                      <option value="OTHER">Other</option>
                    </select>
                    {exitReason === 'OTHER' && (
                      <textarea required value={exitOtherReason} onChange={e => setExitOtherReason(e.target.value)} placeholder="Compulsory: Specify reason..." className="w-full border p-2 rounded-lg text-xs min-h-[60px] outline-none focus:ring-2 focus:ring-red-500" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase block">Date of Event</label>
                    <div className="flex items-center gap-3">
                      <input type="date" required value={exitDate} onChange={e => setExitDate(e.target.value)} className="flex-1 border p-2 rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                        <input type="checkbox" checked={exitApproximate} onChange={e => setExitApproximate(e.target.checked)} className="w-4 h-4 rounded text-red-600 focus:ring-red-500" />
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Approx?</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-lg text-sm font-bold shadow-lg transition transform active:scale-[0.98] hover:bg-red-700">
                      Confirm Exit Subject
                    </button>
                    <button type="button" onClick={() => setModalMode(null)} className="w-full py-2.5 text-slate-500 font-bold text-xs hover:bg-slate-50 rounded-lg flex items-center justify-center gap-2">
                      <ArrowLeft size={14}/> Mistake? Go Back
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject ID {modalMode === 'EDIT' && '(Read-only)'}</label>
                    <input required disabled={modalMode === 'EDIT'} value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                    <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile</label>
                      <input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alt Mobile</label>
                      <input value={formData.altPhone || ''} onChange={e => setFormData({...formData, altPhone: e.target.value})} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Change Comment (Required)</label>
                    <textarea required placeholder="Reason for changes..." value={comment} onChange={e => setComment(e.target.value)} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px] text-sm" />
                  </div>
                  
                  <div className="flex gap-3 justify-end mt-4">
                    <button type="button" onClick={() => setModalMode(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium transition">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-lg transition transform active:scale-[0.98] hover:bg-indigo-700">
                      {modalMode === 'CREATE' ? 'Create Subject' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {bookingSubject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Calendar size={20}/>
                <div>
                  <h3 className="text-lg font-bold">Schedule Appointment</h3>
                  <p className="text-xs text-indigo-100">{bookingSubject.name} ({bookingSubject.id})</p>
                </div>
              </div>
              <button onClick={() => setBookingSubject(null)} className="text-indigo-100 hover:text-white transition" title="Go back"><X size={20} /></button>
            </div>

            <form onSubmit={handleBookSubmit} className="p-6 space-y-6">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 grid grid-cols-2 gap-4">
                <div className="col-span-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Info size={12}/> Confirming Details</div>
                <div><p className="text-[10px] font-bold text-indigo-400 uppercase">ID</p><p className="text-sm font-bold text-indigo-900">{bookingSubject.id}</p></div>
                <div><p className="text-[10px] font-bold text-indigo-400 uppercase">Contact</p><p className="text-sm font-bold text-indigo-900">{bookingSubject.phone || 'N/A'}</p></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                  <input type="date" required value={bookDate} onChange={e => setBookDate(e.target.value)} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
                  <input type="time" required value={bookTime} onChange={e => setBookTime(e.target.value)} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                <textarea value={bookNotes} onChange={e => setBookNotes(e.target.value)} placeholder="Visit specific notes..." className="w-full border p-2 rounded-lg text-sm min-h-[80px] outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="flex flex-col gap-3">
                <button type="submit" className="w-full px-6 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-2 transition transform active:scale-[0.98]">
                  <Calendar size={16}/> Confirm Booking
                </button>
                <button type="button" onClick={() => setBookingSubject(null)} className="w-full py-2 text-slate-400 font-bold text-xs hover:bg-slate-50 rounded flex items-center justify-center gap-2">
                   <ArrowLeft size={14}/> Mistake? Go Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManager;