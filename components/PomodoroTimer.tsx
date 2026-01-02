
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { 
  Play, Pause, RotateCcw, CheckCircle2, Star, 
  Maximize2, Minimize2, Sparkles, Trophy
} from 'lucide-react';

const PomodoroTimer: React.FC = () => {
  const { 
    theme, activeProfileId, profiles, settings, tasks, 
    subjects, exams, examTopics, materials, addSession 
  } = useAppStore();
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const currentSettings = activeProfileId ? settings[activeProfileId] : null;
  
  const [mode, setMode] = useState<'work' | 'short_break' | 'long_break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string, type: 'task' | 'topic' | 'material', title: string } | null>(null);
  const [sessionCount, setSessionCount] = useState(1);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [motivation, setMotivation] = useState<string | null>(null);

  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<string | null>(null);

  const getMotivationalPhrase = () => {
    const noun = activeProfile?.gender === 'femenino' ? 'mi reina' : activeProfile?.gender === 'masculino' ? 'mi rey' : 'estudiante';
    const phrases = [
      `¡Nada de teléfono, a estudiar ${noun}! 👑`,
      `¡Concéntrate ${noun}! 💪`,
      `¡Tú puedes con esto, ${activeProfile?.user_name}! 🚀`,
      "¡El éxito está cerca! 🌟",
      "¡Enfócate en tu meta! ✨"
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  useEffect(() => {
    if (isActive && mode === 'work') {
      const interval = setInterval(() => {
        setMotivation(getMotivationalPhrase());
        setTimeout(() => setMotivation(null), 5000);
      }, 60000); 
      return () => clearInterval(interval);
    }
  }, [isActive, mode]);

  useEffect(() => {
    if (currentSettings) {
      const mins = mode === 'work' ? currentSettings.work_duration : mode === 'short_break' ? currentSettings.short_break : currentSettings.long_break;
      setTimeLeft(mins * 60);
    }
  }, [mode, currentSettings]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleComplete();
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const handleStart = () => {
    if (mode === 'work' && !selectedItem) {
      alert('Selecciona una tarea o material para empezar.');
      return;
    }
    setIsActive(true);
    if (!startTimeRef.current) startTimeRef.current = new Date().toISOString();
  };

  const handleComplete = () => {
    setIsActive(false);
    if (mode === 'work') {
      setShowCompletionModal(true);
    } else {
      setMode('work');
    }
  };

  const saveSession = () => {
    if (!activeProfileId || !startTimeRef.current) return;
    
    const plannedMins = mode === 'work' ? currentSettings?.work_duration || 25 : mode === 'short_break' ? currentSettings?.short_break || 5 : 15;
    const actualSecs = (plannedMins * 60) - timeLeft;

    // Updated addSession call to use duration_seconds and include status
    addSession({
      profile_id: activeProfileId,
      task_id: selectedItem?.type === 'task' ? selectedItem.id : undefined,
      exam_topic_id: selectedItem?.type === 'topic' ? selectedItem.id : undefined,
      material_id: selectedItem?.type === 'material' ? selectedItem.id : undefined,
      session_type: mode,
      planned_duration_minutes: plannedMins,
      duration_seconds: actualSecs,
      status: 'completed',
      focus_rating: rating,
      started_at: startTimeRef.current,
      completed_at: new Date().toISOString(),
    });

    setShowCompletionModal(false);
    setRating(0);
    startTimeRef.current = null;
    
    if (mode === 'work') {
      if (sessionCount % (currentSettings?.poms_before_long || 4) === 0) setMode('long_break');
      else setMode('short_break');
      setSessionCount(prev => prev + 1);
    } else {
      setMode('work');
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col items-center py-10 transition-all duration-700 ${isFullscreen ? 'fixed inset-0 z-[100] bg-slate-900 justify-center p-8' : 'max-w-xl mx-auto'}`}>
      
      {motivation && (
        <div className="fixed top-20 animate-bounce bg-indigo-600 text-white px-8 py-4 rounded-3xl shadow-2xl z-[110] font-black border-2 border-white/20">
          <Sparkles className="inline mr-2" /> {motivation}
        </div>
      )}

      {isFullscreen && (
        <button onClick={() => setIsFullscreen(false)} className="absolute top-10 right-10 text-white/40 hover:text-white flex items-center gap-2">
          <Minimize2 /> <span className="text-xs font-black uppercase tracking-widest">Salir</span>
        </button>
      )}

      {!isFullscreen && (
        <div className={`flex gap-2 mb-12 p-2 rounded-3xl border shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          {(['work', 'short_break', 'long_break'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setIsActive(false); }}
              className={`px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                mode === m ? 'bg-indigo-600 text-white shadow-lg' : theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {m === 'work' ? 'Pomodoro' : m === 'short_break' ? 'D. Corto' : 'D. Largo'}
            </button>
          ))}
        </div>
      )}

      <div className="relative mb-16">
        <svg className={`${isFullscreen ? 'w-[32rem] h-[32rem]' : 'w-80 h-80'} -rotate-90 transition-all duration-1000`}>
          <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="6" fill="transparent" className={theme === 'dark' || isFullscreen ? "text-slate-800" : "text-slate-100"} />
          <circle 
            cx="50%" cy="50%" r="45%" 
            stroke="currentColor" strokeWidth="6" fill="transparent" 
            className="text-indigo-500 transition-all duration-300"
            strokeDasharray="283%"
            strokeDashoffset={`${283 - (timeLeft / ((mode === 'work' ? currentSettings?.work_duration || 25 : mode === 'short_break' ? 5 : 15) * 60)) * 283}%`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${isFullscreen ? 'text-[12rem]' : 'text-8xl'} font-black tracking-tighter leading-none ${theme === 'dark' || isFullscreen ? 'text-white' : 'text-slate-900'}`}>
            {formatTime(timeLeft)}
          </span>
          {selectedItem && (
            <div className="mt-8 text-center px-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Enfoque Actual</p>
              <p className={`text-xl font-bold truncate max-w-[280px] ${theme === 'dark' || isFullscreen ? 'text-slate-300' : 'text-slate-600'}`}>{selectedItem.title}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-12">
        <button onClick={() => { setIsActive(false); setTimeLeft((mode === 'work' ? currentSettings?.work_duration || 25 : 5) * 60); }} className={`p-6 rounded-full border transition-all ${theme === 'dark' || isFullscreen ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-400'}`}>
          <RotateCcw size={28} />
        </button>
        <button 
          onClick={isActive ? () => setIsActive(false) : handleStart}
          className={`w-32 h-32 rounded-full flex items-center justify-center text-white shadow-2xl transition-all hover:scale-105 active:scale-95 ${isActive ? 'bg-amber-500' : 'bg-indigo-600'}`}
        >
          {isActive ? <Pause size={64} fill="currentColor" /> : <Play size={64} fill="currentColor" className="ml-2" />}
        </button>
        <button onClick={() => setIsFullscreen(!isFullscreen)} className={`p-6 rounded-full border transition-all ${theme === 'dark' || isFullscreen ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-400'}`}>
          {isFullscreen ? <Minimize2 size={28} /> : <Maximize2 size={28} />}
        </button>
      </div>

      {!isActive && !isFullscreen && (
        <div className={`mt-12 w-full p-8 rounded-[3rem] border shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 text-center">Asignar Sesión</h3>
            <select 
              className={`w-full p-5 rounded-2xl font-bold outline-none border-none transition-all ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900'}`}
              onChange={(e) => {
                const [type, id] = e.target.value.split(':');
                if (!id) { setSelectedItem(null); return; }
                const item = [...tasks, ...materials, ...examTopics].find(i => i.id === id);
                setSelectedItem({ type: type as any, id, title: (item as any).title || (item as any).name });
              }}
            >
              <option value="">-- Elige qué trabajar hoy --</option>
              {tasks.filter(t => t.status !== 'completed').map(t => <option key={t.id} value={`task:${t.id}`}>[Tarea] {t.title}</option>)}
              {examTopics.filter(et => et.status !== 'completed').map(et => <option key={et.id} value={`topic:${et.id}`}>[Tema] {et.title}</option>)}
              {materials.filter(m => m.status !== 'completed').map(m => <option key={m.id} value={`material:${m.id}`}>[Material] {m.title}</option>)}
            </select>
        </div>
      )}

      {showCompletionModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 z-[200]">
          <div className={`w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl animate-in zoom-in duration-300 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
            <div className="w-24 h-24 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
              <Trophy size={48} />
            </div>
            <h2 className={`text-4xl font-black text-center mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>¡Sesión Lograda!</h2>
            <p className="text-center text-slate-400 font-medium mb-10">¿Cómo calificarías tu nivel de enfoque esta vez?</p>
            <div className="flex justify-center gap-3 mb-12">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)} className={`transition-all hover:scale-125 ${rating >= s ? 'text-yellow-400' : 'text-slate-200'}`}>
                  <Star size={44} fill={rating >= s ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <button onClick={saveSession} className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-sm">
              Guardar Log y Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
