import { useId, useMemo, useState } from 'react';
import {
  PERIODS,
  SCHEDULE_DAYS,
  formatDayLabel,
  formatGradeLabel,
  getInitialScheduleDay,
  slotKey,
} from '../../utils/scheduleConstants';
import ScheduleActions from './ScheduleActions';
import './ScheduleTable.css';
import './TimetablePrintReport.css';

const ScheduleTable = ({
  timetable = [],
  grades = [],
  mode = 'grade',
  loading = false,
  emptyMessage = 'No timetable has been generated yet.',
  version = null,
  showActions = true,
  fileName,
  printTargetId,
  labelPrefix = mode === 'teacher' ? 'teacher-timetable' : 'grade-timetable',
  className = '',
}) => {
  const generatedId = useId().replace(/:/g, '');
  const targetId = printTargetId || `schedule-table-${generatedId}`;
  const [mobileDay, setMobileDay] = useState(getInitialScheduleDay);
  const gradesById = useMemo(
    () => new Map(grades.map((grade) => [String(grade.id), grade])),
    [grades],
  );

  const rowsBySlot = useMemo(() => {
    const rows = new Map();

    timetable.forEach((row) => {
      const key = slotKey(row.day, row.period);
      const existing = rows.get(key) || [];
      rows.set(key, [...existing, row]);
    });

    return rows;
  }, [timetable]);

  const getSlots = (day, periodId) => rowsBySlot.get(slotKey(day, periodId)) || [];

  const getSecondaryLabel = (slot) => {
    if (mode === 'teacher') {
      return formatGradeLabel(gradesById.get(String(slot.grade_id)));
    }

    return slot.teacher?.name || 'Unassigned';
  };

  const renderSlot = (slot) => (
    <div className="schedule-slot" key={slot.id || `${slot.grade_id}-${slot.period}`}>
      <strong className="schedule-slot__subject">{slot.subject}</strong>
      <span className="schedule-slot__meta">{getSecondaryLabel(slot)}</span>
    </div>
  );

  const renderMobilePeriod = (period) => {
    const slots = getSlots(mobileDay, period.id);

    if (period.isBreak) {
      return (
        <article className="schedule-mobile-slot schedule-mobile-slot--break" key={period.id}>
          <div className="schedule-mobile-slot__period">
            <strong>{period.name}</strong>
            <span>{period.time}</span>
          </div>
          <span className="schedule-mobile-slot__break-label">Break</span>
        </article>
      );
    }

    return (
      <article className="schedule-mobile-slot" key={period.id}>
        <div className="schedule-mobile-slot__period">
          <strong>{period.name}</strong>
          <span>{period.time}</span>
        </div>
        <div className="schedule-mobile-slot__content">
          {slots.length > 0 ? slots.map(renderSlot) : (
            <span className="schedule-mobile-slot__empty">No class assigned</span>
          )}
        </div>
      </article>
    );
  };

  if (loading) {
    return <p className="schedule-table-status" role="status">Loading timetable...</p>;
  }

  if (timetable.length === 0) {
    return <p className="schedule-table-status" role="status">{emptyMessage}</p>;
  }

  return (
    <section className={`schedule-table-shell ${className}`.trim()} id={targetId}>
      <div className="schedule-table__toolbar no-print">
        <div>
          {version && <p className="schedule-table__version">{version.label || `Version ${version.version_number}`}</p>}
        </div>
        {showActions && (
          <ScheduleActions
            rows={timetable}
            grades={grades}
            version={version}
            fileName={fileName}
            printTargetId={targetId}
            labelPrefix={labelPrefix}
          />
        )}
      </div>

      <header className="schedule-table__print-header">
        <h2>{mode === 'teacher' ? 'Teacher timetable' : 'Grade timetable'}</h2>
        {version && <p>{version.label || `Version ${version.version_number}`}</p>}
      </header>

      <div className="schedule-table__viewport">
        <table className="schedule-table__matrix">
          <caption className="sr-only">
            {mode === 'teacher' ? 'Teacher timetable' : 'Grade timetable'}
          </caption>
          <colgroup>
            <col className="schedule-table__day-column" />
            {PERIODS.map((period) => <col className="schedule-table__period-column" key={period.id} />)}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="schedule-table__day-heading">Day</th>
              {PERIODS.map((period) => (
                <th scope="col" className="schedule-table__period-heading" key={period.id}>
                  <span className="schedule-table__period-name">{period.name}</span>
                  <small className="schedule-table__period-time">{period.time}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCHEDULE_DAYS.map((day, dayIndex) => (
              <tr key={day.key}>
                <th scope="row" className="schedule-table__day-cell">{day.label}</th>
                {PERIODS.map((period) => {
                  const slots = getSlots(day.key, period.id);

                  if (period.isBreak) {
                    return dayIndex === 0 ? (
                      <td
                        className="schedule-table__cell schedule-table__break-cell"
                        key={period.id}
                        rowSpan={SCHEDULE_DAYS.length}
                      >
                        Break
                      </td>
                    ) : null;
                  }

                  return (
                    <td className="schedule-table__cell" key={period.id}>
                      {slots.length > 0 ? slots.map(renderSlot) : <span className="schedule-slot--empty">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="schedule-table__mobile-view">
        <div className="schedule-mobile-controls">
          <label htmlFor={`${targetId}-mobile-day`}>Choose a day</label>
          <select
            id={`${targetId}-mobile-day`}
            value={mobileDay}
            onChange={(event) => setMobileDay(event.target.value)}
          >
            {SCHEDULE_DAYS.map((day) => <option value={day.key} key={day.key}>{day.label}</option>)}
          </select>
        </div>
        <p className="schedule-mobile-summary sr-only" role="status" aria-live="polite">
          Showing timetable for {formatDayLabel(mobileDay)}
        </p>
        <div className="schedule-mobile-agenda" role="list">
          {PERIODS.map(renderMobilePeriod)}
        </div>
      </div>
    </section>
  );
};

export default ScheduleTable;
