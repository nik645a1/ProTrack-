import * as XLSX from 'xlsx';
import { Appointment, Subject, AppointmentStatus, ChangeLogEntry } from '../types';

export const parseExcelFile = (file: File): Promise<{ subjects: Subject[], appointments: Appointment[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // cellDates: true ensures Excel serial dates are converted to JS Date objects
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        // New Structure:
        // Col A (0): Subject ID (Required)
        // Col B (1): Name
        // Col C (2): Mobile Number
        // Col D (3): Alternative Mobile Number
        // Col E (4): Date of Insertion
        // Col F (5) onwards: Appointment Dates...
        
        const subjects: Subject[] = [];
        const appointments: Appointment[] = [];
        
        // Skip header row (index 0)
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (row && row.length > 0 && row[0]) {
            const subjectId = String(row[0]);
            
            // 1. Create Subject
            subjects.push({
              id: subjectId,
              name: row[1] ? String(row[1]) : `Subject ${row[0]}`,
              phone: row[2] ? String(row[2]) : undefined,
              altPhone: row[3] ? String(row[3]) : undefined,
              insertionDate: row[4] instanceof Date ? row[4].toISOString() : (row[4] ? String(row[4]) : undefined),
              notes: 'Imported from Excel'
            });

            // 2. Scan for Appointments from Column F (Index 5) onwards
            for (let j = 5; j < row.length; j++) {
              const cell = row[j];
              if (cell) {
                let apptDate: Date | null = null;

                if (cell instanceof Date) {
                  apptDate = cell;
                } else {
                  // Try parsing string
                  const parsed = new Date(cell);
                  if (!isNaN(parsed.getTime())) {
                    apptDate = parsed;
                  }
                }

                if (apptDate) {
                  appointments.push({
                    id: crypto.randomUUID(),
                    subjectId: subjectId,
                    date: apptDate.toISOString(),
                    status: AppointmentStatus.SCHEDULED,
                    notes: `Imported from Col ${j+1}`
                  });
                }
              }
            }
          }
        }
        
        resolve({ subjects, appointments });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

export const exportToExcel = (subjects: Subject[], appointments: Appointment[], filename?: string) => {
  // Flatten data for export
  const data = appointments.map(app => {
    const sub = subjects.find(s => s.id === app.subjectId);
    return {
      'Subject ID': app.subjectId,
      'Name': sub?.name || 'Unknown',
      'Mobile': sub?.phone || '',
      'Date of Insertion': sub?.insertionDate ? new Date(sub.insertionDate).toLocaleDateString() : 'N/A',
      'Remark': app.notes || '',
      'Appointment Date': new Date(app.date).toLocaleDateString(),
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Calendar");
  XLSX.writeFile(wb, filename || `ProTrack_Calendar_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportExitedSubjects = (logs: ChangeLogEntry[], filename?: string) => {
  const exitedLogs = logs.filter(l => l.changeType === 'DELETE');
  const data = exitedLogs.map(log => ({
    'Timestamp of Exit': new Date(log.timestamp).toLocaleString(),
    'Subject ID': log.subjectId,
    'Subject Name': log.subjectName,
    'Exit Reason / Details': log.comment,
    'System Note': log.details
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Exited Subjects");
  XLSX.writeFile(wb, filename || `ProTrack_Exited_Subjects_${new Date().toISOString().split('T')[0]}.xlsx`);
};