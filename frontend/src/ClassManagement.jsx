
import { useCallback, useEffect, useState } from "react";
import api from "./services/api";

const emptyForm = {
  gradeNumber: "1"
};

const VIEW_ROLES = [
  "Administrator",
  "Principal",
  "Teacher",
  "Accountant"
];

export default function ClassManagement({ user, onBack }) {
  const canView = VIEW_ROLES.includes(user?.role);
  const canManage = ["Administrator", "Principal"].includes(user?.role);

  const [classes, setClasses] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/classes", {
        params: {
          search,
          status: statusFilter,
          page,
          limit: 10
        }
      });

      setClasses(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load classes. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function startEdit(schoolClass) {
    setEditingId(schoolClass._id);
    setForm({
      gradeNumber: String(schoolClass.gradeNumber)
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
    setForm({ gradeNumber: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const gradeNumber = Number(form.gradeNumber);

    if (
      !Number.isInteger(gradeNumber) ||
      gradeNumber < 1 ||
      gradeNumber > 12
    ) {
      setError("Please select a grade from Class 1 to Class 12.");
      return;
    }

    const payload = {
      name: `Class ${gradeNumber}`,
      gradeNumber
    };

    setSaving(true);

    try {
      if (editingId) {
        await api.patch(`/classes/${editingId}`, payload);
        setSuccess("Class updated successfully.");
      } else {
        await api.post("/classes", payload);
        setSuccess("Class created successfully.");
      }

      closeForm();

      if (page !== 1) {
        setPage(1);
      } else {
        await loadClasses();
      }
    } catch (err) {
      const validationErrors = err.response?.data?.errors;
      const detail = Array.isArray(validationErrors)
        ? validationErrors.map((item) => item.message).join(" ")
        : "";

      setError(
        detail ||
          err.response?.data?.message ||
          "Unable to save the class."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(schoolClass) {
    const nextStatus =
      schoolClass.status === "Active" ? "Inactive" : "Active";

    const confirmed = window.confirm(
      `Are you sure you want to mark ${schoolClass.name} as ${nextStatus}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.patch(`/classes/${schoolClass._id}/status`, {
        status: nextStatus
      });

      setSuccess(
        `${schoolClass.name} marked ${nextStatus.toLowerCase()} successfully.`
      );

      await loadClasses();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to change the class status."
      );
    }
  }

  if (!canView) {
    return (
      <main className="container py-5">
        <div className="alert alert-danger" role="alert">
          You do not have permission to view classes.
        </div>
      </main>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Class Management</h2>
          <p className="text-muted mb-0">
            Manage Classes 1 to 12 and their status.
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
              + Add Class
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
              {editingId ? "Edit Class" : "Create Class"}
            </h5>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="classGradeNumber" className="form-label">
                    Grade Number
                  </label>

                  <select
                    id="classGradeNumber"
                    className="form-select"
                    value={form.gradeNumber}
                    onChange={handleChange}
                    required
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(
                      (grade) => (
                        <option key={grade} value={grade}>
                          Class {grade}
                        </option>
                      )
                    )}
                  </select>

                  <div className="form-text">
                    Class name is generated automatically from the selected
                    grade.
                  </div>
                </div>

                <div className="col-md-6">
                  <label htmlFor="classNamePreview" className="form-label">
                    Class Name
                  </label>

                  <input
                    id="classNamePreview"
                    className="form-control"
                    value={`Class ${form.gradeNumber}`}
                    readOnly
                  />
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
                      : "Create Class"}
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
            <div className="col-md-8">
              <label htmlFor="classSearch" className="form-label">
                Search by Class Name
              </label>

              <input
                id="classSearch"
                className="form-control"
                placeholder="For example, Class 6"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="classStatus" className="form-label">
                Filter by Status
              </label>

              <select
                id="classStatus"
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
              <p className="mt-2 mb-0">Loading classes...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Class Name</th>
                    <th>Grade Number</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {classes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManage ? 4 : 3}
                        className="text-center text-muted py-4"
                      >
                        No classes found.
                      </td>
                    </tr>
                  ) : (
                    classes.map((schoolClass) => (
                      <tr key={schoolClass._id}>
                        <td className="fw-semibold">{schoolClass.name}</td>
                        <td>{schoolClass.gradeNumber}</td>

                        <td>
                          <span
                            className={`badge ${
                              schoolClass.status === "Active"
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                          >
                            {schoolClass.status}
                          </span>
                        </td>

                        {canManage && (
                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => startEdit(schoolClass)}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className={`btn btn-sm ${
                                  schoolClass.status === "Active"
                                    ? "btn-outline-danger"
                                    : "btn-outline-success"
                                }`}
                                onClick={() => changeStatus(schoolClass)}
                              >
                                {schoolClass.status === "Active"
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
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
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
