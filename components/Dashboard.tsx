import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Appointment, AppointmentStatus, Subject, ViewState } from '../types';
import { BrainCircuit, TrendingUp, Users, CalendarCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import { analyzeAttendanceTrends } from '../services/geminiService';
import { format, parseISO } from 'date-fns';

interface Props {
  subjects: Subject[];
  appointments: Appointment[];
  onNavigate: (view: ViewState, statusFilter?: AppointmentStatus | 'ALL', monthFilter?: string) => void;
}

const Dashboard: React.FC<Props> = ({ subjects, appointments, onNavigate }) => {
  const [insight, setInsight] = useState<string>('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Filter appointments to only include those belonging to currently active subjects
  const activeSubjectIds = new Set(subjects.map(s => s.id));
  const filteredAppointments = appointments.filter(a => activeSubjectIds.has(a.subjectId));

  // KPIs based on filtered appointments
  const totalSubjects = subjects.length;
  const upcomingAppointments = filteredAppointments.filter(a => new Date(a.date) > new Date() && a.status === AppointmentStatus.SCHEDULED).length;
  const missedAppointments = filteredAppointments.filter(a => a.status === AppointmentStatus.MISSED).length;
  const completedAppointments = filteredAppointments.filter(a => a.status === AppointmentStatus.COMPLETED).length;

  // Chart Data: Status Distribution
  const statusData = [
    { name: 'Completed', value: completedAppointments, color: '#22c55e' },
    { name: 'Missed', value: missedAppointments, color: '#ef4444' },
    { name: 'Scheduled', value: upcomingAppointments, color: '#3b82f6' },
  ];

  // Chart Data: Monthly Volume
  const getMonthlyData = () => {
    const counts: Record<string, { count: number, monthKey: string }> = {};
    filteredAppointments.forEach(app => {
      const dateObj = parseISO(app.date);
      const label = format(dateObj, 'MMM yyyy');
      const monthKey = format(dateObj, 'yyyy-MM');
      if (!counts[label]) {
        counts[label] = { count: 0, monthKey };
      }
      counts[label].count += 1;
    });

    // Sort by chronological order
    return Object.entries(counts)
      .map(([name, data]) => ({ name, appointments: data.count, monthKey: data.monthKey }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  };
  const monthlyData = getMonthlyData();

  const handleAnalyze = async () => {
    setLoadingInsight(true);
    const result = await analyzeAttendanceTrends(filteredAppointments);
    setInsight(result);
    setLoadingInsight(false);
  };

  // Custom Tick Component to simulate a hyperlink
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const dataPoint = monthlyData.find(d => d.name === payload.value);
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill="#4f46e5"
          className="text-[10px] font-bold cursor-pointer hover:underline hover:fill-indigo-800"
          onClick={() => {
             if (dataPoint) {
               onNavigate('calendar', 'ALL', dataPoint.monthKey);
             }
          }}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard 
          icon={<Users className="text-purple-600" />} 
          title="Total Subjects" 
          value={totalSubjects} 
          onClick={() => onNavigate('subjects')}
        />
        <KpiCard 
          icon={<CalendarCheck className="text-blue-600" />} 
          title="Upcoming" 
          value={upcomingAppointments} 
          onClick={() => onNavigate('calendar', AppointmentStatus.SCHEDULED)}
        />
        <KpiCard 
          icon={<TrendingUp className="text-green-600" />} 
          title="Completed" 
          value={completedAppointments} 
          onClick={() => onNavigate('calendar', AppointmentStatus.COMPLETED)}
        />
        <KpiCard 
          icon={<AlertTriangle className="text-red-600" />} 
          title="Missed" 
          value={missedAppointments} 
          onClick={() => onNavigate('calendar', AppointmentStatus.MISSED)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Monthly Activity</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
              Click label to view schedule
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={<CustomXAxisTick />}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="appointments" 
                  fill="#4f46e5" 
                  radius={[6, 6, 0, 0]} 
                  onClick={(data) => {
                    onNavigate('calendar', 'ALL', data.monthKey);
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insight Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white p-2 rounded-full shadow-sm">
              <BrainCircuit className="text-indigo-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-indigo-900">AI Intelligent Analysis</h3>
              <p className="text-indigo-700 text-sm">Get insights on your appointment adherence.</p>
            </div>
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={loadingInsight}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loadingInsight ? 'Analyzing...' : 'Analyze Now'}
          </button>
        </div>
        
        {insight && (
          <div className="mt-4 p-4 bg-white/80 rounded-lg border border-indigo-100 text-indigo-900 leading-relaxed animate-in fade-in slide-in-from-bottom-2">
            {insight}
          </div>
        )}
      </div>
    </div>
  );
};

const KpiCard = ({ icon, title, value, onClick }: { icon: React.ReactNode, title: string, value: number, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col group hover:shadow-md hover:border-indigo-300 transition-all text-left w-full"
  >
    <div className="flex items-center justify-between w-full mb-3">
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      </div>
      <div className="bg-slate-50 p-3 rounded-full group-hover:bg-indigo-50 transition-colors">
        {icon}
      </div>
    </div>
    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider mt-auto pt-2 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
      View Details <ArrowRight size={10} />
    </div>
  </button>
);

export default Dashboard;