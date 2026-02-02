import React, { useState, useMemo } from 'react';
import { ChangeLogEntry } from '../types';
import { History, FileClock, Filter, Trash2, List } from 'lucide-react';

interface Props {
  logs: ChangeLogEntry[];
}

const ChangeLog: React.FC<Props> = ({ logs }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'DELETE'>('ALL');

  // Filter and Sort logs by timestamp descending
  const filteredLogs = useMemo(() => {
    let list = [...logs];
    if (filterType === 'DELETE') {
      list = list.filter(l => l.changeType === 'DELETE');
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, filterType]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <History className="text-orange-600" />
              System Change Log
            </h2>
            <p className="text-slate-500 text-sm">
              A permanent, read-only record of all modifications to subject data.
            </p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={() => setFilterType('ALL')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition flex items-center gap-2 ${
                filterType === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={14}/> All Changes
            </button>
            <button 
              onClick={() => setFilterType('DELETE')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition flex items-center gap-2 ${
                filterType === 'DELETE' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Trash2 size={14}/> Exited Subjects
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Subject</th>
                <th className="px-6 py-3">Technical Details</th>
                <th className="px-6 py-3">Exit Reason / Comment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 flex flex-col items-center justify-center">
                    <FileClock size={32} className="mb-2 opacity-50"/>
                    No logs match your filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap font-mono text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        log.changeType === 'CREATE' ? 'bg-green-100 text-green-700' :
                        log.changeType === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {log.changeType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{log.subjectName}</div>
                      <div className="text-xs text-slate-400">{log.subjectId}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className={`px-6 py-4 italic border-l-2 pl-4 ${log.changeType === 'DELETE' ? 'bg-red-50 text-red-700 border-red-100 font-medium' : 'bg-slate-50/30 text-slate-700 border-slate-100'}`}>
                      "{log.comment}"
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ChangeLog;