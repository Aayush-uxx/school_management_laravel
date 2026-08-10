import { formatVersionLabel } from '../../utils/timetableExport';
import ScheduleTable from './ScheduleTable';
import './TimetableHistory.css';

const formatReason = (reason) => (reason || 'manual regeneration')
  .replaceAll('_', ' ')
  .replace(/^./, (character) => character.toUpperCase());

const formatDate = (value) => {
  if (!value) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

const TimetableHistory = ({
  versions = [],
  grades = [],
  selectedGradeId,
  onLoadVersion,
  loadedVersions = {},
  loadingVersionId = null,
  error = '',
}) => {
  const archivedVersions = versions.filter((version) => version.status === 'archived');

  return (
    <section className="timetable-history panel-subsection" aria-labelledby="timetable-history-heading">
      <div className="timetable-history__heading">
        <div>
          <p className="eyebrow">Previous schedules</p>
          <h4 id="timetable-history-heading">Timetable history</h4>
        </div>
        <span className="timetable-history__count">{archivedVersions.length} archived</span>
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {archivedVersions.length === 0 ? (
        <p className="timetable-history__empty">No timetable history yet. New versions will appear here after a schedule change.</p>
      ) : (
        <div className="timetable-history__list">
          {archivedVersions.map((version) => {
            const loaded = loadedVersions[version.id];
            const scheduleRows = loaded?.timetable || [];

            return (
              <details
                className="timetable-history__item"
                key={version.id}
                onToggle={(event) => {
                  if (event.currentTarget.open && !loaded) onLoadVersion(version.id);
                }}
              >
                <summary>
                  <span className="timetable-history__summary-main">
                    <strong>{formatVersionLabel(version)}</strong>
                    <span>{formatReason(version.generated_reason)} · {formatDate(version.generated_at)}</span>
                  </span>
                  <span className="timetable-history__summary-meta">
                    {version.row_count} rows
                  </span>
                </summary>
                <div className="timetable-history__content">
                  {loadingVersionId === version.id && <p className="timetable-history__status" role="status">Loading version...</p>}
                  {loaded && scheduleRows.length > 0 && (
                    <ScheduleTable
                      timetable={scheduleRows}
                      grades={grades}
                      mode="grade"
                      version={loaded.version || version}
                      labelPrefix={`timetable-${version.version_number}`}
                      className="timetable-history__schedule"
                    />
                  )}
                  {loaded && scheduleRows.length === 0 && <p className="timetable-history__status">No rows are available for this version.</p>}
                </div>
              </details>
            );
          })}
        </div>
      )}
      {!selectedGradeId && <p className="timetable-history__hint">Select a grade section to view its historical schedules.</p>}
    </section>
  );
};

export default TimetableHistory;
