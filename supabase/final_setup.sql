-- ============================================
-- SISTEMA ACADÉMICO COMPLETO CON POMODORO INTELIGENTE
-- Versión 3.0 - DEFINITIVA Y COMPLETA
-- ============================================

-- LIMPIEZA PREVIA (Para evitar errores de "already exists")
DROP TRIGGER IF EXISTS trigger_create_default_settings ON profiles;
DROP TRIGGER IF EXISTS trigger_create_default_task_types ON profiles;
DROP TRIGGER IF EXISTS trigger_update_pomodoro_counters ON pomodoro_sessions;
DROP TRIGGER IF EXISTS trigger_create_task_alerts ON tasks;
DROP TRIGGER IF EXISTS trigger_create_exam_alerts ON exams;
DROP TRIGGER IF EXISTS trigger_refresh_stats ON pomodoro_sessions;

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- Opcional para pruebas iniciales
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('universidad', 'trabajo', 'personal', 'otro')),
  user_name VARCHAR(100) NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('masculino', 'femenino', 'otro')),
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT '🎓',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CONFIGURACIÓN DE POMODORO
CREATE TABLE IF NOT EXISTS pomodoro_default_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  work_duration_minutes INTEGER DEFAULT 25 CHECK (work_duration_minutes > 0),
  short_break_minutes INTEGER DEFAULT 5 CHECK (short_break_minutes > 0),
  long_break_minutes INTEGER DEFAULT 15 CHECK (long_break_minutes > 0),
  pomodoros_until_long_break INTEGER DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PERÍODOS ESCOLARES
CREATE TABLE IF NOT EXISTS school_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(200) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_period CHECK (end_date > start_date)
);

-- 4. MATERIAS
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  school_period_id UUID REFERENCES school_periods(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50),
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50) DEFAULT '📚',
  professor_name VARCHAR(200),
  professor_email VARCHAR(200),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  classroom VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_subject_period CHECK (end_date >= start_date)
);

-- 5. HORARIO DE CLASES
CREATE TABLE IF NOT EXISTS class_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_class_time CHECK (end_time > start_time)
);

-- 6. TIPOS DE TAREAS
CREATE TABLE IF NOT EXISTS task_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  icon VARCHAR(50) DEFAULT '📝',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_task_type_name UNIQUE (profile_id, name)
);

-- 7. TAREAS
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  task_type_id UUID REFERENCES task_types(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  assigned_date DATE,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  composition_time_minutes INTEGER,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'late')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  custom_pomodoro_duration INTEGER,
  estimated_pomodoros INTEGER DEFAULT 1,
  completed_pomodoros INTEGER DEFAULT 0,
  alert_days_before INTEGER DEFAULT 1,
  alert_sent BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. EXÁMENES
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  exam_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  exam_type VARCHAR(50) CHECK (exam_type IN ('parcial', 'final', 'quiz', 'otro')),
  weight_percentage DECIMAL(5,2),
  status VARCHAR(50) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'missed')),
  grade DECIMAL(5,2),
  max_grade DECIMAL(5,2),
  alert_days_before INTEGER DEFAULT 3,
  alert_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TEMAS DE EXAMEN
CREATE TABLE IF NOT EXISTS exam_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  custom_pomodoro_duration INTEGER,
  status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  estimated_pomodoros INTEGER DEFAULT 1,
  completed_pomodoros INTEGER DEFAULT 0,
  notes TEXT,
  resources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. MATERIAL DE ESTUDIO
CREATE TABLE IF NOT EXISTS study_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('libro', 'articulo', 'video', 'curso', 'documento', 'otro')),
  author VARCHAR(200),
  description TEXT,
  url TEXT,
  total_units INTEGER,
  completed_units INTEGER DEFAULT 0,
  unit_type VARCHAR(50) DEFAULT 'páginas',
  status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'paused')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  custom_pomodoro_duration INTEGER,
  estimated_pomodoros INTEGER DEFAULT 1,
  completed_pomodoros INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. SESIONES DE POMODORO
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  exam_topic_id UUID REFERENCES exam_topics(id) ON DELETE SET NULL,
  material_id UUID REFERENCES study_materials(id) ON DELETE SET NULL,
  session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('work', 'short_break', 'long_break')),
  planned_duration_minutes INTEGER NOT NULL,
  actual_duration_seconds INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('completed', 'interrupted', 'skipped')),
  focus_rating INTEGER CHECK (focus_rating BETWEEN 1 AND 5),
  notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. ALERTAS
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  is_dismissed BOOLEAN DEFAULT false,
  alert_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. MENSAJES MOTIVACIONALES (De tu código original)
CREATE TABLE IF NOT EXISTS motivational_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  gender_target VARCHAR(20) DEFAULT 'ambos' CHECK (gender_target IN ('masculino', 'femenino', 'ambos')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNCIONES AVANZADAS (De tu código original)
-- ============================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar contadores de pomodoros automáticamente
CREATE OR REPLACE FUNCTION update_pomodoro_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_type = 'work' AND NEW.status = 'completed' THEN
    IF NEW.task_id IS NOT NULL THEN
      UPDATE tasks SET completed_pomodoros = completed_pomodoros + 1 WHERE id = NEW.task_id;
    ELSIF NEW.exam_topic_id IS NOT NULL THEN
      UPDATE exam_topics SET completed_pomodoros = completed_pomodoros + 1 WHERE id = NEW.exam_topic_id;
    ELSIF NEW.material_id IS NOT NULL THEN
      UPDATE study_materials SET completed_pomodoros = completed_pomodoros + 1 WHERE id = NEW.material_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para crear configuración por defecto
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pomodoro_default_settings (profile_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para crear tipos de tareas por defecto
CREATE OR REPLACE FUNCTION create_default_task_types()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO task_types (profile_id, name, icon) VALUES
    (NEW.id, 'Trabajo', '📝'),
    (NEW.id, 'Exposición', '🎤'),
    (NEW.id, 'Debate', '💬'),
    (NEW.id, 'Otras', '📋');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER trigger_create_default_settings 
AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION create_default_settings();

CREATE TRIGGER trigger_create_default_task_types 
AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION create_default_task_types();

CREATE TRIGGER trigger_update_pomodoro_counters 
AFTER INSERT ON pomodoro_sessions FOR EACH ROW EXECUTE FUNCTION update_pomodoro_counters();

-- ============================================
-- SEGURIDAD (RLS) - ACCESO PÚBLICO
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_default_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivational_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON pomodoro_default_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON school_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON class_schedule FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON task_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON exam_topics FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON study_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON pomodoro_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON motivational_messages FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- DATOS INICIALES
-- ============================================

INSERT INTO profiles (id, name, type, user_name, gender, is_active, color, icon)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'Mi Perfil', 
  'universidad', 
  'Usuario', 
  'masculino', 
  true, 
  '#4F46E5', 
  '🎓'
) ON CONFLICT (id) DO NOTHING;

-- Mensajes motivacionales iniciales
INSERT INTO motivational_messages (message, gender_target) VALUES
('¡Vamos {nombre}, tú puedes con esto!', 'ambos'),
('El éxito es la suma de pequeños esfuerzos repetidos día tras día.', 'ambos'),
('Enfócate en el progreso, no en la perfección.', 'ambos');
