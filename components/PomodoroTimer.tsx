
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { 
  Play, Pause, RotateCcw, Star, 
  Maximize2, Minimize2, Sparkles, Trophy, BrainCircuit, Loader2,
  Info, AlertTriangle, Settings, X
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const PomodoroTimer: React.FC = () => {
  const { 
    theme, activeProfileId, profiles, settings, tasks, 
    subjects, exams, examTopics, materials, addSession, updateSettings
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [motivation, setMotivation] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);

  // Configuración temporal para el modal
  const [tempSettings, setTempSettings] = useState({
    work_duration: 25,
    short_break: 5,
    long_break: 15,
    poms_before_long: 4
  });

  // FIX 1: Referencias para controlar el temporizador de forma precisa
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null); // Timestamp en milisegundos
  const sessionStartedRef = useRef<string | null>(null); // ISO string para la base de datos
  const sessionSavedRef = useRef<boolean>(false); // FIX 3: Prevenir duplicación
  const initialDurationRef = useRef<number>(25 * 60); // Duración inicial en segundos

  const getMotivationalPhrase = () => {
    const phrases = [
      "¡Vas increíble! 🚀",
      "Sigue así, campeón 💪",
      "Tu esfuerzo vale oro ⭐",
      "Estás en racha 🔥",
      "¡Imparable! 🎯"
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
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });
      
      setAiTip(response.text);
      setTimeout(() => setAiTip(null), 8000);
    } catch (error) {
      console.error("Error al obtener sugerencia de IA:", error);
      setAiTip("No se pudo conectar con el asesor IA.");
      setTimeout(() => setAiTip(null), 5000);
    } finally {
      setIsSuggesting(false);
    }
  };

  // Inicializar tempSettings cuando se abre el modal
  useEffect(() => {
    if (showSettingsModal && currentSettings) {
      setTempSettings({
        work_duration: currentSettings.work_duration,
        short_break: currentSettings.short_break,
        long_break: currentSettings.long_break,
        poms_before_long: currentSettings.poms_before_long
      });
    }
  }, [showSettingsModal, currentSettings]);

  // Guardar configuración
  const handleSaveSettings = () => {
    if (activeProfileId) {
      updateSettings(activeProfileId, tempSettings);
      setShowSettingsModal(false);
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
    } else {
      // Limpiar el intervalo si no está activo
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isActive, timeLeft]);

  const handleStart = () => {
    if (!isActive) {
      // Iniciar nueva sesión
      startTimeRef.current = Date.now();
      sessionStartedRef.current = new Date().toISOString();
      sessionSavedRef.current = false; // Resetear el flag
    }
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
    // Actualizar el tiempo inicial para que refleje el tiempo restante
    initialDurationRef.current = timeLeft;
    // Resetear el timestamp de inicio para que se recalcule al reanudar
    startTimeRef.current = null;
  };

  const handleReset = () => {
    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
    sessionStartedRef.current = null;
    sessionSavedRef.current = false;
    
    if (currentSettings) {
      const mins = mode === 'work' ? currentSettings.work_duration : mode === 'short_break' ? currentSettings.short_break : currentSettings.long_break;
      const seconds = mins * 60;
      setTimeLeft(seconds);
      initialDurationRef.current = seconds;
    }
  };

  const handleComplete = () => {
    // FIX 3: Prevenir que se guarde la sesión más de una vez
    if (sessionSavedRef.current) {
      console.log("⚠️ Sesión ya guardada, evitando duplicación");
      return;
    }

    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // FIX 2: Calcular el tiempo REAL trabajado
    const actualDuration = initialDurationRef.current - timeLeft; // En segundos
    const actualMinutes = Math.round(actualDuration / 60);

    console.log(`✅ Sesión completada: ${actualMinutes} minutos trabajados`);

    if (mode === 'work' && activeProfileId && sessionStartedRef.current) {
      // Marcar como guardada ANTES de guardar para prevenir duplicación
      sessionSavedRef.current = true;

      addSession({
        profile_id: activeProfileId,
        task_id: selectedItem?.type === 'task' ? selectedItem.id : null,
        exam_topic_id: selectedItem?.type === 'topic' ? selectedItem.id : null,
        material_id: selectedItem?.type === 'material' ? selectedItem.id : null,
        started_at: sessionStartedRef.current,
        ended_at: new Date().toISOString(),
        duration_minutes: actualMinutes, // FIX 2: Usar tiempo REAL
        rating: 0,
        notes: null
      });

      setShowCompletionModal(true);
      setSessionCount(prev => prev + 1);
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
        <div className="flex items-center justify-between w-full mb-8">
          <div className={`flex gap-3 p-2 rounded-[2rem] border-2 shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            {(['work', 'short_break', 'long_break'] as const).map(m => (
              <button
                key={m}
                onClick={() => { 
                  if (!isActive) {
                    setMode(m); 
                    handleReset(); 
                  }
                }}
                disabled={isActive}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  mode === m 
                    ? 'bg-indigo-600 text-white shadow-lg scale-105' 
                    : theme === 'dark' 
                      ? 'text-slate-400 hover:text-white' 
                      : 'text-slate-500 hover:text-slate-900'
                } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {m === 'work' ? '💪 Trabajo' : m === 'short_break' ? '☕ Descanso' : '🌴 Descanso Largo'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className={`p-4 rounded-2xl border-2 transition-all hover:scale-110 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-100 text-slate-500 hover:text-slate-900'}`}
          >
            <Settings size={20} />
          </button>
        </div>
      )}

      <div className={`relative mb-16 ${isFullscreen ? 'scale-[2.5]' : ''}`}>
        <svg className="transform -rotate-90" width="320" height="320">
          <circle cx="160" cy="160" r="140" stroke={theme === 'dark' || isFullscreen ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="20" fill="none" />
          <circle 
            cx="160" cy="160" r="140"
            stroke="url(#gradient)"
            strokeWidth="20"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 140}`}
            strokeDashoffset={`${2 * Math.PI * 140 * (1 - (timeLeft / initialDurationRef.current))}`}
            className="transition-all duration-300 ease-linear"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className={`text-7xl font-black tracking-tight ${theme === 'dark' || isFullscreen ? 'text-white' : 'text-slate-900'}`}>
            {formatTime(timeLeft)}
          </p>
          <p className={`text-sm font-black uppercase tracking-[0.3em] mt-2 ${theme === 'dark' || isFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>
            {mode === 'work' ? 'Enfocado' : mode === 'short_break' ? 'Descansa' : 'Relájate'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-12">
        {!isActive ? (
          <button onClick={handleStart} className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
            <Play size={40} fill="white" />
          </button>
        ) : (
          <button onClick={handlePause} className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all">
            <Pause size={40} fill="white" />
          </button>
        )}
        <button onClick={handleReset} className={`p-8 rounded-full border-2 transition-all hover:scale-110 active:scale-90 ${theme === 'dark' || isFullscreen ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-100 text-slate-400'}`}>
          <RotateCcw size={32} />
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

      {/* Modal de Configuración */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-8 z-[300]">
          <div className={`w-full max-w-md rounded-[3rem] p-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300 ${theme === 'dark' ? 'bg-slate-900 border border-white/5' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black">⚙️ Configuración</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">💪 Trabajo (minutos)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="60"
                  value={tempSettings.work_duration}
                  onChange={e => setTempSettings({...tempSettings, work_duration: parseInt(e.target.value)})}
                  className={`w-full p-4 rounded-2xl font-bold text-lg outline-none ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-900'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">☕ Descanso Corto (minutos)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="30"
                  value={tempSettings.short_break}
                  onChange={e => setTempSettings({...tempSettings, short_break: parseInt(e.target.value)})}
                  className={`w-full p-4 rounded-2xl font-bold text-lg outline-none ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-900'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">🌴 Descanso Largo (minutos)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="60"
                  value={tempSettings.long_break}
                  onChange={e => setTempSettings({...tempSettings, long_break: parseInt(e.target.value)})}
                  className={`w-full p-4 rounded-2xl font-bold text-lg outline-none ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-900'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">🔄 Pomodoros antes de descanso largo</label>
                <input 
                  type="number" 
                  min="2" 
                  max="10"
                  value={tempSettings.poms_before_long}
                  onChange={e => setTempSettings({...tempSettings, poms_before_long: parseInt(e.target.value)})}
                  className={`w-full p-4 rounded-2xl font-bold text-lg outline-none ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-900'}`}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveSettings}
                className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompletionModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl flex items-center justify-center p-8 z-[300]">
          <div className={`w-full max-w-xl rounded-[4rem] p-16 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in duration-500 ${theme === 'dark' ? 'bg-slate-900 border border-white/5' : 'bg-white'}`}>
            <div className="w-32 h-32 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl rotate-3">
              <Trophy size={64} />
            </div>
            <h2 className="text-4xl font-black text-center mb-4">¡Pomodoro Completado!</h2>
            <p className="text-center text-slate-500 font-medium mb-10">Has terminado {sessionCount} sesión{sessionCount > 1 ? 'es' : ''} de enfoque profundo.</p>
            
            <div className="flex justify-center gap-3 mb-10">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => setRating(star)} className={`transition-all hover:scale-125 ${rating >= star ? 'text-amber-400' : 'text-slate-300'}`}>
                  <Star size={40} fill={rating >= star ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>

            <button 
              onClick={() => { setShowCompletionModal(false); setRating(0); }}
              className="w-full py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-lg rounded-[2rem] shadow-2xl hover:shadow-indigo-500/50 transition-all"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;
