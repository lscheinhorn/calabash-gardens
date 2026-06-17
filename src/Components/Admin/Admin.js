import "./Admin.css";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth, db, isFirebaseConfigured, storage } from "../../firebase-config";
import ContentAdmin from "./ContentAdmin";
import ContentMirrorAudit from "./ContentMirrorAudit";
import EventAdmin from "./EventAdmin";
import EventMirrorAudit from "./EventMirrorAudit";
import AdminPreview from "./AdminPreview";
import MediaAdmin from "./MediaAdmin";
import ProductAdmin from "./ProductAdmin";
import ProductMirrorAudit from "./ProductMirrorAudit";
import ProductPublicParityAudit from "./ProductPublicParityAudit";

const adminCollection = "adminUsers";
const adminThemeStorageKey = "calabashAdminTheme";

const loadInitialTheme = () => {
  if (typeof window === "undefined") {
    return "dark";
  }

  try {
    return window.localStorage.getItem(adminThemeStorageKey) || "dark";
  } catch (error) {
    return "dark";
  }
};

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [isApprovedAdmin, setIsApprovedAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState(loadInitialTheme);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(adminThemeStorageKey, theme);
    } catch (error) {
      // Local persistence is optional; the admin theme still works in memory.
    }
  }, [theme]);

  useEffect(() => {
    if (!auth) {
      return undefined;
    }

    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsApprovedAdmin(false);
      setMessage("");
    });
  }, []);

  useEffect(() => {
    let isCurrentCheck = true;

    const checkAdminAccess = async () => {
      if (!user || !db) {
        setIsApprovedAdmin(false);
        return;
      }

      const userId = user.uid;
      setIsCheckingAdmin(true);

      try {
        const adminUser = await getDoc(doc(db, adminCollection, userId));
        if (!isCurrentCheck) {
          return;
        }

        const adminData = adminUser.exists() ? adminUser.data() : null;
        setIsApprovedAdmin(adminData?.active === true);
      } catch (error) {
        if (isCurrentCheck) {
          setIsApprovedAdmin(false);
          setMessage("Admin access could not be checked.");
        }
      } finally {
        if (isCurrentCheck) {
          setIsCheckingAdmin(false);
        }
      }
    };

    checkAdminAccess();

    return () => {
      isCurrentCheck = false;
    };
  }, [user]);

  const canUseFirebase = isFirebaseConfigured && auth && db && storage;

  const adminAccessLabel = () => {
    if (!user) {
      return "Not signed in";
    }

    if (isCheckingAdmin) {
      return "Checking";
    }

    return isApprovedAdmin ? "Approved" : "Not approved";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canUseFirebase) {
      setMessage("Firebase is not configured for this environment.");
      return;
    }

    setIsSigningIn(true);
    setMessage("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setPassword("");
    } catch (error) {
      setMessage("Sign in failed. Check the email and password.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handlePasswordReset = async () => {
    const resetEmail = email.trim();

    if (!canUseFirebase) {
      setMessage("Firebase is not configured for this environment.");
      return;
    }

    if (!resetEmail) {
      setMessage("Enter the admin email address first.");
      return;
    }

    setIsSendingPasswordReset(true);
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, resetEmail);
    } catch (error) {
      // Keep the response generic so the admin page does not reveal account status.
    } finally {
      setIsSendingPasswordReset(false);
      setMessage("If that email has an admin account, a password reset link has been sent.");
    }
  };

  const handleSignOut = async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
    setEmail("");
    setPassword("");
    setIsApprovedAdmin(false);
  };

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };

  const renderDashboard = () => {
    if (isCheckingAdmin) {
      return <p className="admin_status">Checking admin access...</p>;
    }

    if (!isApprovedAdmin) {
      return (
        <div className="admin_panel">
          <h2>Access Pending</h2>
          <p>
            This account is signed in, but it is not approved for the admin
            dashboard yet.
          </p>
        </div>
      );
    }

    return (
      <div className="admin_panel">
        <h2>Dashboard</h2>
        <p>Admin access is confirmed.</p>
        <div className="admin_placeholder_grid">
          <div>
            <h3>Events</h3>
            <p>Mirror audit and seed controls are available below.</p>
          </div>
          <div>
            <h3>Site Content</h3>
            <p>Editor and mirror audit are available below.</p>
          </div>
        </div>
        <AdminPreview db={db} storage={storage} />
        <MediaAdmin db={db} storage={storage} />
        <ProductMirrorAudit db={db} />
        <ProductPublicParityAudit db={db} />
        <EventMirrorAudit db={db} />
        <EventAdmin db={db} userId={user?.uid || ""} />
        <ContentMirrorAudit db={db} />
        <ContentAdmin db={db} userId={user?.uid || ""} />
        <ProductAdmin db={db} storage={storage} userId={user?.uid || ""} />
      </div>
    );
  };

  const renderStatusPanel = () => (
    <div className="admin_status_panel" aria-label="Admin setup status">
      <div>
        <span>Firebase Config</span>
        <strong>{canUseFirebase ? "Ready" : "Missing"}</strong>
      </div>
      <div>
        <span>Signed In</span>
        <strong>{user?.email || "No"}</strong>
      </div>
      <div>
        <span>Admin Access</span>
        <strong>{adminAccessLabel()}</strong>
      </div>
    </div>
  );

  return (
    <main id="admin" className={`admin_page admin_theme_${theme}`}>
      <section className="admin_shell">
        <div className="admin_header">
          <h1>Admin</h1>
          <div className="admin_button_row">
            <button className="admin_secondary_button" onClick={toggleTheme} type="button">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            {user ? (
              <button className="admin_secondary_button" onClick={handleSignOut} type="button">
                Sign Out
              </button>
            ) : null}
          </div>
        </div>

        {renderStatusPanel()}

        {!canUseFirebase ? (
          <div className="admin_panel">
            <h2>Setup Needed</h2>
            <p>
              Firebase environment variables are required before admin sign in
              can be used.
            </p>
          </div>
        ) : null}

        {!user ? (
          <form className="admin_form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                autoComplete="email"
                disabled={!canUseFirebase || isSigningIn || isSendingPasswordReset}
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>

            <label>
              Password
              <input
                autoComplete="current-password"
                disabled={!canUseFirebase || isSigningIn || isSendingPasswordReset}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>

            <div className="admin_button_row">
              <button
                className="admin_primary_button"
                disabled={!canUseFirebase || isSigningIn || isSendingPasswordReset || !email || !password}
                type="submit"
              >
                {isSigningIn ? "Signing In..." : "Sign In"}
              </button>
              <button
                className="admin_secondary_button"
                disabled={!canUseFirebase || isSigningIn || isSendingPasswordReset || !email.trim()}
                onClick={handlePasswordReset}
                type="button"
              >
                {isSendingPasswordReset ? "Sending Reset..." : "Forgot Password?"}
              </button>
            </div>
          </form>
        ) : (
          renderDashboard()
        )}

        {message ? <p className="admin_message">{message}</p> : null}
      </section>
    </main>
  );
}
