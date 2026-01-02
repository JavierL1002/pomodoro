
export type ProfileType = 'universidad' | 'trabajo' | 'personal' | 'otro';
export type Gender = 'masculino' | 'femenino' | 'otro';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  user_name: string;
  gender: Gender;
  type: ProfileType;
  color: string;
  icon: string;
}

export interface SchoolPeriod {
  id: string;
  profile_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Subject {
  id: string;
  profile_id: string;
  school_period_id: string;
  name: string;
  color: string;
  professor_name?: string;
  classroom?: string;
  // Added properties used in SubjectManager
  start_date?: string;
  end_date?: string;
  code?: string;
  icon?: string;
}

export interface ClassSchedule {
  id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'late';

export interface Task {
  id: string;
  subject_id: string;
  title: string;
  description?: string;
  due_date: string;
  priority: Priority;
  status: TaskStatus;
  estimated_pomodoros: number;
  completed_pomodoros: number;
  alert_days_before: number;
}

export interface Exam {
  id: string;
  subject_id: string;
  name: string;
  exam_date: string;
  status: 'upcoming' | 'completed' | 'missed';
  // Added properties used in ExamManager
  duration_minutes: number;
  weight_percentage: number;
  alert_days_before: number;
}

export interface ExamTopic {
  id: string;
  exam_id: string;
  title: string;
  estimated_pomodoros: number;
  completed_pomodoros: number;
  status: 'not_started' | 'in_progress' | 'completed';
}

export type MaterialType = 'libro' | 'articulo' | 'video' | 'curso' | 'documento' | 'otro';
export interface Material {
  id: string;
  profile_id: string;
  title: string;
  type: MaterialType;
  total_units: number;
  completed_units: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
}

export interface PomodoroSettings {
  profile_id: string;
  work_duration: number;
  short_break: number;
  long_break: number;
  poms_before_long: number;
  auto_start_breaks: boolean;
}

export interface PomodoroSession {
  id: string;
  profile_id: string;
  task_id?: string;
  exam_topic_id?: string;
  material_id?: string;
  session_type: 'work' | 'short_break' | 'long_break';
  planned_duration_minutes: number;
  // Changed property name to duration_seconds as expected by views
  duration_seconds: number;
  // Added status to track completed sessions
  status: 'completed' | 'interrupted';
  focus_rating?: number;
  started_at: string;
  completed_at: string;
}

// Added Alert interface for Dashboard
export interface Alert {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  priority: Priority;
  is_read: boolean;
  created_at: string;
}
