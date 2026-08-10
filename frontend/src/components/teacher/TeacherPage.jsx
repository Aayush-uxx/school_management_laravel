import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import ScheduleTable from '../shared/ScheduleTable';
import { formatGradeLabel } from '../../utils/scheduleConstants';
import './TeacherPage.css';

const TABS = [
  ['my-timetable', 'My Timetable'],
  ['whole-school', 'Whole School'],
  ['leaves', 'Apply Leave'],
  ['settings', 'Account Settings'],
];

const TeacherPage = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('my-timetable');
  const [loading, setLoading] = useState(true);
  const [myTimetable, setMyTimetable] = useState([]);
  const [myVersion, setMyVersion] = useState(null);
  const [grades, setGrades] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [gradeTimetable, setGradeTimetable] = useState([]);
  const [gradeVersion, setGradeVersion] = useState(null);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [settingsEmail, setSettingsEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pageError, setPageError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');

  const fetchData = useCallback(async () => {
    const [timetableRes, gradesRes, leavesRes] = await Promise.allSettled([
      API.get(`/timetable/teacher/${user.id}`),
      API.get('/grades'),
      API.get('/leaves/my-leaves'),
    ]);

    if (timetableRes.status === 'fulfilled') {
      setMyTimetable(timetableRes.value.data.timetable || []);
      setMyVersion(timetableRes.value.data.version || null);
    }
    if (gradesRes.status === 'fulfilled') setGrades(gradesRes.value.data.grades || []);
    if (leavesRes.status === 'fulfilled') setLeaves(leavesRes.value.data.leaves || []);

    const failedRequest = [timetableRes, gradesRes, leavesRes]
      .find((result) => result.status === 'rejected');
    if (failedRequest) {
      setPageError(failedRequest.reason?.response?.data?.message || 'Some teacher data could not be loaded.');
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!selectedGradeId) {
        setGradeTimetable([]);
        setGradeVersion(null);
        return;
      }

      const fetchGradeTimetable = async () => {
        setGradeLoading(true);
        setActionMessage('');
        try {
          const response = await API.get(`/timetable/grade/${selectedGradeId}`);
          setGradeTimetable(response.data.timetable || []);
          setGradeVersion(response.data.version || null);
        } catch (requestError) {
          setActionMessage(requestError.response?.data?.message || 'Unable to load this timetable.');
          setGradeTimetable([]);
          setGradeVersion(null);
        } finally {
          setGradeLoading(false);
        }
      };

      void fetchGradeTimetable();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedGradeId]);

  const handleApplyLeave = async (event) => {
    event.preventDefault();
    setActionMessage('');
    try {
      await API.post('/leaves', { date: leaveDate, reason: leaveReason });
      setLeaveDate('');
      setLeaveReason('');
      setShowLeaveForm(false);
      setActionMessage('Leave request submitted.');
      await fetchData();
    } catch (requestError) {
      setActionMessage(requestError.response?.data?.message || 'Unable to submit the leave request.');
    }
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    setSettingsError('');
    setActionMessage('');
    try {
      const payload = { email: settingsEmail };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      await API.put('/profile', payload);
      setActionMessage('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (requestError) {
      setSettingsError(requestError.response?.data?.message || 'Error updating profile.');
    }
  };

  if (loading) return <main className="teacher-loading" role="status">Loading teacher dashboard...</main>;

  return (
    <div className="teacher-layout">
      <aside className="teacher-sidebar">
        <div>
          <p className="sidebar-kicker">Teaching workspace</p>
          <h1>Teacher Panel</h1>
          <p className="teacher-name">{user?.name}</p>
          <p className="teacher-email">{user?.email}</p>
        </div>
        <nav className="teacher-nav" aria-label="Teacher sections">
          {TABS.map(([key, label]) => (
            <button type="button" key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}</button>
          ))}
        </nav>
        <button type="button" className="teacher-logout" onClick={logout}>Logout</button>
      </aside>

      <main className="teacher-content">
        {pageError && <p className="teacher-notice teacher-notice-error" role="alert">{pageError}</p>}
        {actionMessage && <p className="teacher-notice" role="status">{actionMessage}</p>}

        {activeTab === 'my-timetable' && (
          <section className="teacher-panel">
            <div className="teacher-section-heading"><div><h2>My Personal Schedule</h2></div></div>
            <ScheduleTable timetable={myTimetable} grades={grades} mode="teacher" version={myVersion} emptyMessage="No classes are assigned to you yet." />
          </section>
        )}

        {activeTab === 'whole-school' && (
          <section className="teacher-panel">
            <div className="teacher-section-heading"><div><p className="eyebrow">Class view</p><h2>Whole School Schedule</h2></div></div>
            <div className="teacher-select-field"><label htmlFor="teacher-grade">Select grade section</label><select id="teacher-grade" value={selectedGradeId} onChange={(event) => setSelectedGradeId(event.target.value)}><option value="">Choose a class</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{formatGradeLabel(grade)}</option>)}</select></div>
            {selectedGradeId && <ScheduleTable timetable={gradeTimetable} grades={grades} mode="grade" version={gradeVersion} loading={gradeLoading} />}
            {!selectedGradeId && <p className="schedule-status">Choose a class to view its Monday–Friday schedule.</p>}
          </section>
        )}

        {activeTab === 'leaves' && (
          <section className="teacher-panel">
            <div className="teacher-section-heading"><div><p className="eyebrow">Availability</p><h2>Leave Management</h2></div><button type="button" className="teacher-button teacher-button-primary" onClick={() => setShowLeaveForm((visible) => !visible)}>{showLeaveForm ? 'Cancel' : 'Apply for Leave'}</button></div>
            {showLeaveForm && (
              <form className="leave-form" onSubmit={handleApplyLeave}>
                <div><label htmlFor="leave-date">Date</label><input id="leave-date" type="date" value={leaveDate} onChange={(event) => setLeaveDate(event.target.value)} required /></div>
                <div><label htmlFor="leave-reason">Reason</label><textarea id="leave-reason" value={leaveReason} onChange={(event) => setLeaveReason(event.target.value)} required /></div>
                <button className="teacher-button teacher-button-success" type="submit">Submit request</button>
              </form>
            )}
            <div className="table-scroll"><table className="teacher-table"><caption className="sr-only">Your leave history</caption><thead><tr><th scope="col">Date</th><th scope="col">Reason</th><th scope="col">Status</th></tr></thead><tbody>{leaves.map((leave) => <tr key={leave.id}><td>{leave.date}</td><td>{leave.reason}</td><td><span className={`status status-${leave.status}`}>{leave.status}</span></td></tr>)}</tbody></table>{leaves.length === 0 && <p className="empty-inline">No leave records.</p>}</div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="teacher-panel settings-panel">
            <div className="teacher-section-heading"><div><p className="eyebrow">Account</p><h2>Account Settings</h2></div></div>
            {settingsError && <p className="teacher-notice teacher-notice-error" role="alert">{settingsError}</p>}
            <form className="settings-form" onSubmit={handleUpdateProfile}>
              <div><label htmlFor="settings-email">Email</label><input id="settings-email" type="email" value={settingsEmail} onChange={(event) => setSettingsEmail(event.target.value)} required /></div>
              <p className="form-help">Leave password fields blank to keep your current password.</p>
              <div><label htmlFor="current-password">Current Password</label><input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div>
              <div><label htmlFor="new-password">New Password</label><input id="new-password" type="password" minLength="6" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div>
              <button className="teacher-button teacher-button-success" type="submit">Save Changes</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
};

export default TeacherPage;
