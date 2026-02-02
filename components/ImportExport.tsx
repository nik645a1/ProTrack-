import React, { useState, useMemo } from 'react';
import { Download, FileSpreadsheet, AlertCircle, CheckCircle, Calendar, MapPin, ClipboardList, Send, Trash2, LogOut, Filter, ArrowRight } from 'lucide-react';
import { exportToExcel, exportExitedSubjects } from '../services/excelService';
import { Subject, Appointment, ChangeLogEntry, AppointmentStatus } from '../types';
import { format, parseISO, isValid, isAfter, startOfMonth, endOfMonth, isBefore } from 'date-fns';

interface BulkEntryRow {
  subjectId: string;
  name: string;
  phone: string;
  insertionDate: string; // ISO string
  appointmentDate: string; // ISO string
  remark: string;
  isValid: boolean;
  error?: string;
}

interface Props {
  onImport: (data: Omit<BulkEntryRow, 'isValid' | 'error'>[]) => void;
  subjects: Subject[];
  appointments: Appointment[];
  changeLogs: ChangeLogEntry[];
}

type TabMode = 'EXPORT' | 'BULK_ENTRY';

const ImportExport: React.FC<Props> = ({ subjects, appointments, changeLogs, onImport }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('EXPORT');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  // Bulk Entry State
  const [pastedData, setPastedData] = useState('');
  const [previewData, setPreviewData] = useState<BulkEntryRow[]>([]);

  // Export State
  const [exportStartMonth, setExportStartMonth] = useState('');
  const [exportEndMonth, setExportEndMonth] = useState('');
  const [exportSite, setExportSite] = useState('ALL');
  const [exportType, setExportType] = useState<'ALL' | 'UPCOMING'>('UPCOMING');

  // Compute available months from all appointments to populate selectors
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    appointments.forEach(a => months.add(format(parseISO(a.date), 'yyyy-MM')));
    const sorted = Array.from(months).sort();
    
    // Set default months if not set
    if (sorted.length > 0) {
      if (!exportStartMonth) setExportStartMonth(sorted[0]);
      if (!exportEndMonth) setExportEndMonth(sorted[sorted.length - 1]);
    }
    
    return sorted;
  }, [appointments]);

  /**
   * Dedicated parser for DD/MM/YYYY format
   */
  const parseDDMMYYYY = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.trim().split(/[\/\-]/);
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    
    const fullYear = year < 100 ? 2000 + year : year;
    const date = new Date(fullYear, month, day);
    
    if (date.getFullYear() === fullYear && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
    return null;
  };

  const handleParse = () => {
    if (!pastedData.trim()) return;

    const rows = pastedData.trim().split(/\r?\n/);
    const parsed = rows.map(row => {
      const colData = row.split(/\t/);
      
      const subjectId = colData[0]?.trim() || '';
      const name = colData[1]?.trim() || '';
      const phone = colData[2]?.trim() || '';
      const insertionDateRaw = colData[3]?.trim() || '';
      const apptDateRaw = colData[4]?.trim() || '';
      const remark = colData[5]?.trim() || '';

      const insDateObj = parseDDMMYYYY(insertionDateRaw);
      const apptDateObj = parseDDMMYYYY(apptDateRaw);

      const isValidApptDate = apptDateObj !== null;
      let error = '';
      if (!subjectId) error = 'Missing Subject ID';
      else if (!isValidApptDate) error = 'Invalid Appt Date (Use DD/MM/YYYY)';

      return {
        subjectId,
        name,
        phone,
        insertionDate: insDateObj ? insDateObj.toISOString() : '',
        appointmentDate: apptDateObj ? apptDateObj.toISOString() : '',
        remark,
        isValid: subjectId !== '' && isValidApptDate,
        error
      };
    });

    setPreviewData(parsed);
  };

  const handleCommit = () => {
    const validRows = previewData.filter(d => d.isValid);
    if (validRows.length === 0) {
      setStatus({ type: 'error', msg: 'No valid rows found in preview.' });
      return;
    }

    onImport(validRows.map(({ isValid, error, ...rest }) => rest));
    setStatus({ type: 'success', msg: `Successfully processed ${validRows.length} entries.` });
    setPastedData('');
    setPreviewData([]);
  };

  const handleExport = () => {
    const now = new Date();
    
    const filteredApps = appointments.filter(app => {
      const appDate = parseISO(app.date);
      const appMonthKey = format(appDate, 'yyyy-MM');

      // 1. Upcoming Filter
      if (exportType === 'UPCOMING') {
        const isScheduled = app.status === AppointmentStatus.SCHEDULED;
        const isFuture = isAfter(appDate, now);
        if (!(isScheduled && isFuture)) return false;
      }

      // 2. Monthly Duration Range Filter
      if (exportStartMonth && appMonthKey < exportStartMonth) return false;
      if (exportEndMonth && appMonthKey > exportEndMonth) return false;

      // 3. Site Filter (Prefix based)
      if (exportSite !== 'ALL') {
        const idPrefix = app.subjectId.trim().charAt(0).toUpperCase();
        if (exportSite === 'AIIMS' && idPrefix !== 'A') return false;
        if (exportSite === 'SJH' && idPrefix !== 'S') return false;
        if (exportSite === 'MEERUT' && idPrefix !== 'M') return false;
      }
      return true;
    });

    if (filteredApps.length === 0) {
      setStatus({ type: 'error', msg: 'No records found for the selected duration and filters.' });
      return;
    }

    const durationLabel = exportStartMonth === exportEndMonth 
      ? exportStartMonth 
      : `${exportStartMonth}_to_${exportEndMonth}`;
      
    const filename = `ProTrack_${exportType}_${exportSite}_${durationLabel}.xlsx`;
    exportToExcel(subjects, filteredApps, filename);
    setStatus({ type: 'success', msg: `Exported ${filteredApps.length} records successfully.` });
  };

  const handleExportExited = () => {
    const exitedCount = changeLogs.filter(l => l.changeType === 'DELETE').length;
    if (exitedCount === 0) {
      setStatus({ type: 'error', msg: 'No exited subjects found in system logs.' });
      return;
    }
    exportExitedSubjects(changeLogs);
    setStatus({ type: 'success', msg: `Exported ${exitedCount} exited subject records.` });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
        <button 
          onClick={() => setActiveTab('BULK_ENTRY')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'BULK_ENTRY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <ClipboardList size={18}/> Bulk Data Entry
        </button>
        <button 
          onClick={() => setActiveTab('EXPORT')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition ${
            activeTab === 'EXPORT' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Download size={18}/> Export Reports
        </button>
      </div>

      {activeTab === 'BULK_ENTRY' ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Bulk Entry (DD/MM/YYYY)</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Paste from Excel. Order: <span className="font-bold text-indigo-600">Subject ID | Name | Mobile | Date of Insertion | Appointment Date | Remark</span>
            </p>
            <textarea 
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              placeholder="A001	Alice Freeman	9876543210	15/05/2024	20/05/2026	Follow up"
              className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setPastedData(''); setPreviewData([]); }} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-bold flex items-center gap-2"><Trash2 size={16}/> Clear</button>
              <button onClick={handleParse} disabled={!pastedData.trim()} className="bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition disabled:opacity-50">Preview Rows</button>
            </div>
          </div>

          {previewData.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-slate-800">Parsed Preview ({previewData.filter(d => d.isValid).length} valid)</h4>
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="px-3 py-2">Subject ID</th>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Appt Date</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {previewData.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'bg-white' : 'bg-red-50'}>
                        <td className="px-3 py-2 font-mono font-bold">{row.subjectId || '-'}</td>
                        <td className="px-3 py-2">{row.name || '-'}</td>
                        <td className="px-3 py-2 font-semibold">
                          {row.isValid ? format(parseISO(row.appointmentDate), 'dd/MM/yyyy') : 'Error'}
                        </td>
                        <td className="px-3 py-2 text-center">{row.isValid ? 'READY' : 'ERR'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={handleCommit} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg active:scale-[0.98]">
                <Send size={18}/> Commit to Directory
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          {/* Calendar Report Export */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-emerald-600"/> Monthly Calendar Export
              </h3>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setExportType('UPCOMING')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${exportType === 'UPCOMING' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Upcoming Only</button>
                <button onClick={() => setExportType('ALL')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${exportType === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>All History</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Site Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2"><MapPin size={12}/> Site</label>
                <select value={exportSite} onChange={(e) => setExportSite(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg p-3 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="ALL">All Study Sites</option>
                  <option value="AIIMS">AIIMS (Prefix A)</option>
                  <option value="SJH">SJH (Prefix S)</option>
                  <option value="MEERUT">Meerut (Prefix M)</option>
                </select>
              </div>

              {/* Start Month */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2"><Calendar size={12}/> Duration From</label>
                <select value={exportStartMonth} onChange={(e) => setExportStartMonth(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg p-3 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none">
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{format(parseISO(m + '-01'), 'MMMM yyyy')}</option>
                  ))}
                </select>
              </div>

              {/* End Month */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2"><Calendar size={12}/> Duration To</label>
                <select value={exportEndMonth} onChange={(e) => setExportEndMonth(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg p-3 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none">
                  {availableMonths.map(m => (
                    <option key={m} value={m} disabled={m < exportStartMonth}>{format(parseISO(m + '-01'), 'MMMM yyyy')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 flex items-start gap-3">
               <AlertCircle size={16} className="text-indigo-600 mt-0.5 shrink-0"/>
               <div className="text-xs text-indigo-700 space-y-1">
                  <p className="font-bold">Export Summary:</p>
                  <p>Target: <span className="font-bold">{exportType === 'UPCOMING' ? 'Upcoming Schedule' : 'Complete History'}</span></p>
                  <p>Site: <span className="font-bold">{exportSite === 'ALL' ? 'All Sites' : exportSite}</span></p>
                  <p>Duration: <span className="font-bold">{exportStartMonth ? format(parseISO(exportStartMonth + '-01'), 'MMMM yyyy') : '...'}</span> to <span className="font-bold">{exportEndMonth ? format(parseISO(exportEndMonth + '-01'), 'MMMM yyyy') : '...'}</span></p>
               </div>
            </div>

            <button 
              onClick={handleExport}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-lg active:scale-[0.99]"
            >
              <Download size={20}/> Download Selected Duration
            </button>
          </div>

          {/* Exited Subjects Report */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <LogOut size={20} className="text-red-600"/> Exited Subjects Report
             </h3>
             <p className="text-sm text-slate-500">
                Download a list of all subjects who have permanently exited the study, including specific exit reasons and dates.
             </p>
             <button onClick={handleExportExited} className="w-full bg-red-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition shadow-lg">
                <Download size={20}/> Download Exited Subjects List
              </button>
          </div>
        </div>
      )}

      {status && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
          <span className="font-bold">{status.msg}</span>
        </div>
      )}
    </div>
  );
};

export default ImportExport;