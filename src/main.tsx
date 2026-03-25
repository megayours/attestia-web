import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LandingPage } from "./pages/Landing";
import { SignPage } from "./pages/Sign";
import { LoginPage } from "./pages/Login";
import "./styles.css";

// Handle GitHub Pages SPA redirect
function SpaRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = params.get("p");
    if (path) navigate(path, { replace: true });
  }, [navigate]);
  return null;
}

function Nav() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <nav className={`nav-bar ${isLanding ? "nav-transparent" : ""}`}>
      <Link to="/" className="nav-brand">Attestia</Link>
      <div className="nav-links">
        {!isLanding && <Link to="/" className={location.pathname === "/" ? "active" : ""}>Home</Link>}
        <Link to="/upload" className={location.pathname === "/upload" ? "active" : ""}>Sign</Link>
        {isLanding && <a href="#how-it-works">How It Works</a>}
      </div>
      <div className="nav-auth">
        {user ? (
          <>
            {user.ipIdentifier && <span className="nav-user">{user.ipIdentifier}</span>}
            <button className="link-btn" onClick={logout}>Logout</button>
          </>
        ) : (
          <Link to="/login" className="nav-login-btn">Login</Link>
        )}
      </div>
    </nav>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SpaRedirect />
        <Nav />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<SignPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
