
import React, { useState, useEffect } from 'react';
import { useAppStore } from './stores/useAppStore';
import Layout from './components/Layout';
import ProfileCard from './components/ProfileCard';
import Dashboard from './components/Dashboard';
import TaskBoard from './components/TaskBoard';
import MaterialManager from './components/MaterialManager';
import PomodoroTimer from './components/PomodoroTimer';
import StatisticsView from './components/StatisticsView';
import SubjectManager from './components/SubjectManager';
import ExamManager from './components/ExamManager';
import { Plus, GraduationCap, Briefcase, Trash2, ArrowRight, CheckCircle2, Moon, Sun, Save } from 'lucide-react';
import { ProfileType, Gender, PomodoroSettings } from './types';

const App: React.FC = () => {
  const { theme, toggleTheme, profiles, activeProfileId, setActiveProfile, addProfile, deleteProfile, settings, updateSettings, syncWithSupabase } = useAppStore();
  
  // Cargar datos desde Supabase al iniciar la aplicación
  useEffect(() => {
    syncWithSupabase();
  }, []);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [newProfileType, setNewProfileType] = useState<ProfileType>('universidad');
  const [newProfileName, setNewProfileName] = useState('');
  const [userName, setUserName] = useState('');
  const [userGender, setUserGender] = useState<Gender>('femenino');

  // Local state for settings form
  const [localSettings, setLocalSettings] = useState<PomodoroSettings | null>(null);

  useEffect(() => {
    if (activeProfileId) {
      // Si existen settings para este perfil, usarlos; si no, usar valores por defecto
      setLocalSettings(settings[activeProfileId] || {
        work_duration: 25,
        short_break: 5,
        long_break: 15,
        poms_before_long: 4,
        auto_start_breaks: false
      });
    }
  }, [activeProfileId, settings]);

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProfileName.trim() && userName.trim()) {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
      const color = colors[profiles.length % colors.length];
      addProfile({
        name: newProfileName,
        user_name: userName,
        gender: userGender,
        type: newProfileType,
        color: color,
        icon: 'user',
        user_id: 'local-user'
      });
      setShowCreateProfile(false);
      setNewProfileName('');
      setUserName('');
    }
  };

  const handleDeleteProfile = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm("¿Seguro que quieres eliminar este perfil? Se perderán todos sus datos y configuraciones.")) {
          deleteProfile(id);
      }
  };

  const handleSaveSettings = () => {
    if (activeProfileId && localSettings) {
      console.log("📥 Guardando configuración:", localSettings);
      updateSettings(activeProfileId, localSettings);
      alert("✅ Configuración guardada correctamente. Los cambios se aplicarán en el próximo ciclo de Pomodoro.");
    } else {
      console.error("❌ No se pudo guardar: activeProfileId=", activeProfileId, "localSettings=", localSettings);
      alert("❌ Error: No se pudo guardar la configuración. Intenta recargar la página.");
    }
  };

  // Profile Selector View
  if (!activeProfileId) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        
        <div className="absolute top-6 right-6">
            <button onClick={toggleTheme} className={`p-4 rounded-full border transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-slate-200 text-slate-600'}`}>
                {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
            </button>
        </div>

        <div className="text-center mb-16 max-w-2xl animate-in fade-in slide-in-from-bottom duration-700">
          <h1 className="text-7xl font-black mb-6 tracking-tight">PomoSmart<span className="text-indigo-600">.</span></h1>
          <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-xl font-medium leading-relaxed`}>
            Tu centro de comando académico definitivo. <br className="hidden md:block" />
            Organiza, enfoca y domina tu semestre.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-10 mb-12 max-w-6xl">
          {profiles.map(p => (
            <div key={p.id} className="relative group">
                <ProfileCard profile={p} onClick={() => setActiveProfile(p.id)} />
                <button 
                    onClick={(e) => handleDeleteProfile(e, p.id)}
                    className={`absolute -top-3 -right-3 p-2 border rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-500 hover:text-red-400' : 'bg-white border-slate-200 text-slate-400 hover:text-red-500'}`}
                >
                    <Trash2 size={16} />
                </button>
            </div>
          ))}

          {!showCreateProfile && (
            <button
              onClick={() => setShowCreateProfile(true)}
              className={`flex flex-col items-center justify-center p-8 border-4 border-dashed rounded-[2.5rem] transition-all w-full max-w-xs aspect-square group ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:border-indigo-500 hover:bg-slate-700/50' : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'}`}
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all ${theme === 'dark' ? 'bg-slate-700 text-slate-500 group-hover:bg-indigo-900 group-hover:text-indigo-400' : 'bg-slate-100 text-slate-300 group-hover:bg-indigo-100 group-hover:text-indigo-400'}`}>
                <Plus size={48} strokeWidth={3} />
              </div>
              <h3 className={`text-xl font-black ${theme === 'dark' ? 'text-slate-500 group-hover:text-indigo-400' : 'text-slate-300 group-hover:text-indigo-400'}`}>Nuevo Perfil</h3>
            </button>
          )}

          {showCreateProfile && (
            <div className={`p-10 rounded-[3rem] shadow-2xl border w-full max-w-lg animate-in zoom-in duration-300 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
              <h2 className="text-3xl font-black mb-8 tracking-tight">Crear Perfil</h2>
              <form onSubmit={handleCreateProfile} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>Nombre Perfil</label>
                    <input type="text" required value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} className={`w-full p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 ${theme === 'dark' ? 'bg-slate-700 border-none' : 'bg-slate-50 border-none'}`} placeholder="Ej: Universidad" />
                  </div>
                  <div>
                    <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>Tu Nombre</label>
                    <input type="text" required value={userName} onChange={(e) => setUserName(e.target.value)} className={`w-full p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 ${theme === 'dark' ? 'bg-slate-700 border-none' : 'bg-slate-50 border-none'}`} placeholder="Ej: María" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>Tipo</label>
                    <select value={newProfileType} onChange={(e) => setNewProfileType(e.target.value as ProfileType)} className={`w-full p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900'}`}>
                        <option value="universidad">Universidad</option>
                        <option value="trabajo">Trabajo</option>
                        <option value="personal">Personal</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`}>Género</label>
                    <select value={userGender} onChange={(e) => setUserGender(e.target.value as Gender)} className={`w-full p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900'}`}>
                        <option value="femenino">Femenino</option>
                        <option value="masculino">Masculino</option>
                        <option value="otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowCreateProfile(false)} className={`flex-1 p-4 font-bold rounded-2xl transition-all ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>Cancelar</button>
                  <button type="submit" className="flex-1 p-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    Comenzar <ArrowRight size={20} />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Profile Main View
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'subjects' && <SubjectManager />}
          {activeTab === 'exams' && <ExamManager />}
          {activeTab === 'tasks' && <TaskBoard />}
          {activeTab === 'materials' && <MaterialManager />}
          {activeTab === 'pomodoro' && <PomodoroTimer />}
          {activeTab === 'statistics' && <StatisticsView />}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto py-10">
              <h1 className={`text-4xl font-black mb-10 tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Preferencias del Perfil</h1>
              <div className={`p-10 rounded-[3rem] border shadow-sm space-y-12 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <section>
                  <h3 className={`text-2xl font-black mb-8 flex items-center gap-3 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      <div className="w-2.5 h-10 bg-indigo-500 rounded-full" />
                      Tiempos del Pomodoro
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tiempo de Trabajo (minutos)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={localSettings?.work_duration?.toString() || '25'} 
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Solo permitir números
                          if (inputValue === '' || /^\d+$/.test(inputValue)) {
                            const numValue = inputValue === '' ? 25 : Math.min(Math.max(parseInt(inputValue), 1), 60);
                            setLocalSettings(prev => prev ? { ...prev, work_duration: numValue } : { work_duration: numValue, short_break: 5, long_break: 15, poms_before_long: 4, auto_start_breaks: false });
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                            setLocalSettings(prev => prev ? { ...prev, work_duration: 25 } : { work_duration: 25, short_break: 5, long_break: 15, poms_before_long: 4, auto_start_breaks: false });
                          }
                        }}
                        className={`w-full p-5 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold text-lg transition-all ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900 border border-slate-100'}`} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Descanso Corto (minutos)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={localSettings?.short_break?.toString() || '5'} 
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue === '' || /^\d+$/.test(inputValue)) {
                            const numValue = inputValue === '' ? 5 : Math.min(Math.max(parseInt(inputValue), 1), 30);
                            setLocalSettings(prev => prev ? { ...prev, short_break: numValue } : { work_duration: 25, short_break: numValue, long_break: 15, poms_before_long: 4, auto_start_breaks: false });
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                            setLocalSettings(prev => prev ? { ...prev, short_break: 5 } : { work_duration: 25, short_break: 5, long_break: 15, poms_before_long: 4, auto_start_breaks: false });
                          }
                        }}
                        className={`w-full p-5 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold text-lg transition-all ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900 border border-slate-100'}`} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Descanso Largo (minutos)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={localSettings?.long_break?.toString() || '15'} 
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue === '' || /^\d+$/.test(inputValue)) {
                            const numValue = inputValue === '' ? 15 : Math.min(Math.max(parseInt(inputValue), 1), 60);
                            setLocalSettings(prev => prev ? { ...prev, long_break: numValue } : { work_duration: 25, short_break: 5, long_break: numValue, poms_before_long: 4, auto_start_breaks: false });
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                            setLocalSettings(prev => prev ? { ...prev, long_break: 15 } : { work_duration: 25, short_break: 5, long_break: 15, poms_before_long: 4, auto_start_breaks: false });
                          }
                        }}
                        className={`w-full p-5 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold text-lg transition-all ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900 border border-slate-100'}`} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Pomodoros hasta Descanso Largo</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        value={localSettings?.poms_before_long?.toString() || '4'} 
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue === '' || /^\d+$/.test(inputValue)) {
                            const numValue = inputValue === '' ? 4 : Math.min(Math.max(parseInt(inputValue), 2), 10);
                            setLocalSettings(prev => prev ? { ...prev, poms_before_long: numValue } : { work_duration: 25, short_break: 5, long_break: 15, poms_before_long: numValue, auto_start_breaks: false });
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                            setLocalSettings(prev => prev ? { ...prev, poms_before_long: 4 } : { work_duration: 25, short_break: 5, long_break: 15, poms_before_long: 4, auto_start_breaks: false });
                          }
                        }}
                        className={`w-full p-5 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/20 font-bold text-lg transition-all ${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-900 border border-slate-100'}`} 
                      />
                    </div>
                  </div>
                </section>

                <section>
                   <h3 className={`text-2xl font-black mb-8 flex items-center gap-3 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                      <div className="w-2.5 h-10 bg-indigo-500 rounded-full" />
                      Automatización
                  </h3>
                  <div className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-700/50 rounded-3xl border border-slate-100 dark:border-slate-600">
                    <div>
                      <h4 className="font-bold">Auto-iniciar descansos</h4>
                      <p className="text-xs text-slate-400 font-medium">Comienza el descanso automáticamente al terminar el trabajo.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={localSettings?.auto_start_breaks || false}
                      onChange={(e) => setLocalSettings(prev => prev ? { ...prev, auto_start_breaks: e.target.checked } : null)}
                      className="w-6 h-6 rounded-lg accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </section>

                <button 
                  onClick={handleSaveSettings}
                  className="w-full bg-indigo-600 text-white font-black py-6 rounded-3xl shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 text-lg"
                >
                  Guardar Preferencias <Save size={24} />
                </button>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </div>
  );
};

export default App;
