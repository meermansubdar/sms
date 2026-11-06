
import { useEffect, useState } from "react";
import api from "../services/api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  const formattedCountdown = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password
      });

      const { token, user } = response.data;

      sessionStorage.setItem("school_access_token", token);
      onLogin(user);
    } catch (err) {
      const retryAfter = err.response?.data?.retryAfterSeconds;

      if (err.response?.status === 429 && retryAfter) {
        setCountdown(retryAfter);
        setError("Too many login attempts. Please wait.");
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to sign in. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-9 col-md-6 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h1 className="h3 text-center mb-2">
                School Management System
              </h1>

              <p className="text-secondary text-center mb-4">
                Sign in to continue
              </p>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}

                  {countdown > 0 && (
                    <div className="mt-2">
                      <strong>
                        Please try again in: {formattedCountdown}
                      </strong>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email address
                  </label>

                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="username"
                    maxLength={254}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    maxLength={128}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading || countdown > 0}
                >
                  {loading
                    ? "Signing in..."
                    : countdown > 0
                      ? `Try again in ${formattedCountdown}`
                      : "Sign in"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
