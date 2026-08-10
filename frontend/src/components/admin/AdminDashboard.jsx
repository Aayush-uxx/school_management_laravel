import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import ScheduleActions from '../shared/ScheduleActions';
import ScheduleTable from '../shared/ScheduleTable';
import TimetableHistory from '../shared/TimetableHistory';
import TimetablePrintReport from '../shared/TimetablePrintReport';
import { formatGradeLabel } from '../../utils/scheduleConstants';
import './AdminDashboard.css';

const TABS = ['teachers', 'subjects', 'grades', 'timetable', 'leaves'];
const GLOBAL_PRINT_REPORT_ID = 'global-timetable-print-report';

const AdminDashboard = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('teachers');
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [currentTimetable, setCurrentTimetable] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', code: '' });
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [newGrade, setNewGrade] = useState({ grade: '', section: 'A' });
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [gradeTimetable, setGradeTimetable] = useState([]);
  const [gradeVersion, setGradeVersion] = useState(null);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [versionHistory, setVersionHistory] = useState([]);
  const [loadedVersions, setLoadedVersions] = useState({});
  const [loadingVersionId, setLoadingVersionId] = useState(null);
  const [historyError, setHistoryError] = useState('');

  const fetchData = useCallback(async () => {
    setPageError('');
    const [teachersRes, subjectsRes, gradesRes, leavesRes, timetableRes] = await Promise.allSettled([
      API.get('/teachers'),
      API.get('/subjects'),
      API.get('/grades'),
      API.get('/leaves'),
      API.get('/timetable'),
    ]);

    if (teachersRes.status === 'fulfilled') setTeachers(teachersRes.value.data.teachers || []);
    if (subjectsRes.status === 'fulfilled') setSubjects(subjectsRes.value.data.subjects || []);
    if (gradesRes.status === 'fulfilled') setGrades(gradesRes.value.data.grades || []);
    if (leavesRes.status === 'fulfilled') setLeaves(leavesRes.value.data.leaves || []);
    if (timetableRes.status === 'fulfilled') {
      setCurrentTimetable(timetableRes.value.data.timetable || []);
      setCurrentVersion(timetableRes.value.data.version || null);
    }

    const failedRequest = [teachersRes, subjectsRes, gradesRes, leavesRes, timetableRes]
      .find((result) => result.status === 'rejected');
    if (failedRequest) {
      setPageError(failedRequest.reason?.response?.data?.message || 'Some dashboard data could not be loaded.');
    }
    setLoading(false);
  }, []);

  const fetchGradeTimetable = useCallback(async (gradeId) => {
    setGradeLoading(true);
    try {
      const response = await API.get(`/timetable/grade/${gradeId}`);
      setGradeTimetable(response.data.timetable || []);
      setGradeVersion(response.data.version || null);
    } catch (requestError) {
      setActionMessage(requestError.response?.data?.message || 'Unable to load this timetable.');
      setGradeTimetable([]);
      setGradeVersion(null);
    } finally {
      setGradeLoading(false);
    }
  }, []);

  const fetchVersionHistory = useCallback(async (gradeId) => {
    setHistoryError('');
    if (!gradeId) {
      setVersionHistory([]);
      return;
    }

    try {
      const response = await API.get(`/timetable/versions?grade_id=${gradeId}`);
      setVersionHistory(response.data.versions || []);
    } catch (requestError) {
      setHistoryError(requestError.response?.data?.message || 'Unable to load timetable history.');
      setVersionHistory([]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selectedGradeId) {
        void fetchGradeTimetable(selectedGradeId);
        void fetchVersionHistory(selectedGradeId);
      } else {
        setGradeTimetable([]);
        setGradeVersion(null);
        setVersionHistory([]);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchGradeTimetable, fetchVersionHistory, selectedGradeId]);

  const refreshDashboard = async () => {
    await fetchData();
    if (selectedGradeId) {
      await Promise.all([
        fetchGradeTimetable(selectedGradeId),
        fetchVersionHistory(selectedGradeId),
      ]);
    }
  };

  const loadVersion = async (versionId) => {
    setLoadingVersionId(versionId);
    setHistoryError('');
    try {
      const response = await API.get(`/timetable/versions/${versionId}?grade_id=${selectedGradeId}`);
      setLoadedVersions((current) => ({
        ...current,
        [versionId]: { version: response.data.version, timetable: response.data.timetable || [] },
      }));
    } catch (requestError) {
      setHistoryError(requestError.response?.data?.message || 'Unable to load this timetable version.');
    } finally {
      setLoadingVersionId(null);
    }
  };

  const toggleCurriculum = async (grade, subjectId) => {
    const currentSubjectIds = (grade.subjects || []).map((subject) => subject.id);
    const updatedSubjectIds = currentSubjectIds.includes(subjectId)
      ? currentSubjectIds.filter((id) => id !== subjectId)
      : [...currentSubjectIds, subjectId];

    if (updatedSubjectIds.length === 0) {
      setActionMessage('A grade must have at least one subject.');
      return;
    }

    try {
      await API.put(`/grades/${grade.id}/subjects`, { subject_ids: updatedSubjectIds });
      setActionMessage(`${formatGradeLabel(grade)} curriculum updated. A new timetable version was saved.`);
      await refreshDashboard();
    } catch (requestError) {
      setActionMessage(requestError.response?.data?.message || 'Unable to update the curriculum.');
    }
  };

  const deleteTeacher = async (id) => {
    if (!window.confirm('Remove this teacher?')) return;

    try {
      await API.delete(`/teachers/${id}`);
      setActionMessage('Teacher removed and a new timetable version was saved.');
      await refreshDashboard();
    } catch (requestError) {
      setActionMessage(requestError.response?.data?.message || 'Unable to remove this teacher.');
    }
  };

  const addSubject = async (event) => {
    event.preventDefault();
    try {
      await API.post('/subjects', newSubject);
      setShowSubjectForm(false);
      setNewSubject({ name: '', code: '' });
      setActionMessage('Subject added and a new timetable version was saved.');
      await refreshDashboard();
    } catch (requestError) {
      setActionMessage(requestError.response?.data?.message || 'Unable to add this subject.');
    }
  };

  const deleteSubject = async (id) => {
    if (!window.confirm('Delete this subject from every grade?')) return;

    try {
      await API.delete(`/subjects/${id}`);
      setActionMessage('Subject removed and a new timetable version was saved.');
      await refreshDashboard();
    } catch (requestError) {
      setActionMessage(requestError.response?.data?.message || 'Unable to delete this subject.');
    }
  };

  const addGrade = async (event) => {
    event.preventDefault();
    const gradeNumber = Number(newGrade.grade);
    if (!Number.isInteger(gradeNumber) || gradeNumber < 1 || gradeNumber > 10) {
      setActionMessage('Grade must be a whole number from 1 to 10.');
      return;
    }

    try {
      await API.post('/grades', { grade: gradeNumber, section: newGrade.section });
      setShowGradeForm(false);
      setNewGrade({ grade: '', section: 'A' });
      setActionMessage('Grade section added and a new timetable version was saved.');
      await refreshDashboard();
    } catch (requestError) {
      setActionMessage(requestError.response?.data?.message || 'Unable to add this grade section.');
    }
  };

  const deleteGrade = async (id) => {
    if (!window.confirm('Delete this grade section? Its timetable rows will also be removed.')) return;

    try {
      await API.delete(`/grades/${id}`);
      if (String(selectedGradeId) === String(id)) setSelectedGradeId('');
      setActionMessage('Grade section deleted and a new timetable version was saved.');
      await refreshDashboard();
    } catch (requestError) {
      setActionMessage(requestError.response?.data?.message || 'Unable to delete this grade section.');
    }
  };

  const handleLeaveAction = async (id, action) => {
    try {
      await API.put(`/leaves/${id}/${action}`);
      setActionMessage(`Leave ${action}d.`);
      await fetchData();
    } catch (requestError) {
      setActionMessage(requestError.response?.data?.message || 'Unable to update this leave request.');
    }
  };

  if (loading) return <main className="dashboard-loading" role="status">Loading admin dashboard...</main>;

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div>
          <p className="sidebar-kicker">School operations</p>
          <h1>Scheduler Admin</h1>
        </div>
        <nav className="dashboard-nav" aria-label="Admin sections">
          {TABS.map((tab) => (
            <button type="button" key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </nav>
        <button type="button" className="sidebar-logout" onClick={logout}>Logout</button>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div><p className="eyebrow">Administration</p><h2>{activeTab === 'timetable' ? 'Class timetable' : `Manage ${activeTab}`}</h2></div>
          <div className="dashboard-stats" aria-label="School setup summary"><span><strong>{subjects.length}</strong> subjects</span><span><strong>{grades.length}</strong> grade sections</span></div>
        </header>

        {pageError && <p className="notice notice-error" role="alert">{pageError}</p>}
        {actionMessage && <p className="notice" role="status">{actionMessage}</p>}

        {activeTab === 'teachers' && (
          <section className="panel">
            <div className="section-heading"><div><p className="eyebrow">Staffing</p><h3>Manage teachers</h3></div><span className="section-count">{teachers.length} registered</span></div>
            <div className="table-scroll"><table className="data-table"><caption className="sr-only">Registered teachers and their assignments</caption><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Assignments</th><th scope="col">Action</th></tr></thead><tbody>{teachers.map((teacher) => <tr key={teacher.id}><td>{teacher.name}</td><td>{teacher.email}</td><td>{teacher.assignments?.map((assignment) => `${assignment.subject?.name || 'Subject'} (${formatGradeLabel(assignment.grade)})`).join(', ') || '—'}</td><td><button type="button" className="icon-button danger" onClick={() => deleteTeacher(teacher.id)} aria-label={`Remove ${teacher.name}`}>×</button></td></tr>)}</tbody></table>{teachers.length === 0 && <p className="empty-inline">No teachers have registered yet.</p>}</div>
          </section>
        )}

        {activeTab === 'subjects' && (
          <section className="panel">
            <div className="section-heading"><div><p className="eyebrow">Curriculum</p><h3>Manage subjects</h3></div><button type="button" className="button button-primary" onClick={() => setShowSubjectForm((visible) => !visible)}>{showSubjectForm ? 'Cancel' : '+ Add subject'}</button></div>
            {showSubjectForm && <form className="inline-form" onSubmit={addSubject}><div><label htmlFor="subject-name">Name</label><input id="subject-name" value={newSubject.name} onChange={(event) => setNewSubject({ ...newSubject, name: event.target.value })} required /></div><div><label htmlFor="subject-code">Code</label><input id="subject-code" value={newSubject.code} onChange={(event) => setNewSubject({ ...newSubject, code: event.target.value })} required /></div><button className="button button-success" type="submit">Add subject</button></form>}
            <div className="table-scroll"><table className="data-table"><caption className="sr-only">Configured school subjects</caption><thead><tr><th scope="col">Name</th><th scope="col">Code</th><th scope="col">Action</th></tr></thead><tbody>{subjects.map((subject) => <tr key={subject.id}><td>{subject.name}</td><td><span className="code-pill">{subject.code}</span></td><td><button type="button" className="button button-danger" onClick={() => deleteSubject(subject.id)}>Delete</button></td></tr>)}</tbody></table></div>
          </section>
        )}

        {activeTab === 'grades' && (
          <div className="stacked-panels">
            <section className="panel"><div className="section-heading"><div><p className="eyebrow">Class structure</p><h3>Grades 1–10 · Sections A and B</h3></div><button type="button" className="button button-primary" onClick={() => setShowGradeForm((visible) => !visible)}>{showGradeForm ? 'Cancel' : '+ Add grade'}</button></div>{showGradeForm && <form className="inline-form" onSubmit={addGrade}><div><label htmlFor="grade-number">Grade number</label><input id="grade-number" type="number" min="1" max="10" value={newGrade.grade} onChange={(event) => setNewGrade({ ...newGrade, grade: event.target.value })} required /></div><div><label htmlFor="grade-section">Section</label><select id="grade-section" value={newGrade.section} onChange={(event) => setNewGrade({ ...newGrade, section: event.target.value })}><option value="A">A</option><option value="B">B</option></select></div><button className="button button-success" type="submit">Add grade</button></form>}<div className="table-scroll"><table className="data-table"><caption className="sr-only">Grade sections</caption><thead><tr><th scope="col">Grade</th><th scope="col">Section</th><th scope="col">Subjects</th><th scope="col">Action</th></tr></thead><tbody>{grades.map((grade) => <tr key={grade.id}><td>{grade.grade}</td><td>{grade.section}</td><td>{grade.subjects?.length || 0}</td><td><button type="button" className="button button-danger" onClick={() => deleteGrade(grade.id)}>Delete</button></td></tr>)}</tbody></table></div></section>
            <section className="panel"><div className="section-heading"><div><p className="eyebrow">Curriculum mapping</p><h3>Subjects by grade section</h3></div></div><div className="curriculum-grid">{grades.map((grade) => <section className="curriculum-block" key={grade.id} aria-labelledby={`curriculum-${grade.id}`}><h4 id={`curriculum-${grade.id}`}>{formatGradeLabel(grade)}</h4><div className="curriculum-checkboxes">{subjects.map((subject) => <label key={subject.id} className="assign-checkbox" htmlFor={`curriculum-${grade.id}-${subject.id}`}><input id={`curriculum-${grade.id}-${subject.id}`} type="checkbox" checked={grade.subjects?.some((gradeSubject) => gradeSubject.id === subject.id) || false} onChange={() => toggleCurriculum(grade, subject.id)} /><span>{subject.name}</span></label>)}</div></section>)}</div></section>
          </div>
        )}

        {activeTab === 'timetable' && (
          <div className="stacked-panels">
            <section className="panel">
              <div className="section-heading"><div><p className="eyebrow">Current timetable</p><h3>All grade sections</h3></div><ScheduleActions rows={currentTimetable} grades={grades} version={currentVersion} printTargetId={GLOBAL_PRINT_REPORT_ID} labelPrefix="all-school-timetables" /></div>
              <p className="timetable-current-summary">{currentVersion ? `${currentVersion.label} · ${currentVersion.row_count} rows across ${currentVersion.grade_count} grade sections` : 'No current timetable version yet.'}</p>
              <TimetablePrintReport timetable={currentTimetable} grades={grades} version={currentVersion} reportId={GLOBAL_PRINT_REPORT_ID} />
            </section>
            <section className="panel">
              <div className="section-heading"><div><p className="eyebrow">Class view</p><h3>Selected grade timetable</h3></div></div>
              <div className="select-field"><label htmlFor="timetable-grade">Select grade section</label><select id="timetable-grade" value={selectedGradeId} onChange={(event) => setSelectedGradeId(event.target.value)}><option value="">Choose a class</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{formatGradeLabel(grade)}</option>)}</select></div>
              {selectedGradeId && <ScheduleTable timetable={gradeTimetable} grades={grades} mode="grade" version={gradeVersion} loading={gradeLoading} />}
              {!selectedGradeId && <p className="schedule-status">Choose a class to view its current schedule and historical versions.</p>}
              <TimetableHistory versions={versionHistory} grades={grades} selectedGradeId={selectedGradeId} onLoadVersion={loadVersion} loadedVersions={loadedVersions} loadingVersionId={loadingVersionId} error={historyError} />
            </section>
          </div>
        )}

        {activeTab === 'leaves' && (
          <section className="panel"><div className="section-heading"><div><p className="eyebrow">Requests</p><h3>Manage leave requests</h3></div></div><div className="table-scroll"><table className="data-table"><caption className="sr-only">Teacher leave requests</caption><thead><tr><th scope="col">Teacher</th><th scope="col">Date</th><th scope="col">Reason</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>{leaves.map((leave) => <tr key={leave.id}><td>{leave.teacher?.name || '—'}</td><td>{leave.date}</td><td>{leave.reason}</td><td><span className={`status status-${leave.status}`}>{leave.status}</span></td><td>{leave.status === 'pending' && <div className="action-row"><button type="button" className="button button-success" onClick={() => handleLeaveAction(leave.id, 'approve')}>Approve</button><button type="button" className="button button-danger" onClick={() => handleLeaveAction(leave.id, 'reject')}>Reject</button></div>}</td></tr>)}</tbody></table>{leaves.length === 0 && <p className="empty-inline">No leave requests.</p>}</div></section>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
