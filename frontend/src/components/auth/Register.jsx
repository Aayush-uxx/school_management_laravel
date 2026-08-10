import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import './Register.css';

const Register = () => {
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [employmentType, setEmploymentType] = useState('full-time');

  const [grades, setGrades] = useState([]);
  const [taken, setTaken] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gradesRes, takenRes] = await Promise.all([
          API.get('/grades'),
          API.get('/assignments/taken'),
        ]);
        setGrades(gradesRes.data.grades);
        setTaken(takenRes.data.taken);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, []);

  const isTaken = (gradeId, subjectId) =>
    taken.some(t => t.grade_id === gradeId && t.subject_id === subjectId);

  const isSelected = (gradeId, subjectId) =>
    assignments.some(a => a.grade_id === gradeId && a.subject_id === subjectId);

  const toggleAssignment = (gradeId, subjectId) => {
    if (isSelected(gradeId, subjectId)) {
      setAssignments(assignments.filter(a => !(a.grade_id === gradeId && a.subject_id === subjectId)));
    } else {
      setAssignments([...assignments, { grade_id: gradeId, subject_id: subjectId }]);
    }
  };

  // grades where every subject is already taken by someone else get hidden automatically
  const availableGrades = grades.filter(g =>
    g.subjects.some(s => !isTaken(g.id, s.id))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (assignments.length === 0) {
      setError('Select at least one subject to teach');
      return;
    }

    const result = await register({
      name, email, password,
      employment_type: employmentType,
      assignments,
    });

    if (!result.success) setError(result.message);
  };

  if (dataLoading) return <div className="register-container">Loading...</div>;

  return (
    <div className="register-container">
      <h2>Teacher Registration</h2>
      {error && <p className="error-text">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Employment Type</label>
          <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
            <option value="full-time">Full Time (Mon-Fri)</option>
            <option value="part-time">Part Time (Mon, Wed, Fri)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Select classes and subjects to teach</label>
          {availableGrades.length === 0 ? (
            <p className="muted-text">Every grade is fully staffed right now.</p>
          ) : (
            <div className="assign-grid">
              {availableGrades.map(g => (
                <div key={g.id} className="assign-grade-block">
                  <div className="assign-grade-title">Grade {g.grade} {g.section}</div>
                  <div className="assign-subject-list">
                    {g.subjects.map(s => {
                      const taken_ = isTaken(g.id, s.id);
                      return (
                        <label key={s.id} className={`assign-checkbox ${taken_ ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            disabled={taken_}
                            checked={isSelected(g.id, s.id)}
                            onChange={() => toggleAssignment(g.id, s.id)}
                          />
                          {s.name}{taken_ ? ' (taken)' : ''}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
      </form>

      <p>Already have account? <Link to="/login">Login</Link></p>
    </div>
  );
};

export default Register;