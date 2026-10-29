
export default function LandingPage({ onLoginClick }) {
  const features = [
    {
      icon: "bi-people",
      title: "Student Management",
      description:
        "Maintain student records and academic information in one place.",
    },
    {
      icon: "bi-calendar-check",
      title: "Attendance Management",
      description:
        "Record and review student attendance efficiently.",
    },
    {
      icon: "bi-mortarboard",
      title: "Academic Management",
      description:
        "Organize academic years, classes, sections and enrollments.",
    },
    {
      icon: "bi-cash-coin",
      title: "Fee Management",
      description:
        "Support organized fee administration and payment tracking.",
    },
  ];

  return (
    <div className="landing-page">
      <nav className="navbar navbar-expand-lg bg-white border-bottom">
        <div className="container py-2">
          <a className="navbar-brand fw-bold" href="#home">
            <i className="bi bi-mortarboard-fill me-2 text-primary" />
            School Management System
          </a>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onLoginClick}
          >
            Sign in <i className="bi bi-arrow-right ms-1" />
          </button>
        </div>
      </nav>

      <main>
        <section id="home" className="landing-hero py-5">
          <div className="container py-lg-5">
            <div className="row align-items-center g-5">
              <div className="col-lg-7">
                <span className="badge text-bg-primary mb-3">
                  SCHOOL ADMINISTRATION PORTAL
                </span>

                <h1 className="display-4 fw-bold mb-4">
                  Manage your school.
                  <span className="landing-heading-accent">
                    {" "}Simplify your day.
                  </span>
                </h1>

                <p className="lead text-secondary mb-4">
                  A centralized application to manage student records,
                  attendance, academic information and school
                  administration workflows.
                </p>

                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={onLoginClick}
                >
                  Get started
                  <i className="bi bi-arrow-right ms-2" />
                </button>

                <p className="small text-secondary mt-3 mb-0">
                  Secure sign-in with role-based access.
                </p>
              </div>

              <div className="col-lg-5">
                <div className="landing-preview shadow-sm">
                  <div className="d-flex align-items-center gap-2 mb-4">
                    <div className="landing-preview-icon">
                      <i className="bi bi-buildings" />
                    </div>
                    <div>
                      <h2 className="h5 fw-bold mb-1">
                        School at a glance
                      </h2>
                      <p className="small text-secondary mb-0">
                        Your administration workspace
                      </p>
                    </div>
                  </div>

                  <div className="landing-preview-row">
                    <i className="bi bi-person-vcard text-primary" />
                    <span>Student records</span>
                    <i className="bi bi-check-circle-fill text-success ms-auto" />
                  </div>

                  <div className="landing-preview-row">
                    <i className="bi bi-calendar2-check text-primary" />
                    <span>Attendance tracking</span>
                    <i className="bi bi-check-circle-fill text-success ms-auto" />
                  </div>

                  <div className="landing-preview-row">
                    <i className="bi bi-journal-text text-primary" />
                    <span>Academic administration</span>
                    <i className="bi bi-check-circle-fill text-success ms-auto" />
                  </div>

                  <div className="landing-preview-row">
                    <i className="bi bi-shield-lock text-primary" />
                    <span>Role-based access</span>
                    <i className="bi bi-check-circle-fill text-success ms-auto" />
                  </div>

                  <p className="small text-secondary mt-3 mb-0">
                    Illustrative preview — not live school statistics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-5">
          <div className="container py-3">
            <div className="text-center mb-5">
              <h2 className="fw-bold">One place for everyday school tasks</h2>
              <p className="text-secondary">
                Access the tools you need through a single application.
              </p>
            </div>

            <div className="row g-4">
              {features.map((feature) => (
                <div className="col-sm-6 col-lg-3" key={feature.title}>
                  <article className="card h-100 landing-feature-card">
                    <div className="card-body p-4">
                      <div className="landing-feature-icon mb-3">
                        <i className={`bi ${feature.icon}`} />
                      </div>

                      <h3 className="h5 fw-bold">
                        {feature.title}
                      </h3>

                      <p className="text-secondary mb-0">
                        {feature.description}
                      </p>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-top bg-white py-4">
        <div className="container text-center">
          <p className="small text-secondary mb-0">
            School Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
