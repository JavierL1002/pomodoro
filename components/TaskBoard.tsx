
import React, { useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { Plus, Timer, Trash2, CheckCircle2, Circle, ClipboardList, Filter, TrendingUp, AlertCircle } from 'lucide-react';
import { Priority, TaskStatus } from '../types';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const TaskBoard: React.FC = () => {
  const { activeProfileId, subjects, tasks, addTask, updateTask } = useAppStore();
  const [isAdding, setIsAdding] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  
  const [newTask, setNewTask] = useState({
    title: '',
    subject_id: '',
    priority: 'medium' as Priority,
    due_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    estimated_pomodoros: 1,
    alert_days_before: 1
  });

  const profileSubjects = subjects.filter(s => s.profile_id === activeProfileId);
  const profileTasks = tasks.filter(t => {
      const subj = subjects.find(s => s.id === t.subject_id);
      return subj?.profile_id === activeProfileId && (filterStatus === 'all' || t.status === filterStatus);
  }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.subject_id) return;
    
    addTask({
      ...newTask,
      status: 'pending'
    });
    setIsAdding(false);
    setNewTask({ title: '', subject_id: '', priority: 'medium', due_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"), estimated_pomodoros: 1, alert_days_before: 1 });
  };

  const priorityColors = {
    low: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };

  // Calcular estadísticas generales
  const stats = {
    total: profileTasks.length,
    completed: profileTasks.filter(t => t.status === 'completed').length,
    pending: profileTasks.filter(t => t.status === 'pending').length,
    late: profileTasks.filter(t => t.status === 'late').length,
  };

  // Función para obtener días restantes
  const getDaysRemaining = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return { text: 'Vencida', color: 'text-red-600', urgent: true };
    if (days === 0) return { text: 'Hoy', color: 'text-orange-600', urgent: true };
    if (days === 1) return { text: 'Mañana', color: 'text-amber-600', urgent: true };
    if (days <= 3) return { text: `${days} días`, color: 'text-amber-500', urgent: false };
    return { text: `${days} días`, color: 'text-slate-400', urgent: false };
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Mis Tareas</h1>
          <p className="text-slate-500 font-medium mt-1">Organiza tus materias y entregas académicas.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
             <button 
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
             >Todas</button>
             <button 
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === 'pending' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
             >Pendientes</button>
             <button 
                onClick={() => setFilterStatus('completed')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === 'completed' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
             >Hechas</button>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            <Plus size={20} strokeWidth={3} />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Estadísticas generales */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total</span>
              <ClipboardList size={18} className="text-slate-400" />
            </div>
            <p className="text-3xl font-black text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Completadas</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-emerald-700">{stats.completed}</p>
          </div>
          <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-amber-600">Pendientes</span>
              <Circle size={18} className="text-amber-500" />
            </div>
            <p className="text-3xl font-black text-amber-700">{stats.pending}</p>
          </div>
          <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600">Progreso</span>
              <TrendingUp size={18} className="text-indigo-500" />
            </div>
            <p className="text-3xl font-black text-indigo-700">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%</p>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 mb-10 animate-in slide-in-from-top duration-300">
          <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Título de la tarea</label>
              <input 
                type="text" required value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                placeholder="Ej: Ensayo de Filosofía"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Materia</label>
              <select 
                required value={newTask.subject_id}
                onChange={e => setNewTask({...newTask, subject_id: e.target.value})}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                <option value="">Selecciona materia...</option>
                {profileSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Fecha Entrega</label>
              <input 
                type="datetime-local" required value={newTask.due_date}
                onChange={e => setNewTask({...newTask, due_date: e.target.value})}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Prioridad</label>
              <select 
                value={newTask.priority}
                onChange={e => setNewTask({...newTask, priority: e.target.value as Priority})}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Pomodoros</label>
                  <input type="number" value={newTask.estimated_pomodoros} onChange={e => setNewTask({...newTask, estimated_pomodoros: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
               </div>
               <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Alerta (días antes)</label>
                  <input type="number" value={newTask.alert_days_before} onChange={e => setNewTask({...newTask, alert_days_before: parseInt(e.target.value)})} className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
               </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-4 pt-6 border-t border-slate-100">
              <button type="button" onClick={() => setIsAdding(false)} className="px-8 py-4 font-black text-slate-400 uppercase tracking-widest text-xs">Cancelar</button>
              <button type="submit" className="px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Crear Tarea</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {profileTasks.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-200">
            <div className="inline-flex p-6 rounded-full bg-slate-50 mb-6 text-slate-300">
              <ClipboardList size={64} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-black text-slate-800">No hay tareas</h3>
            <p className="text-slate-400 font-medium max-w-xs mx-auto mt-2">Crea tu primera tarea para empezar a organizar tu semestre.</p>
          </div>
        ) : (
          profileTasks.map(task => {
            const subject = subjects.find(s => s.id === task.subject_id);
            const daysInfo = getDaysRemaining(task.due_date);
            const progress = task.estimated_pomodoros > 0 
              ? Math.round((task.completed_pomodoros / task.estimated_pomodoros) * 100) 
              : 0;
            
            return (
              <div 
                key={task.id}
                className={`flex items-center gap-6 p-6 bg-white border-2 rounded-[2rem] transition-all hover:shadow-xl hover:-translate-y-1 ${
                  task.status === 'completed' 
                    ? 'opacity-60 bg-slate-50 grayscale border-slate-100' 
                    : daysInfo.urgent 
                      ? 'border-red-200 bg-red-50/30' 
                      : 'border-slate-100'
                }`}
              >
                <button 
                  onClick={() => updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' })}
                  className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                    task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-transparent hover:border-indigo-400'
                  }`}
                >
                  <CheckCircle2 size={24} />
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className={`text-lg font-black truncate max-w-md ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.title}
                    </h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                    {daysInfo.urgent && task.status !== 'completed' && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest bg-red-100 text-red-700">
                        <AlertCircle size={12} />
                        {daysInfo.text}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-xs font-bold text-slate-500 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subject?.color }} />
                      <span className="text-slate-800">{subject?.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Timer size={14} className="text-indigo-500" />
                      <span>{task.completed_pomodoros} / {task.estimated_pomodoros} poms</span>
                    </div>
                    <p className={daysInfo.color}>
                      Vence: {format(new Date(task.due_date), "d MMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                  {/* Barra de progreso */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ${
                        task.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <button className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">
                      <Timer size={20} />
                   </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TaskBoard;
