
import { useCallback, useEffect, useState } from "react";
import api from "./services/api";

const emptyForm = {
  name: "A",
  classId: "",
};

const VIEW_ROLES = [
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant",
];

const MANAGE_ROLES = ["Administrator", "Principal"];

export default function SectionManagement({ user, onBack }) {
  const canView = VIEW_ROLES.includes(user?.role);
  const canManage = MANAGE_ROLES.includes(user?.role);

  const [sections, setSections] = useState([]);
  const [classes, setClasses] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(1);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load classes for the class selection dropdown.
  const loadClasses = useCallback(async () => {
    try {
      const response = await api.get("/classes", {
        params: {
          limit: 100,
          page: 1,
        },
      });

      setClasses(response.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load classes. Please try again."
      );
    }
  }, []);

  // Load sections using the selected search and filter criteria.
  const loadSections = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/sections", {
        params: {
          search,
          status: statusFilter,
          classId: classFilter,
          page,
          limit: 10,
        },
      });

      setSections(response.data.data || []);
      setPagination(
        response.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load sections. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, classFilter, page]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function startEdit(section) {
    setEditingId(section._id);
    setForm({
      name: section.name,
      classId: section.classId?._id || section.classId || "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === "name" ? value.toUpperCase() : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim().toUpperCase();

    if (!/^[A-Z]$/.test(name)) {
      setError("Section name must be a single letter from A to Z.");
      return;
    }

    if (!form.classId) {
      setError("Please select a class.");
      return;
    }

    const selectedClass = classes.find(
      (schoolClass) => schoolClass._id === form.classId
    );

    if (!selectedClass) {
      setError("Please select a valid class.");
      return;
    }

    if (selectedClass.status !== "Active") {
      setError("Please select an active class.");
      return;
    }

    const payload = {
      name,
      classId: form.classId,
    };

    setSaving(true);

    try {
      if (editingId) {
        await api.patch(`/sections/${editingId}`, payload);
        setSuccess("Section updated successfully.");
      } else {
        await api.post("/sections", payload);
        setSuccess("Section created successfully.");
      }

      closeForm();

      if (page !== 1) {
        setPage(1);
      } else {
        await loadSections();
      }
    } catch (err) {
      const validationErrors = err.response?.data?.errors;

      const detail = Array.isArray(validationErrors)
        ? validationErrors.map((item) => item.message).join(" ")
        : "";

      setError(
        detail ||
          err.response?.data?.message ||
          "Unable to save the section."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(section) {
    const nextStatus =
      section.status === "Active" ? "Inactive" : "Active";

    const confirmed = window.confirm(
      `Are you sure you want to mark Section ${section.name} as ${nextStatus}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.patch(`/sections/${section._id}/status`, {
        status: nextStatus,
      });

      setSuccess(
        `Section ${section.name} marked ${nextStatus.toLowerCase()} successfully.`
      );

      await loadSections();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to change the section status."
      );
    }
  }

  if (!canView) {
    return (
      <main className="container py-5">
        <div className="alert alert-danger" role="alert">
          You do not have permission to view sections.
        </div>
      </main>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Section Management</h2>
          <p className="text-muted mb-0">
            Manage class sections such as A, B and C.
          </p>
        </div>

        <div className="d-flex gap-2">
          {onBack && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onBack}
            >
              Back
            </button>
          )}

          {canManage && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={startCreate}
            >
              + Add Section
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="status">
          {success}
        </div>
      )}

      {showForm && canManage && (
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-white">
            <h5 className="mb-0">
              {editingId ? "Edit Section" : "Create Section"}
            </h5>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="sectionClass" className="form-label">
                    Class
                  </label>

                  <select
                    id="sectionClass"
                    name="classId"
                    className="form-select"
                    value={form.classId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select a class</option>

                    {classes.map((schoolClass) => (
                      <option
                        key={schoolClass._id}
                        value={schoolClass._id}
                        disabled={schoolClass.status !== "Active"}
                      >
                        {schoolClass.name}
                        {schoolClass.status !== "Active"
                          ? " (Inactive)"
                          : ""}
                      </option>
                    ))}
                  </select>

                  <div className="form-text">
                    Sections can only be assigned to active classes.
                  </div>
                </div>

                <div className="col-md-6">
                  <label htmlFor="sectionName" className="form-label">
                    Section Name
                  </label>

                  <select
                    id="sectionName"
                    name="name"
                    className="form-select"
                    value={form.name}
                    onChange={handleChange}
                    required
                  >
                    {Array.from({ length: 26 }, (_, index) =>
                      String.fromCharCode(65 + index)
                    ).map((letter) => (
                      <option key={letter} value={letter}>
                        Section {letter}
                      </option>
                    ))}
                  </select>

                  <div className="form-text">
                    Choose a single letter from A to Z.
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Section"}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <label htmlFor="sectionSearch" className="form-label">
                Search by Section
              </label>

              <input
                id="sectionSearch"
                className="form-control"
                placeholder="For example, A"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="sectionClassFilter" className="form-label">
                Filter by Class
              </label>

              <select
                id="sectionClassFilter"
                className="form-select"
                value={classFilter}
                onChange={(event) => {
                  setClassFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Classes</option>

                {classes.map((schoolClass) => (
                  <option
                    key={schoolClass._id}
                    value={schoolClass._id}
                  >
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label htmlFor="sectionStatus" className="form-label">
                Filter by Status
              </label>

              <select
                id="sectionStatus"
                className="form-select"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 mb-0">Loading sections...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Section</th>
                    <th>Class</th>
                    <th>Grade Number</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {sections.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManage ? 5 : 4}
                        className="text-center text-muted py-4"
                      >
                        No sections found.
                      </td>
                    </tr>
                  ) : (
                    sections.map((section) => (
                      <tr key={section._id}>
                        <td className="fw-semibold">
                          Section {section.name}
                        </td>

                        <td>
                          {section.classId?.name || "Class unavailable"}
                        </td>

                        <td>
                          {section.classId?.gradeNumber ?? "—"}
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              section.status === "Active"
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                          >
                            {section.status}
                          </span>
                        </td>

                        {canManage && (
                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => startEdit(section)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className={`btn btn-sm ${
                                  section.status === "Active"
                                    ? "btn-outline-danger"
                                    : "btn-outline-success"
                                }`}
                                onClick={() => changeStatus(section)}
                              >
                                {section.status === "Active"
                                  ? "Deactivate"
                                  : "Reactivate"}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
            <span className="text-muted small">
              Total records: {pagination.total}
            </span>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>

              <span className="small">
                Page {pagination.page} of{" "}
                {Math.max(pagination.totalPages, 1)}
              </span>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
