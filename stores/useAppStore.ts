import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { 
  Profile, SchoolPeriod, Subject, ClassSchedule, Task, Exam, 
  ExamTopic, Material, PomodoroSession, PomodoroSettings, Alert
} from '../types';

// =================================================================
// FUNCIONES DE AYUDA PARA SUPABASE
// =================================================================

const insertToSupabase = async (table: string, data: any) => {
  const { error } = await supabase.from(table).insert([data]);
  if (error) console.error(`Error al guardar en ${table}:`, error);
};

const deleteFromSupabase = async (table: string, id: string) => {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) console.error(`Error al eliminar de ${table}:`, error);
};

const updateSupabase = async (table: string, id: string, updates: Partial<any>) => {
  const { error } = await supabase.from(table).update(updates).eq('id', id);
  if (error) console.error(`Error al actualizar ${table}:`, error);
};

// =================================================================
// ESTADO DE LA APLICACIÓN
// =================================================================

interface AppState {
  theme: 'light' | 'dark';
  profiles: Profile[];
  activeProfileId: string | null;
  periods: SchoolPeriod[];
  subjects: Subject[];
  schedules: ClassSchedule[];
  tasks: Task[];
  exams: Exam[];
  examTopics: ExamTopic[];
  materials: Material[];
  sessions: PomodoroSession[];
  settings: Record<string, PomodoroSettings>;
  alerts: Alert[];

  toggleTheme: () => void;
  addProfile: (profile: Omit<Profile, 'id'>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setActiveProfile: (id: string | null) => void;
  addPeriod: (period: Omit<SchoolPeriod, 'id'>) => void;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  addSchedule: (schedule: Omit<ClassSchedule, 'id'>) => void;
  addTask: (task: Omit<Task, 'id' | 'completed_pomodoros'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  addExam: (exam: Omit<Exam, 'id'>) => void;
  addExamTopic: (topic: Omit<ExamTopic, 'id' | 'completed_pomodoros'>) => void;
  addMaterial: (material: Omit<Material, 'id'>) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  addSession: (session: Omit<PomodoroSession, 'id'>) => void;
  updateSettings: (profileId: string, updates: Partial<PomodoroSettings>) => void;
  markAlertRead: (id: string) => void;
  syncWithSupabase: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      profiles: [],
      activeProfileId: null,
      periods: [],
      subjects: [],
      schedules: [],
      tasks: [],
      exams: [],
      examTopics: [],
      materials: [],
      sessions: [],
      settings: {},
      alerts: [],

      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      syncWithSupabase: async () => {
        console.log("Sincronizando con Supabase...");
        // Aquí iría la lógica de carga inicial
      },

      addProfile: async (profile) => {
        const id = crypto.randomUUID();
        // Nota: El SQL del usuario requiere user_id de auth.users. 
        // Si no hay auth, esto fallará a menos que user_id sea opcional o usemos un dummy.
        const newProfile = { ...profile, id, user_id: (await supabase.auth.getUser()).data.user?.id || '00000000-0000-0000-0000-000000000000' };
        await insertToSupabase('profiles', newProfile);
        
        set((state) => ({
          profiles: [...state.profiles, newProfile],
          settings: { ...state.settings, [id]: { profile_id: id, work_duration: 25, short_break: 5, long_break: 15, poms_before_long: 4, auto_start_breaks: false } }
        }));
      },

      deleteProfile: async (id) => {
        await deleteFromSupabase('profiles', id);
        set((state) => ({
          profiles: state.profiles.filter(p => p.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId
        }));
      },

      setActiveProfile: (id) => set({ activeProfileId: id }),

      addPeriod: (period) => {
        const newPeriod = { ...period, id: crypto.randomUUID() };
        insertToSupabase('school_periods', newPeriod);
        set((state) => ({ periods: [...state.periods, newPeriod] }));
      },

      addSubject: (subject) => {
        const newSubject = { ...subject, id: crypto.randomUUID() };
        insertToSupabase('subjects', newSubject);
        set((state) => ({ subjects: [...state.subjects, newSubject] }));
      },

      addSchedule: (schedule) => {
        const newSchedule = { ...schedule, id: crypto.randomUUID() };
        insertToSupabase('class_schedule', newSchedule);
        set((state) => ({ schedules: [...state.schedules, newSchedule] }));
      },

      addTask: (task) => {
        const newTask = { ...task, id: crypto.randomUUID(), completed_pomodoros: 0 };
        insertToSupabase('tasks', newTask);
        set((state) => ({ tasks: [...state.tasks, newTask] }));
      },

      updateTask: (id, updates) => {
        updateSupabase('tasks', id, updates);
        set((state) => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t) }));
      },

      addExam: (exam) => {
        const newExam = { ...exam, id: crypto.randomUUID() };
        insertToSupabase('exams', newExam);
        set((state) => ({ exams: [...state.exams, newExam] }));
      },

      addExamTopic: (topic) => {
        const newTopic = { ...topic, id: crypto.randomUUID(), completed_pomodoros: 0 };
        insertToSupabase('exam_topics', newTopic);
        set((state) => ({ examTopics: [...state.examTopics, newTopic] }));
      },

      addMaterial: (material) => {
        const newMaterial = { ...material, id: crypto.randomUUID() };
        // El SQL del usuario usa 'study_materials'
        insertToSupabase('study_materials', newMaterial);
        set((state) => ({ materials: [...state.materials, newMaterial] }));
      },

      updateMaterial: (id, updates) => {
        updateSupabase('study_materials', id, updates);
        set((state) => ({ materials: state.materials.map(m => m.id === id ? { ...m, ...updates } : m) }));
      },

      addSession: (session) => {
        const id = crypto.randomUUID();
        // El SQL del usuario usa 'pomodoro_sessions'
        insertToSupabase('pomodoro_sessions', { ...session, id });
        set((state) => ({ sessions: [...state.sessions, { ...session, id }] }));
      },

      updateSettings: (profileId, updates) => {
        // El SQL del usuario usa 'pomodoro_default_settings'
        updateSupabase('pomodoro_default_settings', profileId, updates);
        set((state) => ({ settings: { ...state.settings, [profileId]: { ...state.settings[profileId], ...updates } } }));
      },

      markAlertRead: (id) => {
        updateSupabase('alerts', id, { is_dismissed: true });
        set((state) => ({ alerts: state.alerts.map(a => a.id === id ? { ...a, is_read: true } : a) }));
      }
    }),
    { name: 'pomosmart-cloud-v1' }
  )
);
