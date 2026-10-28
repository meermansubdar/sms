import { useEffect, useState } from "react";
import api from "../services/api";
import Login from "./Login";
import StudentManagement from "../StudentManagement";
import AcademicYearManagement from "../AcademicYearManagement";
import ClassManagement from "../ClassManagement";
import SectionManagement from "../SectionManagement";
import EnrollmentManagement from "../EnrollmentManagement";

const STUDENT_MODULE_ROLES = [
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant",
];

const ACADEMIC_YEAR_VIEW_ROLES = [
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant",
];

const ACADEMIC_YEAR_MANAGE_ROLES = [
  "Administrator",
  "Principal",
];

const CLASS_VIEW_ROLES = [
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant",
];

const CLASS_MANAGE_ROLES = [
  "Administrator",
  "Principal",
];

const SECTION_VIEW_ROLES = [
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant",
];

const SECTION_MANAGE_ROLES = [
  "Administrator",
  "Principal",
];

const ENROLLMENT_VIEW_ROLES = [
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant",
];

const ENROLLMENT_MANAGE_ROLES = [
  "Administrator",
  "Principal",
];

export default function AuthGate() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [activeModule, setActiveModule] = useState("students");

  useEffect(() => {
    let active = true;

    async function verifySession() {
      const token = sessionStorage.getItem("school_access_token");

      if (!token) {
        if (active) setChecking(false);
        return;
      }

      try {
        const response = await api.get("/auth/me");

        if (active) {
          setUser(response.data.user);
        }
      } catch {
        sessionStorage.removeItem("school_access_token");

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    verifySession();

    return () => {
      active = false;
    };
  }, []);

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
    setActiveModule("students");
  }

  function handleLogout() {
    sessionStorage.removeItem("school_access_token");
    setUser(null);
    setActiveModule("students");
  }

  function openModule(moduleName) {
    setActiveModule(moduleName);
  }

  if (checking) {
    return (
      <div className="container py-5 text-center" role="status">
        Checking your session...
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const canViewStudents = STUDENT_MODULE_ROLES.includes(user.role);

  const canViewAcademicYears =
    ACADEMIC_YEAR_VIEW_ROLES.includes(user.role);

  const canManageAcademicYears =
    ACADEMIC_YEAR_MANAGE_ROLES.includes(user.role);

  const canViewClasses = CLASS_VIEW_ROLES.includes(user.role);

  const canManageClasses = CLASS_MANAGE_ROLES.includes(user.role);

  const canViewSections = SECTION_VIEW_ROLES.includes(user.role);

  const canManageSections = SECTION_MANAGE_ROLES.includes(user.role);

  const canViewEnrollments =
  ENROLLMENT_VIEW_ROLES.includes(user.role);
  
  const canManageEnrollments =
  ENROLLMENT_MANAGE_ROLES.includes(user.role);

  const canViewAnyModule =
    canViewStudents ||
    canViewAcademicYears ||
    canViewClasses ||
    canViewSections ||
    canViewEnrollments;

  return (
    <>
      <nav className="navbar bg-light border-bottom">
        <div className="container-fluid px-3 px-md-4">
          <span className="navbar-brand mb-0 h1">
            School Management System
          </span>

          <div className="d-flex align-items-center gap-3">
            <div className="text-end">
              <div className="fw-semibold">{user.name}</div>
              <small className="text-secondary">{user.role}</small>
            </div>

            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </nav>

      {canViewAnyModule && (
        <div className="bg-white border-bottom">
          <div className="container-fluid px-3 px-md-4 py-2">
            <div className="d-flex flex-wrap gap-2">
              {canViewStudents && (
                <button
                  type="button"
                  className={`btn btn-sm ${
                    activeModule === "students"
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() => openModule("students")}
                  aria-current={
                    activeModule === "students" ? "page" : undefined
                  }
                >
                  Student Management
                </button>
              )}

              {canViewAcademicYears && (
                <button
                  type="button"
                  className={`btn btn-sm ${
                    activeModule === "academicYears"
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() => openModule("academicYears")}
                  aria-current={
                    activeModule === "academicYears" ? "page" : undefined
                  }
                >
                  Academic Year Management
                </button>
              )}

              {canViewClasses && (
                <button
                  type="button"
                  className={`btn btn-sm ${
                    activeModule === "classes"
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() => openModule("classes")}
                  aria-current={
                    activeModule === "classes" ? "page" : undefined
                  }
                >
                  Class Management
                </button>
              )}

              {canViewSections && (
                <button
                  type="button"
                  className={`btn btn-sm ${
                    activeModule === "sections"
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() => openModule("sections")}
                  aria-current={
                    activeModule === "sections" ? "page" : undefined
                  }
                >
                  Section Management
                </button>
              )}

              {canViewEnrollments && (
                <button
                    type="button"
                    className={`btn btn-sm ${
                    activeModule === "enrollments"
                        ? "btn-primary"
                        : "btn-outline-primary"
                    }`}
                    onClick={() => openModule("enrollments")}
                    aria-current={
                    activeModule === "enrollments" ? "page" : undefined
                    }
                >
                    Enrollment Management
                </button>
                )}
            </div>
          </div>
        </div>
      )}

      {activeModule === "students" && canViewStudents && (
        <StudentManagement />
      )}

      {activeModule === "academicYears" && canViewAcademicYears && (
        <AcademicYearManagement
          user={user}
          onBack={() => openModule("students")}
        />
      )}

      {activeModule === "classes" && canViewClasses && (
        <ClassManagement
          user={user}
          onBack={() => openModule("students")}
        />
      )}

      {activeModule === "sections" && canViewSections && (
        <SectionManagement
          user={user}
          onBack={() => openModule("students")}
        />
      )}

      {activeModule === "enrollments" && canViewEnrollments && (
        <EnrollmentManagement
            user={user}
            onBack={() => openModule("students")}
        />
       )}

      {!canViewAnyModule && (
        <main className="container py-5">
          <div className="alert alert-info">
            You are signed in, but this role does not currently have
            access to the available management screens.
            Additional role-specific modules will be added later.
          </div>
        </main>
      )}
    </>
  );
}
