import { GoogleGenAI } from "@google/genai";
import { Appointment, AppointmentStatus, Subject } from "../types";

/**
 * Generates a follow-up message using Gemini 3 Flash.
 * Follows @google/genai guidelines for model selection and property access.
 */
export const generateFollowUpMessage = async (subject: Subject, appointment: Appointment): Promise<string> => {
  // Always initialize right before use as recommended for dynamic key contexts
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Draft a polite, professional, and short follow-up message (for WhatsApp/Email) to a subject named "${subject.name}".
    Context: They had an appointment on ${new Date(appointment.date).toDateString()}.
    Status: ${appointment.status}.
    Reason recorded: ${appointment.followUpReason || 'None specified'}.
    
    If the status is 'Missed', politely ask for a reschedule. 
    If 'Completed', thank them.
    Keep it under 50 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    // Access .text property directly (not a method)
    return response.text || "Could not generate message.";
  } catch (error) {
    console.error("Gemini Error", error);
    return "Error generating message. Please check your network or API key.";
  }
};

/**
 * Analyzes attendance trends using Gemini 3 Flash.
 * Provides brief strategic insights based on provided appointment data.
 */
export const analyzeAttendanceTrends = async (appointments: Appointment[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Summarize data to save tokens
  const total = appointments.length;
  const missed = appointments.filter(a => a.status === AppointmentStatus.MISSED).length;
  const reasons = appointments
    .filter(a => a.status === AppointmentStatus.MISSED && a.followUpReason)
    .map(a => a.followUpReason)
    .join(", ");

  const prompt = `
    Analyze these appointment stats:
    Total: ${total}
    Missed: ${missed}
    Reasons for missed: [${reasons}]

    Provide a brief strategic insight (max 2 sentences) on how to improve attendance.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    // Access .text property directly
    return response.text || "No insights available.";
  } catch (error) {
    return "Could not analyze trends at this time.";
  }
};