import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { user, login, register, createOrg } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ipIdentifier, setIpIdentifier] = useState("");

  // If logged in and has org, go to upload
  if (user?.orgId) {
    navigate("/upload");
    return null;
  }

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      await login();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError("");
    setLoading(true);
    try {
      await register();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrg() {
    if (!ipIdentifier.trim()) return;
    setError("");
    setLoading(true);
    try {
      await createOrg(ipIdentifier.trim());
      navigate("/upload");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Logged in but no org — show org creation
  if (user && !user.orgId) {
    return (
      <div className="page">
        <div className="header">
          <h1>Attestia</h1>
          <p>Create an IP identity or wait to be added to one</p>
        </div>

        <div className="form-container">
          <div className="field">
            <label>IP Identifier</label>
            <input
              type="text"
              value={ipIdentifier}
              onChange={(e) => setIpIdentifier(e.target.value)}
              placeholder="e.g. Disney"
            />
            <span className="field-hint">Unique identifier for your intellectual property</span>
          </div>

          <button
            className="btn"
            onClick={handleCreateOrg}
            disabled={!ipIdentifier.trim() || loading}
          >
            {loading ? "Creating..." : "Create IP Identity"}
          </button>

          {error && <div className="status error">{error}</div>}
        </div>
      </div>
    );
  }

  // Not logged in — show login/register
  return (
    <div className="page">
      <div className="header">
        <h1>Attestia</h1>
        <p>Sign in or create an account</p>
      </div>

      <div className="form-container">
        <button className="btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Authenticating..." : "Sign in with Passkey"}
        </button>

        <p className="auth-switch">
          No account? <button className="link-btn" onClick={handleRegister} disabled={loading}>
            {loading ? "Creating..." : "Create account with Passkey"}
          </button>
        </p>

        {error && <div className="status error">{error}</div>}
      </div>
    </div>
  );
}
