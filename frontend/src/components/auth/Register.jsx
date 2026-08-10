import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';
import { assignmentKey, formatGradeLabel } from '../../utils/scheduleConstants';
import './Register.css';

const Register = () => {
  const { register, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    employmentType: 'full-time',
  });
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
        setGrades(gradesRes.data.grades || []);
        setTaken(takenRes.data.taken || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load classes. Please try again.');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  const isTaken = (gradeId, subjectId) => taken.some(
    (assignment) => assignmentKey(assignment.grade_id, assignment.subject_id)
      === assignmentKey(gradeId, subjectId),
  );

  const isSelected = (gradeId, subjectId) => assignments.some(
    (assignment) => assignmentKey(assignment.grade_id, assignment.subject_id)
      === assignmentKey(gradeId, subjectId),
  );

  const toggleAssignment = (gradeId, subjectId) => {
    setAssignments((currentAssignments) => {
      if (isSelected(gradeId, subjectId)) {
        return currentAssignments.filter(
          (assignment) => assignmentKey(assignment.grade_id, assignment.subject_id)
            !== assignmentKey(gradeId, subjectId),
        );
      }

      return [...currentAssignments, { grade_id: gradeId, subject_id: subjectId }];
    });
  };

  const handleChange = (field) => (event) => {
    setForm((currentForm) => ({ ...currentForm, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (assignments.length === 0) {
      setError('Select at least one subject to teach.');
      return;
    }

    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      employment_type: form.employmentType,
      assignments,
    });

    if (!result.success) {
      setError(result.message);
      return;
    }

    navigate('/teacher', { replace: true });
  };

  if (dataLoading) {
    return <div className="register-container"><p role="status">Loading classes...</p></div>;
  }

  return (
    <main className="register-container">
      <div className="auth-heading">
        <p className="eyebrow">School scheduling</p>
        <h1>Teacher Registration</h1>
        <p className="auth-intro">Create your account and select the grade subjects you teach.</p>
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="teacher-name">Full Name</label>
          <input id="teacher-name" type="text" value={form.name} onChange={handleChange('name')} required />
        </div>
        <div className="form-group">
          <label htmlFor="teacher-email">Email</label>
          <input id="teacher-email" type="email" value={form.email} onChange={handleChange('email')} required />
        </div>
        <div className="form-group">
          <label htmlFor="teacher-password">Password</label>
          <input id="teacher-password" type="password" minLength="6" value={form.password} onChange={handleChange('password')} required />
        </div>
        <div className="form-group">
          <label htmlFor="employment-type">Employment Type</label>
          <select id="employment-type" value={form.employmentType} onChange={handleChange('employmentType')}>
            <option value="full-time">Full Time (Monday–Friday)</option>
            <option value="part-time">Part Time (Monday, Wednesday, Friday)</option>
          </select>
        </div>

        <fieldset className="assignment-fieldset">
          <legend>Select classes and subjects to teach</legend>
          <p className="form-help">Choose one or more subjects. A subject marked “taken” is already assigned to another teacher.</p>
          {grades.length === 0 ? (
            <p className="muted-text">No grades have been configured yet.</p>
          ) : (
            <div className="assign-grid">
              {grades.map((grade) => (
                <section key={grade.id} className="assign-grade-block" aria-labelledby={`grade-${grade.id}`}>
                  <h2 id={`grade-${grade.id}`} className="assign-grade-title">{formatGradeLabel(grade)}</h2>
                  <div className="assign-subject-list">
                    {(grade.subjects || []).map((subject) => {
                      const takenAssignment = isTaken(grade.id, subject.id);
                      const selected = isSelected(grade.id, subject.id);
                      const checkboxId = `assignment-${grade.id}-${subject.id}`;

                      return (
                        <label key={subject.id} className={`assign-checkbox${takenAssignment ? ' disabled' : ''}`} htmlFor={checkboxId}>
                          <input
                            id={checkboxId}
                            type="checkbox"
                            disabled={takenAssignment}
                            checked={selected}
                            onChange={() => toggleAssignment(grade.id, subject.id)}
                          />
                          <span>{subject.name}</span>
                          {takenAssignment && <small>(taken)</small>}
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </fieldset>

        <button className="auth-submit" type="submit" disabled={loading || grades.length === 0}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      <p className="auth-footer">Already have an account? <Link to="/login">Login</Link></p>
    </main>
  );
};

export default Register;
