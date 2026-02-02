import { AppointmentStatus } from './types';

export const APP_NAME = "ProTrack Manager";

export const DEFAULT_REMINDER_TEMPLATE = "Hello {name}, this is a reminder for your appointment on {date}. Please confirm your availability.";

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: "bg-blue-100 text-blue-800 border-blue-200",
  [AppointmentStatus.COMPLETED]: "bg-green-100 text-green-800 border-green-200",
  [AppointmentStatus.MISSED]: "bg-red-100 text-red-800 border-red-200",
  [AppointmentStatus.CANCELLED]: "bg-gray-100 text-gray-800 border-gray-200",
};
