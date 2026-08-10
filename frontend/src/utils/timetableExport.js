import { formatDayLabel, formatGradeLabel, PERIODS, SCHEDULE_DAYS } from './scheduleConstants';

const dayOrder = new Map(SCHEDULE_DAYS.map((day, index) => [day.key, index]));
const periodOrder = new Map(PERIODS.map((period, index) => [period.id, index]));

export const escapeCsvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const getVersionLabel = (version) => version?.label || (version ? `Version ${version.version_number}` : 'Current timetable');

const getSortedRows = (rows, grades) => {
  const gradesById = new Map(grades.map((grade) => [String(grade.id), grade]));

  return [...rows].sort((left, right) => {
    const leftGrade = gradesById.get(String(left.grade_id));
    const rightGrade = gradesById.get(String(right.grade_id));
    const gradeNumberDifference = (leftGrade?.grade || 0) - (rightGrade?.grade || 0);
    if (gradeNumberDifference !== 0) return gradeNumberDifference;

    const sectionDifference = (leftGrade?.section || '').localeCompare(rightGrade?.section || '');
    if (sectionDifference !== 0) return sectionDifference;

    const dayDifference = (dayOrder.get(left.day) ?? 99) - (dayOrder.get(right.day) ?? 99);
    if (dayDifference !== 0) return dayDifference;

    return (periodOrder.get(left.period) ?? 99) - (periodOrder.get(right.period) ?? 99);
  });
};

export const timetableToCsv = (rows, grades, version = null) => {
  const gradesById = new Map(grades.map((grade) => [String(grade.id), grade]));
  const header = ['Version', 'Grade', 'Section', 'Day', 'Period', 'Time', 'Subject', 'Teacher'];
  const body = getSortedRows(rows, grades).map((row) => {
    const grade = gradesById.get(String(row.grade_id));
    const period = PERIODS.find((item) => item.id === row.period);

    return [
      getVersionLabel(version),
      grade?.grade || '',
      grade?.section || '',
      formatDayLabel(row.day),
      period?.name || `Period ${row.period}`,
      row.time,
      row.subject,
      row.teacher?.name || 'Unassigned',
    ];
  });

  return `\uFEFF${[header, ...body].map((line) => line.map(escapeCsvCell).join(',')).join('\r\n')}`;
};

export const getTimetableFileName = (prefix = 'timetable', version = null) => {
  const versionSuffix = version?.version_number ? `-v${version.version_number}` : '-current';
  const safePrefix = prefix.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${safePrefix || 'timetable'}${versionSuffix}.csv`;
};

export const downloadTimetableCsv = ({ rows, grades, version, fileName }) => {
  const blob = new Blob([timetableToCsv(rows, grades, version)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || getTimetableFileName('timetable', version);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const printTimetable = (targetId) => {
  const target = document.getElementById(targetId);
  if (!target) return;

  document.body.dataset.printTarget = targetId;
  target.dataset.printTargetElement = 'true';
  const cleanup = () => {
    delete document.body.dataset.printTarget;
    delete target.dataset.printTargetElement;
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
};

export const formatVersionLabel = (version) => getVersionLabel(version);
export const formatGradeForExport = (grade) => formatGradeLabel(grade);
