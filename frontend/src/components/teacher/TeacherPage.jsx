import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { DAYS, PERIODS } from '../../utils/scheduleConstants';

const TeacherPage = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('my-timetable');
  const [loading, setLoading] = useState(true);
  const [myTimetable, setMyTimetable] = useState([]);
  const [grades, setGrades] = useState([]);
  const [leaves, setLeaves] = useState([]);

  const [selectedGradeId, setSelectedGradeId] = useState('');
  const [gradeTimetable, setGradeTimetable] = useState([]);

  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const [settingsEmail, setSettingsEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedGradeId) fetchGradeTimetable(selectedGradeId);
  }, [selectedGradeId]);

  const fetchData = async () => {
    const [timetableRes, gradesRes, leavesRes] = await Promise.allSettled([
      API.get(`/timetable/teacher/${user.id}`),
      API.get('/grades'),
      API.get('/leaves/my-leaves'),
    ]);
    if (timetableRes.status === 'fulfilled') setMyTimetable(timetableRes.value.data.timetable);
    if (gradesRes.status === 'fulfilled') setGrades(gradesRes.value.data.grades);
    if (leavesRes.status === 'fulfilled') setLeaves(leavesRes.value.data.leaves);
    setLoading(false);
  };

  const fetchGradeTimetable = async (gradeId) => {
    const res = await API.get(`/timetable/grade/${gradeId}`);
    setGradeTimetable(res.data.timetable);
  };

  const getGradeLabel = (gradeId) => {
    const g = grades.find(gr => gr.id === gradeId);
    return g ? `Grade ${g.grade} ${g.section}` : '';
  };

  const getMySlots = (dayName, periodId) => {
    const dayKey = dayName.toLowerCase();
    return myTimetable.filter(t => t.day === dayKey && t.period === periodId);
  };

  const getGradeSlot = (dayName, periodId) => {
    const dayKey = dayName.toLowerCase();
    return gradeTimetable.find(t => t.day === dayKey && t.period === periodId);
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    await API.post('/leaves', { date: leaveDate, reason: leaveReason });
    setLeaveDate('');
    setLeaveReason('');
    setShowLeaveForm(false);
    fetchData();
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSettingsMessage('');
    setSettingsError('');
    try {
      const payload = { email: settingsEmail };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      await API.put('/profile', payload);
      setSettingsMessage('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Error updating profile');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Arial' }}>
      <div style={{ width: '220px', background: '#2c3e50', color: 'white', padding: '20px' }}>
        <h3>Teacher Panel</h3>
        <p><strong>{user?.name}</strong></p>
        <p style={{ fontSize: '14px', color: '#bdc3c7' }}>{user?.email}</p>
        <hr style={{ margin: '15px 0', borderColor: '#34495e' }} />
        {[
          ['my-timetable', 'My Timetable'],
          ['whole-school', 'Whole School'],
          ['leaves', 'Apply Leave'],
          ['settings', 'Account Settings'],
        ].map(([key, label]) => (
          <p key={key} onClick={() => setActiveTab(key)}
            style={{ cursor: 'pointer', padding: '10px', background: activeTab === key ? '#34495e' : '', borderRadius: '4px' }}>
            {label}
          </p>
        ))}
        <button onClick={logout} style={{ width: '100%', marginTop: '20px', padding: '10px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ flex: 1, padding: '30px', background: '#f4f7f6', overflowY: 'auto' }}>
        {activeTab === 'my-timetable' && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h2>My Personal Schedule</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
              <thead>
                <tr style={{ background: '#3498db', color: 'white' }}>
                  <th style={{ padding: '12px', border: '1px solid #ddd' }}>Day/Period</th>
                  {PERIODS.map(p => <th key={p.id} style={{ padding: '12px', border: '1px solid #ddd' }}>{p.isBreak ? 'Break' : p.name}<br /><small>{p.time}</small></th>)}
                </tr>
              </thead>
              <tbody>
                {DAYS.map(day => (
                  <tr key={day}>
                    <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>{day}</td>
                    {PERIODS.map(period => {
                      if (period.isBreak) return <td key={period.id} style={{ padding: '12px', border: '1px solid #ddd' }}>-</td>;
                      const slots = getMySlots(day, period.id);
                      return (
                        <td key={period.id} style={{ padding: '12px', border: '1px solid #ddd' }}>
                          {slots.length > 0 ? slots.map(slot => (
                            <div key={slot.id} style={{ marginBottom: '4px' }}>
                              <div style={{ fontWeight: 'bold', color: '#2980b9' }}>{slot.subject}</div>
                              <div style={{ fontSize: '11px', color: '#7f8c8d' }}>{getGradeLabel(slot.grade_id)}</div>
                            </div>
                          )) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'whole-school' && (
          <div>
            <h2>Whole School Schedule</h2>
            <select value={selectedGradeId} onChange={e => setSelectedGradeId(e.target.value)} style={{ padding: '8px', marginBottom: '20px' }}>
              <option value="">Select Grade</option>
              {grades.map(g => <option key={g.id} value={g.id}>Grade {g.grade} {g.section}</option>)}
            </select>

            {selectedGradeId && (
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                <thead>
                  <tr style={{ background: '#2c3e50', color: 'white' }}>
                    <th style={{ padding: '12px', border: '1px solid #ddd' }}>Day/Period</th>
                    {PERIODS.map(p => <th key={p.id} style={{ padding: '12px', border: '1px solid #ddd' }}>{p.isBreak ? 'Break' : p.name}<br /><small>{p.time}</small></th>)}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map(day => (
                    <tr key={day}>
                      <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>{day}</td>
                      {PERIODS.map(period => {
                        if (period.isBreak) return <td key={period.id} style={{ padding: '12px', border: '1px solid #ddd', color: '#999' }}>Break</td>;
                        const slot = getGradeSlot(day, period.id);
                        return (
                          <td key={period.id} style={{ padding: '12px', border: '1px solid #ddd' }}>
                            <div style={{ fontWeight: 'bold', color: '#2980b9' }}>{slot?.subject || '-'}</div>
                            <div style={{ fontSize: '11px', color: '#7f8c8d' }}>{slot?.teacher?.name || '-'}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'leaves' && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
            <h2>Leave Management</h2>
            <button onClick={() => setShowLeaveForm(!showLeaveForm)} style={{ marginBottom: '15px', padding: '8px 16px' }}>{showLeaveForm ? 'Cancel' : 'Apply for Leave'}</button>
            {showLeaveForm && (
              <form onSubmit={handleApplyLeave} style={{ marginBottom: '20px', background: '#f8f9fa', padding: '15px', borderRadius: '4px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block' }}>Date</label>
                  <input type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} required style={{ padding: '8px', width: '200px' }} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block' }}>Reason</label>
                  <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} required style={{ padding: '8px', width: '100%' }} />
                </div>
                <button type="submit" style={{ padding: '8px 16px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px' }}>Submit</button>
              </form>
            )}
            <h3>My Leave History</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ background: '#f39c12', color: 'white' }}>
                  <th style={{ padding: '12px' }}>Date</th><th style={{ padding: '12px' }}>Reason</th><th style={{ padding: '12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center' }}>No leave records.</td></tr> : leaves.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{l.date}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{l.reason}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '450px' }}>
            <h2>Account Settings</h2>
            {settingsMessage && <p style={{ color: '#27ae60' }}>{settingsMessage}</p>}
            {settingsError && <p style={{ color: 'red' }}>{settingsError}</p>}
            <form onSubmit={handleUpdateProfile}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
                <input type="email" value={settingsEmail} onChange={e => setSettingsEmail(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
              </div>
              <hr style={{ margin: '20px 0' }} />
              <p style={{ color: '#7f8c8d', fontSize: '14px' }}>Leave password fields blank to keep current password.</p>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={{ width: '100%', padding: '8px' }} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '8px' }} />
              </div>
              <button type="submit" style={{ padding: '10px 20px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '4px' }}>Save Changes</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherPage;