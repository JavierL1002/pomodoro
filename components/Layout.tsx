
import React, { useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { 
  ClipboardList, BookOpen, Timer, BarChart3, Settings, 
  LogOut, LayoutGrid, LayoutDashboard, GraduationCap, FileText,
  Moon, Sun, Menu, X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { theme, toggleTheme, profiles, activeProfileId, setActiveProfile } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'subjects', label: 'Materias', icon: GraduationCap },
    { id: 'exams', label: 'Exámenes', icon: FileText },
    { id: 'tasks', label: 'Tareas', icon: ClipboardList },
    { id: 'materials', label: 'Estudio', icon: BookOpen },
    { id: 'pomodoro', label: 'PomoSmart', icon: Timer },
    { id: 'statistics', label: 'Analíticas', icon: BarChart3 },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  if (!activeProfile) return <>{children}</>;

  const Navigation = () => (
    <nav className="flex-1 space-y-2 py-4">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            setActiveTab(item.id);
            setIsMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${
            activeTab === item.id 
              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-[1.02]' 
              : theme === 'dark' ? 'text-slate-400 hover:bg-slate-700/50 hover:text-white' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
          }`}
        >
          <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
          {item.label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className={`flex min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-[#F8FAFF] text-slate-900'}`}>
      
      {/* Sidebar para Escritorio */}
      <aside className={`hidden lg:flex w-72 flex-col sticky top-0 h-screen border-r transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="p-8 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-white font-black text-2xl shadow-2xl transition-transform hover:rotate-3" style={{ backgroundColor: activeProfile.color }}>
              {activeProfile.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <h2 className="font-black text-lg leading-tight truncate">{activeProfile.name}</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mt-0.5">{activeProfile.type}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setActiveProfile(null)} className={`flex items-center justify-center p-3 border rounded-xl transition-all ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-100 hover:bg-slate-50 text-slate-500'}`} title="Cambiar Perfil">
              <LayoutGrid size={18} />
            </button>
            <button onClick={toggleTheme} className={`flex items-center justify-center p-3 border rounded-xl transition-all ${theme === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-amber-400' : 'border-slate-100 hover:bg-slate-50 text-slate-500'}`} title="Cambiar Tema">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div className="flex-1 px-6 overflow-y-auto">
          <Navigation />
        </div>

        <div className="p-8 mt-auto border-t border-slate-100 dark:border-slate-800">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
            <LogOut size={20} />
            Salir
          </button>
        </div>
      </aside>

      {/* Mobile Nav Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 px-6 flex items-center justify-between z-50 backdrop-blur-md border-b bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg" style={{ backgroundColor: activeProfile.color }}>
              {activeProfile.name.charAt(0)}
            </div>
            <span className="font-black tracking-tight">{activeProfile.name}</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2">
            <Menu size={28} />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="flex flex-col h-full p-8">
                <div className="flex justify-end mb-8">
                    <button onClick={() => setIsMobileMenuOpen(false)} className="text-white p-2 bg-white/10 rounded-full">
                        <X size={32} />
                    </button>
                </div>
                <div className="text-white space-y-4">
                   <Navigation />
                </div>
            </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto w-full pt-24 lg:pt-0 ${theme === 'dark' ? 'scrollbar-dark' : 'scrollbar-light'}`}>
        <div className="p-6 md:p-12 lg:p-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
