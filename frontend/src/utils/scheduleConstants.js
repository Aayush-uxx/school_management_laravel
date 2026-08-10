export const SCHEDULE_DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
];

export const DAYS = SCHEDULE_DAYS.map((day) => day.label);

// Keep these ids/times aligned with TimetableController::PERIODS.
export const PERIODS = [
  { id: 1, name: 'Period 1', time: '10:00-10:45', isBreak: false },
  { id: 2, name: 'Period 2', time: '10:45-11:30', isBreak: false },
  { id: 3, name: 'Short Break', time: '11:30-11:45', isBreak: true },
  { id: 4, name: 'Period 3', time: '11:45-12:30', isBreak: false },
  { id: 5, name: 'Period 4', time: '12:30-1:15', isBreak: false },
  { id: 6, name: 'Lunch Break', time: '1:15-2:00', isBreak: true },
  { id: 7, name: 'Period 5', time: '2:00-2:45', isBreak: false },
  { id: 8, name: 'Period 6', time: '2:45-3:30', isBreak: false },
  { id: 9, name: 'Period 7', time: '3:30-4:15', isBreak: false },
  { id: 10, name: 'Period 8', time: '4:15-5:00', isBreak: false },
];

export const TEACHING_PERIODS = PERIODS.filter((period) => !period.isBreak);
export const BREAK_PERIODS = PERIODS.filter((period) => period.isBreak);
export const DISPLAY_DAYS = SCHEDULE_DAYS.map((day) => day.key);

export const normalizeDay = (day) => {
  const normalized = String(day || '').trim().toLowerCase();
  const aliases = {
    mon: 'monday',
    tue: 'tuesday',
    tues: 'tuesday',
    wed: 'wednesday',
    thu: 'thursday',
    thur: 'thursday',
    thurs: 'thursday',
    fri: 'friday',
  };

  return aliases[normalized] || normalized;
};

export const formatDayLabel = (day) => {
  const normalized = normalizeDay(day);
  return SCHEDULE_DAYS.find((scheduleDay) => scheduleDay.key === normalized)?.label || '';
};

export const getInitialScheduleDay = () => {
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
  return SCHEDULE_DAYS.some((day) => day.key === weekday) ? weekday : 'monday';
};

export const formatGradeLabel = (grade) => (
  grade ? `Grade ${grade.grade} ${grade.section}` : 'Unknown grade'
);

export const assignmentKey = (gradeId, subjectId) => `${gradeId}-${subjectId}`;

export const slotKey = (day, periodId) => `${normalizeDay(day)}-${periodId}`;
