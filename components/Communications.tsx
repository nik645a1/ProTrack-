import React, { useState } from 'react';
import { Subject, Appointment, AppointmentStatus } from '../types';
import { Mail, MessageCircle, Sparkles, AlertCircle, Phone } from 'lucide-react';
import { DEFAULT_REMINDER_TEMPLATE } from '../constants';
import { generateFollowUpMessage } from '../services/geminiService';

interface Props {
  subjects: Subject[];
  appointments: Appointment[];
}

const Communications: React.FC<Props> = ({ subjects, appointments }) => {
  const [generatedMsg, setGeneratedMsg] = useState<{ id: string, text: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Get subjects needing attention
  const today = new Date();
  
  // 1. Upcoming in next 7 days
  const upcoming = appointments.filter(a => {
    const d = new Date(a.date);
    const diff = (d.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 7 && a.status === AppointmentStatus.SCHEDULED;
  });

  // 2. Missed recently (last 30 days) with no follow up notes
  const missed = appointments.filter(a => {
    const d = new Date(a.date);
    const diff = (today.getTime() - d.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 30 && a.status === AppointmentStatus.MISSED;
  });

  const getSubject = (id: string) => subjects.find(s => s.id === id);

  const handleGenerateDraft = async (app: Appointment) => {
    setLoadingId(app.id);
    const sub = getSubject(app.subjectId);
    if (sub) {
      const msg = await generateFollowUpMessage(sub, app);
      setGeneratedMsg({ id: app.id, text: msg });
    }
    setLoadingId(null);
  };

  const openWhatsApp = (phone: string, text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encoded}`, '_blank');
  };

  const openMail = (email: string, text: string) => {
    const encoded = encodeURIComponent(text);
    window.location.href = `mailto:${email}?subject=Appointment Follow Up&body=${encoded}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Communication Center</h2>
          <p className="text-green-50">Manage monthly reminders and follow-ups effectively.</p>
        </div>
        <MessageCircle className="absolute right-8 top-1/2 transform -translate-y-1/2 text-white opacity-10 w-32 h-32" />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Upcoming Reminders */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Phone className="text-blue-500" size={20}/>
            Weekly Reminders
          </h3>
          <p className="text-slate-500 text-sm mb-6">Subjects with appointments in the next 7 days.</p>

          <div className="space-y-4">
            {upcoming.length === 0 && <p className="text-slate-400 italic text-sm">No upcoming appointments this week.</p>}
            {upcoming.map(app => {
              const sub = getSubject(app.subjectId);
              if (!sub) return null;
              
              const defaultMsg = DEFAULT_REMINDER_TEMPLATE
                .replace('{name}', sub.name)
                .replace('{date}', new Date(app.date).toLocaleDateString());

              return (
                <div key={app.id} className="p-4 rounded-lg border border-slate-100 hover:border-blue-200 transition bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-800">{sub.name}</h4>
                      <p className="text-xs text-slate-500">{new Date(app.date).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-2">
                    {sub.phone && (
                      <button 
                        onClick={() => openWhatsApp(sub.phone!, defaultMsg)} 
                        className="text-xs flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-100 transition border border-green-200"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                    )}
                    {sub.altPhone && (
                      <button 
                        onClick={() => openWhatsApp(sub.altPhone!, defaultMsg)} 
                        className="text-xs flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-100 transition border border-green-200"
                      >
                        <MessageCircle size={14} /> Alt WA
                      </button>
                    )}
                    {sub.email && (
                      <button 
                        onClick={() => openMail(sub.email!, defaultMsg)}
                        className="text-xs flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-full text-slate-600 hover:bg-slate-50"
                      >
                        <Mail size={14}/> Email
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Missed / Follow Ups */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="text-amber-500" size={20}/>
            Missed Follow-Ups
          </h3>
          <p className="text-slate-500 text-sm mb-6">Recent missed appointments needing re-scheduling.</p>

          <div className="space-y-4">
            {missed.length === 0 && <p className="text-slate-400 italic text-sm">No pending follow-ups.</p>}
            {missed.map(app => {
               const sub = getSubject(app.subjectId);
               if (!sub) return null;
               
               return (
                <div key={app.id} className="p-4 rounded-lg border border-slate-100 hover:border-amber-200 transition bg-slate-50/50">
                  <div className="flex justify-between items-start mb-3">
                     <div>
                        <h4 className="font-semibold text-slate-800">{sub.name}</h4>
                        <p className="text-xs text-red-500 font-medium">Missed on: {new Date(app.date).toLocaleDateString()}</p>
                        {app.followUpReason && <p className="text-xs text-slate-500 mt-1">Reason: {app.followUpReason}</p>}
                     </div>
                  </div>

                  {/* AI Drafting Area */}
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                        <Sparkles size={12}/> AI Assistant
                      </span>
                      <button 
                        onClick={() => handleGenerateDraft(app)}
                        disabled={loadingId === app.id}
                        className="text-xs text-indigo-600 hover:text-indigo-800 underline disabled:opacity-50"
                      >
                        {loadingId === app.id ? 'Drafting...' : 'Draft Message'}
                      </button>
                    </div>
                    
                    {generatedMsg?.id === app.id ? (
                      <div>
                        <textarea 
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded mb-2 h-20 focus:outline-none focus:border-indigo-300"
                          value={generatedMsg.text}
                          onChange={(e) => setGeneratedMsg({ ...generatedMsg, text: e.target.value })}
                        />
                        <div className="flex gap-2 justify-end">
                           {sub.phone && <button onClick={() => openWhatsApp(sub.phone!, generatedMsg.text)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">WA</button>}
                           {sub.altPhone && <button onClick={() => openWhatsApp(sub.altPhone!, generatedMsg.text)} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Alt WA</button>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Click 'Draft Message' to generate a polite follow-up.</p>
                    )}
                  </div>
                </div>
               );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Communications;
