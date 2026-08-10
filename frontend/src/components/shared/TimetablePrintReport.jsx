import { formatGradeLabel } from '../../utils/scheduleConstants';
import ScheduleTable from './ScheduleTable';
import './TimetablePrintReport.css';

const TimetablePrintReport = ({ timetable = [], grades = [], version = null, reportId }) => {
  const rowsByGrade = new Map();
  timetable.forEach((row) => {
    const rows = rowsByGrade.get(String(row.grade_id)) || [];
    rowsByGrade.set(String(row.grade_id), [...rows, row]);
  });

  const orderedGrades = [...grades]
    .filter((grade) => rowsByGrade.has(String(grade.id)))
    .sort((left, right) => left.grade - right.grade || left.section.localeCompare(right.section));

  return (
    <section className="timetable-print-report" id={reportId} aria-label="Global timetable print report">
      <header className="timetable-print-report__header">
        <h2>School timetable</h2>
        {version && <p>{version.label || `Version ${version.version_number}`}</p>}
      </header>
      {orderedGrades.map((grade) => (
        <section className="timetable-print-report__grade" key={grade.id}>
          <h3>{formatGradeLabel(grade)}</h3>
          <ScheduleTable
            timetable={rowsByGrade.get(String(grade.id))}
            grades={grades}
            mode="grade"
            version={version}
            showActions={false}
            className="timetable-print-report__schedule"
          />
        </section>
      ))}
    </section>
  );
};

export default TimetablePrintReport;
