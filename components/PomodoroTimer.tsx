
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { 
  Play, Pause, RotateCcw, Star, 
  Maximize2, Minimize2, Sparkles, Trophy, BrainCircuit, Loader2,
  Info, AlertTriangle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const PomodoroTimer: React.FC = () => {
  const { 
    theme, activeProfileId, profiles, settings, tasks, 
    subjects, exams, examTopics, materials, addSession 
  } = useAppStore();
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const currentSettings = activeProfileId ? settings[activeProfileId] : null;

  // Filtrar tareas, materiales y temas del perfil activo
  const profileTasks = tasks.filter(t => {
    const subject = subjects.find(s => s.id === t.subject_id);
    return subject?.profile_id === activeProfileId;
  });

  const profileMaterials = materials.filter(m => m.profile_id === activeProfileId);

  const profileExamTopics = examTopics.filter(et => {
    const exam = exams.find(e => e.id === et.exam_id);
    if (!exam) return false;
    const subject = subjects.find(s => s.id === exam.subject_id);
    return subject?.profile_id === activeProfileId;
  });
  
  const [mode, setMode] = useState<'work' | 'short_break' | 'long_break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string, type: 'task' | 'topic' | 'material', title: string } | null>(null);
  const [sessionCount, setSessionCount] = useState(1);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [motivation, setMotivation] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);

  // FIX 1: Referencias para controlar el temporizador de forma precisa
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null); // Timestamp en milisegundos
  const sessionStartedRef = useRef<string | null>(null); // ISO string para la base de datos
  const initialDurationRef = useRef<number>(0); // Duración inicial en segundos
  const sessionSavedRef = useRef<boolean>(false); // Prevenir duplicación

  const getMotivationalPhrase = () => {
    const noun = activeProfile?.gender === 'femenino' ? 'reina' : activeProfile?.gender === 'masculino' ? 'rey' : 'estudiante';
    const phrases = [
      `¡Deja el móvil, ${noun}! 👑`,
      `¡Tu futuro te lo agradecerá! 💪`,
      `¡Enfoque láser, ${activeProfile?.user_name}! 🚀`,
      "¡Casi llegamos a la meta! 🌟",
      "¡Demuestra de lo que eres capaz! ✨"
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  };

  const getAiSuggestion = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setAiTip("Configura tu API_KEY para activar la IA.");
      setTimeout(() => setAiTip(null), 5000);
      return;
    }

    setIsSuggesting(true);
    try {
      const pendingTasks = profileTasks.filter(t => t.status !== 'completed');
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Tengo estas tareas: ${JSON.stringify(pendingTasks.map(t => ({ title: t.title, priority: t.priority })))}. Small tip (max 8 words) on what to focus on based on priority. Tone: Encouraging mentor. Language: Spanish.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiTip(response.text || "Prioriza lo más urgente hoy.");
      setTimeout(() => setAiTip(null), 8000);
    } catch (error) {
      console.error(error);
      setAiTip("Error al conectar con la IA.");
    } finally {
      setIsSuggesting(false);
    }
  };

  // Frases motivacionales durante el trabajo
  useEffect(() => {
    if (isActive && mode === 'work') {
      const interval = setInterval(() => {
        setMotivation(getMotivationalPhrase());
        setTimeout(() => setMotivation(null), 5000);
      }, 90000); 
      return () => clearInterval(interval);
    }
  }, [isActive, mode]);

  // Reiniciar el tiempo cuando cambia el modo
  useEffect(() => {
    if (currentSettings) {
      const mins = mode === 'work' ? currentSettings.work_duration : mode === 'short_break' ? currentSettings.short_break : currentSettings.long_break;
      const seconds = mins * 60;
      setTimeLeft(seconds);
      initialDurationRef.current = seconds;
    }
  }, [mode, currentSettings]);

  // FIX 1: Temporizador preciso basado en tiempo real
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      // Limpiar cualquier intervalo previo
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Guardar el timestamp de inicio si no existe
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      // Actualizar cada 100ms para mayor precisión
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        const remaining = Math.max(0, initialDurationRef.current - elapsed);
        
        setTimeLeft(remaining);

        // Si llegamos a 0, completar la sesión
        if (remaining === 0) {
          handleComplete();
        }
      }, 100);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    } else if (!isActive) {
      // Limpiar el intervalo cuando se pausa
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isActive, timeLeft]);

  const handleStart = () => {
    if (mode === 'work' && !selectedItem) {
      setAiTip("Elige un tema antes de arrancar.");
      setTimeout(() => setAiTip(null), 3000);
      return;
    }
    
    setIsActive(true);
    sessionSavedRef.current = false; // Resetear flag de guardado
    
    // FIX 2: Guardar el tiempo de inicio real
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
      sessionStartedRef.current = new Date().toISOString();
    }
  };

  const handlePause = () => {
    setIsActive(false);
    // Mantener el tiempo de inicio para poder reanudar
  };

  const handleReset = () => {
    setIsActive(false);
    const mins = mode === 'work' ? currentSettings?.work_duration || 25 : mode === 'short_break' ? currentSettings?.short_break || 5 : currentSettings?.long_break || 15;
    const seconds = mins * 60;
    setTimeLeft(seconds);
    initialDurationRef.current = seconds;
    startTimeRef.current = null;
    sessionStartedRef.current = null;
    sessionSavedRef.current = false;
  };

  const handleComplete = () => {
    setIsActive(false);
    
    // FIX 3: Prevenir duplicación - solo mostrar modal si no se ha guardado
    if (mode === 'work' && !sessionSavedRef.current) {
      setShowCompletionModal(true);
    } else if (mode !== 'work') {
      // Para descansos, cambiar automáticamente a trabajo
      handleReset();
      setMode('work');
    }
  };

  // FIX 2: Guardar la duración REAL de la sesión
  const saveSession = () => {
    if (!activeProfileId || !sessionStartedRef.current || sessionSavedRef.current) {
      console.warn('Sesión ya guardada o datos incompletos');
      return;
    }
    
    // Marcar como guardada INMEDIATAMENTE para prevenir duplicación
    sessionSavedRef.current = true;
    
    // FIX 2: Calcular la duración REAL basada en timestamps
    const startTime = new Date(sessionStartedRef.current).getTime();
    const endTime = Date.now();
    const actualDurationSeconds = Math.floor((endTime - startTime) / 1000);
    
    const plannedMins = mode === 'work' ? currentSettings?.work_duration || 25 : mode === 'short_break' ? currentSettings?.short_break || 5 : currentSettings?.long_break || 15;

    console.log('💾 Guardando sesión:', {
      planned: plannedMins,
      actual_seconds: actualDurationSeconds,
      actual_minutes: (actualDurationSeconds / 60).toFixed(2)
    });

    addSession({
      profile_id: activeProfileId,
      task_id: selectedItem?.type === 'task' ? selectedItem.id : undefined,
      exam_topic_id: selectedItem?.type === 'topic' ? selectedItem.id : undefined,
      material_id: selectedItem?.type === 'material' ? selectedItem.id : undefined,
      session_type: mode,
      planned_duration_minutes: plannedMins,
      duration_seconds: actualDurationSeconds, // FIX 2: Usar duración REAL
      status: 'completed',
      focus_rating: rating,
      started_at: sessionStartedRef.current,
      completed_at: new Date().toISOString(),
    });

    // Cerrar modal y resetear
    setShowCompletionModal(false);
    setRating(0);
    
    // Resetear referencias
    startTimeRef.current = null;
    sessionStartedRef.current = null;
    
    // Cambiar al siguiente modo
    if (mode === 'work') {
      if (sessionCount % (currentSettings?.poms_before_long || 4) === 0) {
        setMode('long_break');
      } else {
        setMode('short_break');
      }
      setSessionCount(prev => prev + 1);
    } else {
      setMode('work');
    }

    // Resetear el temporizador para el siguiente ciclo
    handleReset();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col items-center py-10 transition-all duration-700 ${isFullscreen ? 'fixed inset-0 z-[100] bg-slate-950 justify-center p-12' : 'max-w-xl mx-auto'}`}>
      
      {motivation && (
        <div className="fixed top-24 animate-bounce bg-indigo-600 text-white px-10 py-5 rounded-[2.5rem] shadow-2xl z-[110] font-black border-4 border-white/20 text-xl">
          <Sparkles className="inline mr-2" /> {motivation}
        </div>
      )}

      {aiTip && (
        <div className={`fixed bottom-10 animate-in slide-in-from-bottom duration-500 px-8 py-4 rounded-3xl border shadow-2xl z-[120] font-black flex items-center gap-3 ${theme === 'dark' ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-white border-indigo-100 text-indigo-700'}`}>
          <BrainCircuit className="text-indigo-500" />
          {aiTip}
        </div>
      )}

      {isFullscreen && (
        <button onClick={() => setIsFullscreen(false)} className="absolute top-12 right-12 text-white/30 hover:text-white flex items-center gap-3 transition-colors">
          <Minimize2 size={32} /> <span className="text-sm font-black uppercase tracking-[0.3em]">Cerrar Foco</span>
        </button>
      )}

      {!isFullscreen && (
        <div className={`flex gap-3 mb-16 p-2 rounded-[2rem] border-2 shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          {(['work', 'short_break', 'long_break'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); handleReset(); }}
              disabled={isActive}
              className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                mode === m ? 'bg-indigo-600 text-white shadow-xl scale-105' : theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {m === 'work' ? 'Productividad' : m === 'short_break' ? 'D. Corto' : 'D. Largo'}
            </button>
          ))}
        </div>
      )}

      <div className="relative mb-20 group">
        <div className={`absolute -inset-8 bg-indigo-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 ${isActive ? 'animate-pulse' : ''}`} />
        <svg className={`${isFullscreen ? 'w-[38rem] h-[38rem]' : 'w-96 h-96'} -rotate-90 transition-all duration-1000 relative z-10`}>
          <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="transparent" className={theme === 'dark' || isFullscreen ? "text-slate-800" : "text-slate-100"} />
          <circle 
            cx="50%" cy="50%" r="45%" 
            stroke="currentColor" strokeWidth="8" fill="transparent" 
            className="text-indigo-500 transition-all duration-300 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            strokeDasharray="283%"
            strokeDashoffset={`${283 - (timeLeft / initialDurationRef.current) * 283}%`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
          <span className={`${isFullscreen ? 'text-[14rem]' : 'text-9xl'} font-black tracking-tighter leading-none ${theme === 'dark' || isFullscreen ? 'text-white' : 'text-slate-950'}`}>
            {formatTime(timeLeft)}
          </span>
          {selectedItem && (
            <div className="mt-12 text-center px-10 animate-in fade-in duration-500">
              <p className="text-[12px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-2">Meta de Enfoque</p>
              <p className={`text-2xl font-black truncate max-w-[320px] ${theme === 'dark' || isFullscreen ? 'text-slate-200' : 'text-slate-900'}`}>{selectedItem.title}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-16 relative z-30">
        <button 
          onClick={handleReset} 
          className={`p-8 rounded-full border-2 transition-all hover:scale-110 active:scale-90 ${theme === 'dark' || isFullscreen ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-400'}`}
        >
          <RotateCcw size={32} />
        </button>
        <button 
          onClick={isActive ? handlePause : handleStart}
          className={`w-40 h-40 rounded-full flex items-center justify-center text-white shadow-[0_30px_60px_-15px_rgba(79,70,229,0.5)] transition-all hover:scale-110 active:scale-95 ${isActive ? 'bg-amber-500' : 'bg-indigo-600'}`}
        >
          {isActive ? <Pause size={80} fill="currentColor" /> : <Play size={80} fill="currentColor" className="ml-4" />}
        </button>
        <button onClick={() => setIsFullscreen(!isFullscreen)} className={`p-8 rounded-full border-2 transition-all hover:scale-110 active:scale-90 ${theme === 'dark' || isFullscreen ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-400'}`}>
          {isFullscreen ? <Minimize2 size={32} /> : <Maximize2 size={32} />}
        </button>
      </div>

      {!isActive && !isFullscreen && (
        <div className={`mt-16 w-full p-10 rounded-[3.5rem] border-2 shadow-2xl animate-in slide-in-from-bottom duration-700 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-50'}`}>
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">¿Qué vamos a lograr?</h3>
               <button 
                onClick={getAiSuggestion}
                disabled={isSuggesting}
                className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 disabled:opacity-50 transition-colors"
               >
                 {isSuggesting ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                 Asesor IA
               </button>
            </div>
            <select 
              className={`w-full p-6 rounded-3xl font-black text-lg outline-none border-none transition-all shadow-inner ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-950'}`}
              onChange={(e) => {
                const [type, id] = e.target.value.split(':');
                if (!id) { setSelectedItem(null); return; }
                const item = [...profileTasks, ...profileMaterials, ...profileExamTopics].find(i => i.id === id);
                setSelectedItem({ type: type as any, id, title: (item as any).title || (item as any).name });
              }}
            >
              <option value="">-- Elige un desafío para hoy --</option>
              <optgroup label="Tareas Críticas">
                {profileTasks.filter(t => t.status !== 'completed').map(t => <option key={t.id} value={`task:${t.id}`}>🔥 {t.title}</option>)}
              </optgroup>
              <optgroup label="Materiales de Estudio">
                {profileMaterials.filter(m => m.status !== 'completed').map(m => {
                  const sub = subjects.find(s => s.id === m.subject_id);
                  return <option key={m.id} value={`material:${m.id}`}>📚 {m.title} ({sub?.name || 'Gral'})</option>
                })}
              </optgroup>
              <optgroup label="Temas de Examen">
                {profileExamTopics.filter(et => et.status !== 'completed').map(et => <option key={et.id} value={`topic:${et.id}`}>🎯 {et.title}</option>)}
              </optgroup>
            </select>
        </div>
      )}

      {showCompletionModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-8 z-[300]">
          <div className={`w-full max-w-xl rounded-[4rem] p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in duration-500 ${theme === 'dark' ? 'bg-slate-900 border border-white/5' : 'bg-white'}`}>
            <div className="w-32 h-32 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-3">
              <Trophy size={64} />
            </div>
            <h2 className={`text-5xl font-black text-center mb-4 tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>¡Misión Cumplida!</h2>
            <p className="text-center text-slate-500 font-bold mb-12 text-lg">Tu cerebro te agradece el enfoque. ¿Cómo fue la calidad?</p>
            <div className="flex justify-center gap-4 mb-16">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)} className={`transition-all hover:scale-125 ${rating >= s ? 'text-yellow-400' : 'text-slate-200'}`}>
                  <Star size={54} fill={rating >= s ? "currentColor" : "none"} strokeWidth={3} />
                </button>
              ))}
            </div>
            <button onClick={saveSession} className="w-full bg-indigo-600 text-white font-black py-8 rounded-[2.5rem] shadow-2xl hover:bg-indigo-700 transition-all uppercase tracking-[0.2em] text-lg active:scale-95">
              Registrar Esfuerzo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
