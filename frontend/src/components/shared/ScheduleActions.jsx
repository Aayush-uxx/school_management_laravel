import { downloadTimetableCsv, getTimetableFileName, printTimetable } from '../../utils/timetableExport';
import './ScheduleActions.css';

const ScheduleActions = ({
  rows = [],
  grades = [],
  version = null,
  fileName,
  printTargetId,
  labelPrefix = 'timetable',
  disabled = false,
}) => (
  <div className="schedule-actions no-print" aria-label="Timetable actions">
    <button
      type="button"
      className="schedule-actions__button schedule-actions__button--primary"
      disabled={disabled || rows.length === 0}
      onClick={() => printTimetable(printTargetId)}
    >
      Print
    </button>
    <button
      type="button"
      className="schedule-actions__button"
      disabled={disabled || rows.length === 0}
      onClick={() => downloadTimetableCsv({
        rows,
        grades,
        version,
        fileName: fileName || getTimetableFileName(labelPrefix, version),
      })}
    >
      Download CSV
    </button>
  </div>
);

export default ScheduleActions;
