import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

const Login = () => {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const result = await login(email, password);

    if (result.success) {
      window.location.href = result.user.role === 'admin' ? '/admin' : '/teacher';
    } else {
      setError(result.message);
    }
  };

  return (
    <main className="login-container">
      <div className="auth-heading">
        <p className="eyebrow">School scheduling</p>
        <h1>Welcome back</h1>
        <p className="auth-intro">Sign in to view your classes and timetable.</p>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
      </form>
      <p className="auth-footer">Don&apos;t have an account? <Link to="/register">Register</Link></p>
    </main>
  );
};

export default Login;
