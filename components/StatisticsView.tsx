
import React, { useMemo, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { format, startOfDay, eachDayOfInterval, subDays, startOfWeek, startOfMonth, startOfYear, isSameDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Zap, Calendar, Star, TrendingUp, Sparkles, BrainCircuit, Loader2, ChevronDown } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

type TimePeriod = 'week' | 'month' | 'year';

const StatisticsView: React.FC = () => {
  const { theme, activeProfileId, profiles, sessions, tasks, materials, subjects, exams, examTopics } = useAppStore();
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [showHistorial, setShowHistorial] = useState(false);
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  // Función para obtener el rango de fechas según el período
  const getDateRange = (period: TimePeriod) => {
    const now = new Date();
    let start: Date;
    
    switch (period) {
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        break;
    }
    
    return { start, end: now };
  };

  const dateRange = getDateRange(timePeriod);
  
  const profileSessions = useMemo(() => 
    sessions.filter(s => {
      if (s.profile_id !== activeProfileId || s.status !== 'completed') return false;
      const sessionDate = new Date(s.completed_at || s.started_at);
      return isWithinInterval(sessionDate, dateRange);
    }),
    [sessions, activeProfileId, dateRange]
  );

  // Función para obtener el nombre del item estudiado
  const getItemName = (session: any) => {
    if (session.task_id) {
      return tasks.find(t => t.id === session.task_id)?.title || 'Tarea sin nombre';
    } else if (session.exam_topic_id) {
      const topic = examTopics.find(et => et.id === session.exam_topic_id);
      const exam = exams.find(e => e.id === topic?.exam_id);
      return `${exam?.title} - ${topic?.topic_name}` || 'Tema de examen';
    } else if (session.material_id) {
      return materials.find(m => m.id === session.material_id)?.title || 'Material sin nombre';
    }
    return 'Estudio General';
  };

  // Función para obtener la materia del item
  const getSubjectName = (session: any) => {
    if (session.task_id) {
      const task = tasks.find(t => t.id === session.task_id);
      const subject = subjects.find(s => s.id === task?.subject_id);
      return subject?.name || 'Sin materia';
    } else if (session.exam_topic_id) {
      const topic = examTopics.find(et => et.id === session.exam_topic_id);
      const exam = exams.find(e => e.id === topic?.exam_id);
      const subject = subjects.find(s => s.id === exam?.subject_id);
      return subject?.name || 'Sin materia';
    } else if (session.material_id) {
      const material = materials.find(m => m.id === session.material_id);
      const subject = subjects.find(s => s.id === material?.subject_id);
      return subject?.name || 'Sin materia';
    }
    return 'General';
  };

  const stats = useMemo(() => {
    const totalMinutes = profileSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
    const avgFocus = profileSessions.length ? profileSessions.reduce((acc, s) => acc + (s.rating || 0), 0) / profileSessions.length : 0;
    const activeDays = new Set(profileSessions.map(s => startOfDay(new Date(s.completed_at || s.started_at)).toISOString())).size;

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      totalMinutes: totalMinutes,
      totalPomodoros: profileSessions.length,
      activeDays,
      avgFocus: avgFocus.toFixed(1)
    };
  }, [profileSessions]);

  const generateAiInsight = async () => {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      setAiInsight("Por favor, configura la variable 'API_KEY' en Vercel para activar el análisis inteligente.");
      return;
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const topItems = (Object.entries(
        profileSessions.reduce((acc: Record<string, number>, s) => {
          const name = getItemName(s);
          if (name) acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(i => i[0]).join(", ");

      const periodText = timePeriod === 'week' ? 'esta semana' : timePeriod === 'month' ? 'este mes' : 'este año';

      const prompt = `Actúa como un mentor de productividad de élite. Analiza este perfil académico ${periodText}:
      - Usuario: ${activeProfile?.user_name} (${activeProfile?.type})
      - Género: ${activeProfile?.gender}
      - Horas trabajadas: ${stats.totalHours}h en ${stats.totalPomodoros} sesiones.
      - Enfoque promedio: ${stats.avgFocus}/5.
      - Temas principales: ${topItems || "Varios"}.

      Instrucciones:
      1. Da un diagnóstico de su estado actual.
      2. Proporciona un consejo accionable basado en sus datos.
      3. Mantén un tono motivador pero firme, adecuado a su género (${activeProfile?.gender}).
      Máximo 60 palabras.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiInsight(response.text || "Tu rendimiento es sólido, sigue así.");
    } catch (error) {
      console.error("AI Error:", error);
      setAiInsight("Error al procesar el análisis. Verifica que tu API_KEY sea válida y tengas cuota disponible.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Datos diarios según el período
  const dailyData = useMemo(() => {
    let days: Date[] = [];
    
    if (timePeriod === 'week') {
      days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date()
      });
    } else if (timePeriod === 'month') {
      days = eachDayOfInterval({
        start: subDays(new Date(), 29),
        end: new Date()
      });
    } else {
      // Para año, mostrar por meses
      days = eachDayOfInterval({
        start: subDays(new Date(), 364),
        end: new Date()
      });
    }

    return days.map(day => {
      const daySessions = profileSessions.filter(s => isSameDay(new Date(s.completed_at || s.started_at), day));
      const hours = daySessions.reduce((acc, s) => acc + ((s.duration_minutes || 0) / 60), 0);
      return {
        date: timePeriod === 'week' ? format(day, 'eee', { locale: es }) : format(day, 'dd/MM', { locale: es }),
        hours: parseFloat(hours.toFixed(1))
      };
    });
  }, [profileSessions, timePeriod]);

  // Desglose por materia
  const subjectData = useMemo(() => {
    const subjects_map: Record<string, number> = {};
    profileSessions.forEach(s => {
      const subject = getSubjectName(s);
      subjects_map[subject] = (subjects_map[subject] || 0) + ((s.duration_minutes || 0) / 60);
    });
    return Object.entries(subjects_map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(1)) }))
      .sort((a, b) => b.value - a.value);
  }, [profileSessions]);

  // Desglose por item (tarea, tema, material)
  const itemData = useMemo(() => {
    const items_map: Record<string, number> = {};
    profileSessions.forEach(s => {
      const item = getItemName(s);
      items_map[item] = (items_map[item] || 0) + ((s.duration_minutes || 0) / 60);
    });
    return Object.entries(items_map)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(1)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [profileSessions]);

  // Historial detallado
  const historialDetallado = useMemo(() => {
    return profileSessions
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .map(session => ({
        ...session,
        itemName: getItemName(session),
        subjectName: getSubjectName(session),
        date: format(new Date(session.started_at), 'dd/MM/yyyy HH:mm', { locale: es })
      }));
  }, [profileSessions]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

  return (
    <div className={`max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg">
            <TrendingUp size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Estadísticas de Rendimiento</h1>
            <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Visualiza tu evolución y optimiza tus sesiones.</p>
          </div>
        </div>
        
        <button 
          onClick={generateAiInsight}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-3xl font-black shadow-xl hover:shadow-indigo-500/20 transition-all hover:-translate-y-1 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
          Análisis Smart IA
        </button>
      </div>

      {/* Filtro de Período */}
      <div className="flex gap-4 flex-wrap">
        {(['week', 'month', 'year'] as TimePeriod[]).map(period => (
          <button
            key={period}
            onClick={() => setTimePeriod(period)}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              timePeriod === period
                ? 'bg-indigo-600 text-white shadow-lg'
                : theme === 'dark'
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {period === 'week' ? '📅 Esta Semana' : period === 'month' ? '📆 Este Mes' : '📊 Este Año'}
          </button>
        ))}
      </div>

      {aiInsight && (
        <div className={`p-8 rounded-[2.5rem] border-2 border-dashed border-indigo-500/30 animate-in slide-in-from-top duration-500 relative overflow-hidden ${theme === 'dark' ? 'bg-indigo-500/5' : 'bg-indigo-50'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={100} />
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-black text-indigo-600 uppercase tracking-widest text-xs mb-2">Consejo de tu Coach IA</h4>
              <p className={`text-lg font-bold leading-relaxed ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                "{aiInsight}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Tiempo Total', value: `${stats.totalHours}h`, icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { label: 'Pomodoros', value: stats.totalPomodoros, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Días Activos', value: stats.activeDays, icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Nivel Enfoque', value: `${stats.avgFocus}/5`, icon: Star, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <div key={i} className={`p-8 rounded-[2.5rem] border transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6`}>
              <stat.icon size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-4xl font-black mb-1">{stat.value}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Gráfico de Línea - Horas por Día */}
        <div className={`p-10 rounded-[3rem] border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className="text-xl font-black mb-8">
            {timePeriod === 'week' ? 'Horas de Estudio (Últimos 7 días)' : timePeriod === 'month' ? 'Horas de Estudio (Últimos 30 días)' : 'Horas de Estudio (Últimos 365 días)'}
          </h3>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} 
                />
                <Tooltip 
                  cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                    color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                  }}
                  itemStyle={{ fontWeight: 800, color: '#6366f1' }}
                />
                <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pastel - Por Materia */}
        <div className={`p-10 rounded-[3rem] border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h3 className="text-xl font-black mb-8">Distribución por Materia</h3>
          <div className="h-[300px] w-full flex flex-col sm:flex-row items-center justify-center gap-8">
            <div className="w-full h-full max-w-[250px] relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={subjectData.length ? subjectData : [{ name: 'Sin datos', value: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {subjectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                    {subjectData.length === 0 && <Cell fill={theme === 'dark' ? '#334155' : '#f1f5f9'} stroke="none" />}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none',
                      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff' 
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3 min-w-[140px]">
              {subjectData.map((entry, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <div className="flex flex-col">
                    <span className="text-xs font-black truncate max-w-[120px]">{entry.name}</span>
                    <span className="text-[10px] font-bold text-slate-400">{entry.value}h</span>
                  </div>
                </div>
              ))}
              {subjectData.length === 0 && <p className="text-xs text-slate-400 italic">No hay datos suficientes</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Top Items */}
      <div className={`p-10 rounded-[3rem] border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <h3 className="text-xl font-black mb-8">Top 5 - Temas Más Estudiados</h3>
        <div className="space-y-4">
          {itemData.length > 0 ? (
            itemData.map((item, index) => (
              <div key={index} className={`p-4 rounded-xl flex items-center justify-between ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold truncate max-w-[300px]">{item.name}</p>
                  </div>
                </div>
                <p className="font-black text-indigo-600">{item.value}h</p>
              </div>
            ))
          ) : (
            <p className="text-slate-400 italic">No hay datos suficientes</p>
          )}
        </div>
      </div>

      {/* Historial Detallado */}
      <div className={`p-10 rounded-[3rem] border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
        <button
          onClick={() => setShowHistorial(!showHistorial)}
          className="w-full flex items-center justify-between mb-8 hover:opacity-80 transition-opacity"
        >
          <h3 className="text-xl font-black">📋 Historial Detallado</h3>
          <ChevronDown size={24} className={`transition-transform ${showHistorial ? 'rotate-180' : ''}`} />
        </button>

        {showHistorial && (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {historialDetallado.length > 0 ? (
              historialDetallado.map((session, index) => (
                <div key={index} className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-sm">{session.itemName}</p>
                      <p className="text-xs text-slate-400 mt-1">📚 {session.subjectName}</p>
                      <p className="text-xs text-slate-500 mt-1">🕐 {session.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-indigo-600">{session.duration_minutes} min</p>
                      {session.rating > 0 && (
                        <p className="text-xs text-amber-500 mt-1">⭐ {session.rating}/5</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 italic text-center py-8">No hay sesiones registradas en este período</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsView;
