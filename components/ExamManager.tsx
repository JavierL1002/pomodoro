
import React, { useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { 
  Plus, ClipboardList, BookOpen, AlertCircle, 
  ChevronRight, Calendar, Trash2, CheckCircle2, Clock,
  Circle, Target, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ExamManager: React.FC = () => {
  const { 
    theme, activeProfileId, subjects, exams, examTopics, 
    addExam, addExamTopic, updateExamTopic
  } = useAppStore();

  const [activeView, setActiveView] = useState<'list' | 'add-exam' | 'add-topic'>('list');
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  const [examForm, setExamForm] = useState({
    subject_id: '',
    name: '',
    exam_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration_minutes: 120,
    weight_percentage: 20,
    alert_days_before: 3
  });

  const [topicForm, setTopicForm] = useState({
    title: '',
    estimated_pomodoros: 4
  });

  const profileSubjects = subjects.filter(s => s.profile_id === activeProfileId);
  const profileExams = exams.filter(e => {
    const subj = subjects.find(s => s.id === e.subject_id);
    return subj?.profile_id === activeProfileId;
  }).sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime());

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    addExam({ ...examForm, status: 'upcoming' });
    setActiveView('list');
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    addExamTopic({ ...topicForm, exam_id: selectedExamId, status: 'not_started' });
    setTopicForm({ title: '', estimated_pomodoros: 4 });
    setActiveView('list');
  };

  // Función para marcar un tema como revisado/completado
  const toggleTopicStatus = (topicId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'not_started' : 'completed';
    updateExamTopic(topicId, { status: newStatus });
  };

  // Calcular estadísticas de progreso para un examen
  const getExamProgress = (examId: string) => {
    const topics = examTopics.filter(et => et.exam_id === examId);
    if (topics.length === 0) return { percentage: 0, completed: 0, total: 0, inProgress: 0 };
    
    const completed = topics.filter(t => t.status === 'completed').length;
    const inProgress = topics.filter(t => t.status === 'in_progress').length;
    const total = topics.length;
    const percentage = Math.round((completed / total) * 100);
    
    return { percentage, completed, total, inProgress };
  };

  return (
    <div className={`max-w-5xl mx-auto space-y-8 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Evaluaciones</h1>
          <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Mantén bajo control tus exámenes y temas de estudio.</p>
        </div>
        <button 
          onClick={() => setActiveView('add-exam')}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all"
        >
          <Plus size={20} strokeWidth={3} />
          Nuevo Examen
        </button>
      </div>

      {activeView === 'add-exam' && (
        <div className={`p-10 rounded-[2.5rem] shadow-2xl border animate-in zoom-in duration-300 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="text-2xl font-black mb-8">Programar Evaluación</h3>
          <form onSubmit={handleAddExam} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Materia</label>
              <select 
                required value={examForm.subject_id}
                onChange={e => setExamForm({...examForm, subject_id: e.target.value})}
                className={`w-full p-4 rounded-2xl outline-none font-bold ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900'}`}
              >
                <option value="">Selecciona materia...</option>
                {profileSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Título</label>
              <input type="text" required value={examForm.name} onChange={e => setExamForm({...examForm, name: e.target.value})} className={`w-full p-4 rounded-2xl outline-none font-bold ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900'}`} placeholder="Ej: Parcial 1" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Fecha y Hora</label>
              <input type="datetime-local" required value={examForm.exam_date} onChange={e => setExamForm({...examForm, exam_date: e.target.value})} className={`w-full p-4 rounded-2xl outline-none font-bold ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900'}`} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onClick={() => setActiveView('list')} className="px-8 py-4 font-black text-slate-400 uppercase tracking-widest text-xs">Cancelar</button>
              <button type="submit" className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Crear Examen</button>
            </div>
          </form>
        </div>
      )}

      {activeView === 'add-topic' && (
        <div className={`p-10 rounded-[2.5rem] shadow-2xl border animate-in zoom-in duration-300 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <h3 className="text-2xl font-black mb-8">Nuevo Tema de Estudio</h3>
          <form onSubmit={handleAddTopic} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Tema</label>
              <input type="text" required value={topicForm.title} onChange={e => setTopicForm({...topicForm, title: e.target.value})} className={`w-full p-4 rounded-2xl outline-none font-bold ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900'}`} placeholder="Ej: Leyes de Newton" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-400 mb-2">Pomodoros Sugeridos</label>
              <input type="number" required value={topicForm.estimated_pomodoros} onChange={e => setTopicForm({...topicForm, estimated_pomodoros: parseInt(e.target.value)})} className={`w-full p-4 rounded-2xl outline-none font-bold ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900'}`} />
            </div>
            <div className="flex justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
              <button type="button" onClick={() => setActiveView('list')} className="px-8 py-4 font-black text-slate-400 uppercase tracking-widest text-xs">Cancelar</button>
              <button type="submit" className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">Agregar Tema</button>
            </div>
          </form>
        </div>
      )}

      {activeView === 'list' && (
        <div className="space-y-8">
          {profileExams.length === 0 ? (
            <div className={`text-center py-24 rounded-[3rem] border-4 border-dashed ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-600' : 'bg-white border-slate-200 text-slate-300'}`}>
              <ClipboardList size={64} className="mx-auto mb-6 opacity-20" />
              <h3 className="text-2xl font-black">Sin exámenes próximos</h3>
              <p className="font-medium max-w-xs mx-auto mt-2">Agrega tus evaluaciones para planificar tus temas de estudio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {profileExams.map(exam => {
                const subject = subjects.find(s => s.id === exam.subject_id);
                const topics = examTopics.filter(et => et.exam_id === exam.id);
                const progress = getExamProgress(exam.id);
                
                return (
                  <div key={exam.id} className={`rounded-[2.5rem] border shadow-sm overflow-hidden transition-all hover:shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="p-8 flex flex-col md:flex-row gap-8">
                      <div className="md:w-1/3">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-3 h-10 rounded-full" style={{ backgroundColor: subject?.color || '#3B82F6' }} />
                           <div>
                             <h4 className="text-xl font-black">{exam.name}</h4>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subject?.name}</p>
                           </div>
                        </div>
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                            <Calendar size={18} className="text-indigo-500" />
                            {format(new Date(exam.exam_date), "EEEE d 'de' MMMM", { locale: es })}
                          </div>
                          <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                            <Clock size={18} className="text-indigo-500" />
                            {format(new Date(exam.exam_date), "HH:mm")} • {exam.duration_minutes} min
                          </div>
                        </div>

                        {/* Estadísticas de progreso */}
                        <div className={`p-4 rounded-2xl mb-6 ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-indigo-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Progreso</span>
                            <span className="text-2xl font-black text-indigo-600">{progress.percentage}%</span>
                          </div>
                          <div className={`w-full h-3 rounded-full overflow-hidden mb-3 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700" 
                              style={{ width: `${progress.percentage}%` }} 
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="text-emerald-500" />
                              <span className="text-slate-600">{progress.completed} completados</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Target size={14} className="text-slate-400" />
                              <span className="text-slate-600">{progress.total} temas</span>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => { setSelectedExamId(exam.id); setActiveView('add-topic'); }}
                          className={`w-full py-3 rounded-2xl font-bold text-sm transition-all ${theme === 'dark' ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-900 text-white hover:bg-black'}`}
                        >
                          + Agregar Tema
                        </button>
                      </div>

                      <div className={`flex-1 p-6 rounded-3xl ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-slate-50/50'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temario de Estudio</h5>
                          {topics.length > 0 && (
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                              <TrendingUp size={14} />
                              <span>{progress.completed}/{progress.total}</span>
                            </div>
                          )}
                        </div>
                        {topics.length === 0 ? (
                          <p className="text-slate-400 text-sm italic">Define los temas que vendrán en este examen.</p>
                        ) : (
                          <div className="space-y-3">
                            {topics.map(topic => {
                              const isCompleted = topic.status === 'completed';
                              return (
                                <div 
                                  key={topic.id} 
                                  className={`p-4 rounded-2xl flex items-center justify-between border transition-all hover:shadow-md ${
                                    isCompleted 
                                      ? theme === 'dark' ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-emerald-50 border-emerald-200'
                                      : theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <button
                                      onClick={() => toggleTopicStatus(topic.id, topic.status)}
                                      className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                        isCompleted 
                                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                                          : 'border-slate-300 text-transparent hover:border-indigo-400 hover:text-indigo-400'
                                      }`}
                                    >
                                      <CheckCircle2 size={18} />
                                    </button>
                                    <div className="flex-1">
                                      <p className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                                        {topic.title}
                                      </p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {topic.completed_pomodoros} / {topic.estimated_pomodoros} Pomos
                                      </p>
                                    </div>
                                  </div>
                                  <div className={`w-24 h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                    <div 
                                      className={`h-full transition-all duration-700 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                      style={{ width: `${Math.min((topic.completed_pomodoros / topic.estimated_pomodoros) * 100, 100)}%` }} 
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamManager;
