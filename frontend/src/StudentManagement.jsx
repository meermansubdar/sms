import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./services/api";

const API_URL =
  `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/students`;

const emptyForm = {
  admissionNumber: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "Prefer not to say",
  email: "",
  phone: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

export default function App() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState([]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // First, retrieve student records using existing filters.
      const studentResponse = await api.get(API_URL, {
        params: {
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          limit: 100,
        },
      });

      let filteredStudents = studentResponse.data.data || [];

      // If an academic year is selected, filter students through enrollments.
      if (selectedAcademicYearId) {
        const enrollmentResponse = await api.get("/enrollments", {
          params: {
            academicYearId: selectedAcademicYearId,
            classId: selectedClassId || undefined,
            sectionId: selectedSectionId || undefined,
            status: "Active",
            limit: 100,
          },
        });

        const enrolledStudentIds = new Set(
          (enrollmentResponse.data.data || []).map((enrollment) => {
            const student = enrollment.studentId;

            return typeof student === "object"
              ? student._id
              : student;
          })
        );

        filteredStudents = filteredStudents.filter((student) =>
          enrolledStudentIds.has(student._id)
        );
      }

      setStudents(filteredStudents);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load student records. Check the backend."
      );
    } finally {
      setLoading(false);
    }
  }, [
    search,
    statusFilter,
    selectedAcademicYearId,
    selectedClassId,
    selectedSectionId,
  ]);

  const loadAcademicYears = useCallback(async () => {
    try {
      const response = await api.get("/academic-years", {
        params: {
          status: "Active",
          limit: 100,
        },
      });

      setAcademicYears(response.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load academic years."
      );
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const response = await api.get("/classes", {
        params: {
          status: "Active",
          limit: 100,
        },
      });

      setClasses(response.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load classes."
      );
    }
  }, []);

  const loadSections = useCallback(async (classId) => {
    if (!classId) {
      setSections([]);
      return;
    }

    try {
      const response = await api.get("/sections", {
        params: {
          classId,
          status: "Active",
          limit: 100,
        },
      });

      setSections(response.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load sections."
      );
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    loadAcademicYears();
  }, [loadAcademicYears]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    setSelectedSectionId("");
    setSections([]);
    loadSections(selectedClassId);
  }, [selectedClassId, loadSections]);

  useEffect(() => {
    setSelectedClassId("");
    setSelectedSectionId("");
    setSections([]);
  }, [selectedAcademicYearId]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setFieldErrors([]);
  }

  function startEdit(student) {
    setEditingId(student._id);
    setForm({
      admissionNumber: student.admissionNumber || "",
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      dateOfBirth: student.dateOfBirth
        ? new Date(student.dateOfBirth).toISOString().slice(0, 10)
        : "",
      gender: student.gender || "Prefer not to say",
      email: student.email || "",
      phone: student.phone || "",
      address: student.address || "",
      emergencyContactName: student.emergencyContactName || "",
      emergencyContactPhone: student.emergencyContactPhone || "",
    });
    setFieldErrors([]);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    setFieldErrors([]);

    const payload = { ...form };

    // Empty optional fields are omitted instead of sending empty strings.
    for (const key of [
      "email",
      "phone",
      "address",
      "emergencyContactName",
      "emergencyContactPhone",
    ]) {
      if (!payload[key].trim()) delete payload[key];
    }

    if (editingId) {
      delete payload.admissionNumber;
      delete payload.status;
    }

    try {
      if (editingId) {
        await api.patch(`${API_URL}/${editingId}`, payload);
        setNotice("Student record updated successfully.");
      } else {
        await api.post(API_URL, payload);
        setNotice("Student registered successfully.");
      }

      resetForm();
      await loadStudents();
    } catch (err) {
      const response = err.response?.data;

      if (response?.errors) {
        setFieldErrors(response.errors);
      }

      setError(
        response?.message ||
          "Could not save the student record. Check your connection."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(student) {
    const nextStatus = student.status === "Active" ? "Inactive" : "Active";

    const confirmed = window.confirm(
      `Mark ${student.firstName} ${student.lastName} as ${nextStatus}?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await api.patch(`${API_URL}/${student._id}/status`, {
        status: nextStatus,
      });
      setNotice(`Student marked ${nextStatus.toLowerCase()}.`);
      await loadStudents();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not update student status."
      );
    }
  }

  function fieldError(field) {
    return fieldErrors.find((item) => item.field === field)?.message;
  }

  return (
    <div className="min-vh-100 bg-light">
      <nav className="navbar navbar-dark bg-primary shadow-sm">
        <div className="container-fluid px-3 px-lg-4">
          <span className="navbar-brand fw-bold">
            SchoolMS
          </span>
          <span className="text-white small">
            Student Information Management
          </span>
        </div>
      </nav>

      <main className="container-fluid px-3 px-lg-4 py-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h1 className="h3 mb-1">Students</h1>
            <p className="text-secondary mb-0">
              Register and maintain student identity records.
            </p>
          </div>
          <span className="badge text-bg-secondary">
            {students.length} record(s) shown
          </span>
        </div>

        {notice && (
          <div className="alert alert-success" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <section className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <h2 className="h5 mb-0">
              {editingId ? "Edit Student" : "Register Student"}
            </h2>
          </div>

          <div className="card-body p-3 p-lg-4">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="admissionNumber">
                    Admission Number *
                  </label>
                  <input
                    id="admissionNumber"
                    name="admissionNumber"
                    className="form-control"
                    value={form.admissionNumber}
                    onChange={handleChange}
                    required
                    minLength={2}
                    maxLength={30}
                    disabled={Boolean(editingId)}
                  />
                  {fieldError("admissionNumber") && (
                    <div className="text-danger small">
                      {fieldError("admissionNumber")}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="firstName">
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    className="form-control"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    maxLength={60}
                  />
                  {fieldError("firstName") && (
                    <div className="text-danger small">
                      {fieldError("firstName")}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="lastName">
                    Last Name *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    className="form-control"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    maxLength={60}
                  />
                  {fieldError("lastName") && (
                    <div className="text-danger small">
                      {fieldError("lastName")}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="dateOfBirth">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    className="form-control"
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    max={new Date(Date.now() - 86400000)
                      .toISOString()
                      .slice(0, 10)}
                    required
                  />
                  {fieldError("dateOfBirth") && (
                    <div className="text-danger small">
                      {fieldError("dateOfBirth")}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="gender">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    className="form-select"
                    value={form.gender}
                    onChange={handleChange}
                    required
                  >
                    <option>Prefer not to say</option>
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="email">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-control"
                    value={form.email}
                    onChange={handleChange}
                    maxLength={254}
                  />
                  {fieldError("email") && (
                    <div className="text-danger small">
                      {fieldError("email")}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label" htmlFor="phone">
                    Contact Phone (optional)
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    className="form-control"
                    value={form.phone}
                    onChange={handleChange}
                    maxLength={20}
                  />
                  {fieldError("phone") && (
                    <div className="text-danger small">
                      {fieldError("phone")}
                    </div>
                  )}
                </div>

                <div className="col-12 col-md-6">
                  <label
                    className="form-label"
                    htmlFor="emergencyContactName"
                  >
                    Emergency Contact Name (optional)
                  </label>
                  <input
                    id="emergencyContactName"
                    name="emergencyContactName"
                    className="form-control"
                    value={form.emergencyContactName}
                    onChange={handleChange}
                    maxLength={120}
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label
                    className="form-label"
                    htmlFor="emergencyContactPhone"
                  >
                    Emergency Contact Phone (optional)
                  </label>
                  <input
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    className="form-control"
                    value={form.emergencyContactPhone}
                    onChange={handleChange}
                    maxLength={20}
                  />
                  {fieldError("emergencyContactPhone") && (
                    <div className="text-danger small">
                      {fieldError("emergencyContactPhone")}
                    </div>
                  )}
                </div>

                <div className="col-12">
                  <label className="form-label" htmlFor="address">
                    Address (optional)
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    className="form-control"
                    rows="2"
                    value={form.address}
                    onChange={handleChange}
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mt-4">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Register Student"}
                </button>

                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h2 className="h5 mb-0">Student Records</h2>
          </div>

          <div className="card-body">
            <div className="row g-2 mb-3">
                <div className="col-12 col-md-4">
                  <label className="form-label" htmlFor="academicYearFilter">
                    Academic Year
                  </label>

                  <select
                    id="academicYearFilter"
                    className="form-select"
                    value={selectedAcademicYearId}
                    onChange={(event) =>
                      setSelectedAcademicYearId(event.target.value)
                    }
                  >
                    <option value="">Select Academic Year</option>

                    {academicYears.map((year) => (
                      <option key={year._id} value={year._id}>
                        {year.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="classFilter">
                  Class
                </label>

                <select
                  id="classFilter"
                  className="form-select"
                  value={selectedClassId}
                  onChange={(event) =>
                    setSelectedClassId(event.target.value)
                  }
                  disabled={!selectedAcademicYearId}
                >
                  <option value="">Select Class</option>

                  {classes.map((schoolClass) => (
                    <option key={schoolClass._id} value={schoolClass._id}>
                      {schoolClass.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="sectionFilter">
                  Section
                </label>

                <select
                  id="sectionFilter"
                  className="form-select"
                  value={selectedSectionId}
                  onChange={(event) =>
                    setSelectedSectionId(event.target.value)
                  }
                  disabled={!selectedClassId}
                >
                  <option value="">All Sections</option>

                  {sections.map((section) => (
                    <option key={section._id} value={section._id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-8">
                <label className="form-label" htmlFor="search">
                  Search by admission number or name
                </label>
                <input
                  id="search"
                  className="form-control"
                  placeholder="e.g. STU001 or Aisha"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label" htmlFor="statusFilter">
                  Record Status
                </label>
                <select
                  id="statusFilter"
                  className="form-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p role="status">Loading student records...</p>
            ) : students.length === 0 ? (
              <p className="text-secondary mb-0">
                No student records found. Register the first student above.
              </p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Admission No.</th>
                      <th>Student Name</th>
                      <th>Date of Birth</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id}>
                        <td className="fw-semibold">
                          {student.admissionNumber}
                        </td>
                        <td>
                          {student.firstName} {student.lastName}
                        </td>
                        <td>
                          {new Date(student.dateOfBirth).toLocaleDateString()}
                        </td>
                        <td>{student.phone || student.email || "—"}</td>
                        <td>
                          <span
                            className={`badge ${
                              student.status === "Active"
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                          >
                            {student.status}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-info"
                              onClick={() => navigate(`/students/${student._id}`)}
                            >
                              View Profile
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => startEdit(student)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => toggleStatus(student)}
                            >
                              {student.status === "Active"
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
