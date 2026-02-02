
export interface Subject {
  id: string;
  name: string;
  email?: string;
  phone?: string; // Primary Mobile
  altPhone?: string; // Alternative Mobile
  insertionDate?: string; // Date of Insertion
  notes?: string;
}

export enum AppointmentStatus {
  SCHEDULED = 'Scheduled',
  COMPLETED = 'Completed',
  MISSED = 'Missed',
  CANCELLED = 'Cancelled'
}

export interface Appointment {
  id: string;
  subjectId: string;
  date: string; // ISO String
  status: AppointmentStatus;
  followUpReason?: string; // If missed or specific follow up needed
  notes?: string;
}

export interface ReminderConfig {
  daysBefore: number;
  template: string;
}

export type ChangeType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  subjectId: string;
  subjectName: string;
  changeType: ChangeType;
  details: string; // Auto-generated diff description
  comment: string; // User's manual comment
}

export type UserRole = 'ADMIN' | 'USER';

export interface User {
  username: string;
  password: string; // In a real app, this should be hashed.
  role: UserRole;
  name: string;
}

export type ViewState = 'dashboard' | 'subjects' | 'calendar' | 'communications' | 'changelog' | 'users' | 'export';
