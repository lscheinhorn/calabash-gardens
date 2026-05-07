import "./Admin.css";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth, db, isFirebaseConfigured } from "../../firebase-config";
import ProductAdmin from "./ProductAdmin";

const adminCollection = "adminUsers";

export default function Admin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [isApprovedAdmin, setIsApprovedAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [message, setMessage] = useState("");

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

  const canUseFirebase = isFirebaseConfigured && auth && db;

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

  const handleSignOut = async () => {
    if (!auth) {
      return;
    }

    await signOut(auth);
    setEmail("");
    setPassword("");
    setIsApprovedAdmin(false);
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
            <p>Editor not connected yet.</p>
          </div>
          <div>
            <h3>Site Content</h3>
            <p>Editor not connected yet.</p>
          </div>
        </div>
        <ProductAdmin db={db} />
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
    <main id="admin" className="admin_page">
      <section className="admin_shell">
        <div className="admin_header">
          <h1>Admin</h1>
          {user ? (
            <button className="admin_secondary_button" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : null}
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
                disabled={!canUseFirebase || isSigningIn}
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
                disabled={!canUseFirebase || isSigningIn}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>

            <button
              className="admin_primary_button"
              disabled={!canUseFirebase || isSigningIn || !email || !password}
              type="submit"
            >
              {isSigningIn ? "Signing In..." : "Sign In"}
            </button>
          </form>
        ) : (
          renderDashboard()
        )}

        {message ? <p className="admin_message">{message}</p> : null}
      </section>
    </main>
  );
}
