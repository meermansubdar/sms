
import { useCallback, useEffect, useState } from "react";
import api from "./services/api";

const emptyForm = {
  name: "",
  startDate: "",
  endDate: ""
};

export default function AcademicYearManagement({ user, onBack }) {
  const canManage = ["Administrator", "Principal"].includes(user?.role);

  const [years, setYears] = useState([]);
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

  const loadYears = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/academic-years", {
        params: {
          search,
          status: statusFilter,
          page,
          limit: 10
        }
      });

      setYears(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load academic years. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function startEdit(year) {
    setEditingId(year._id);
    setForm({
      name: year.name,
      startDate: year.startDate.slice(0, 10),
      endDate: year.endDate.slice(0, 10)
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
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.endDate <= form.startDate) {
      setError("End date must be later than start date.");
      return;
    }

    const startYear = form.startDate.slice(0, 4);
    const endYear = form.endDate.slice(0, 4);

    if (form.name !== `${startYear}-${endYear}`) {
      setError(
        `The academic year name must be ${startYear}-${endYear}, based on the dates.`
      );
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await api.patch(`/academic-years/${editingId}`, form);
        setSuccess("Academic year updated successfully.");
      } else {
        await api.post("/academic-years", form);
        setSuccess("Academic year created successfully.");
      }

      closeForm();
      setPage(1);
      await loadYears();
    } catch (err) {
      const validationErrors = err.response?.data?.errors;
      const detail = Array.isArray(validationErrors)
        ? validationErrors.map((item) => item.message).join(" ")
        : "";

      setError(
        detail ||
          err.response?.data?.message ||
          "Unable to save the academic year."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(year) {
    const nextStatus = year.status === "Active" ? "Inactive" : "Active";

    const confirmed = window.confirm(
      `Are you sure you want to mark ${year.name} as ${nextStatus}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.patch(`/academic-years/${year._id}/status`, {
        status: nextStatus
      });

      setSuccess(`${year.name} marked ${nextStatus.toLowerCase()} successfully.`);
      await loadYears();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to change the academic year status."
      );
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Academic Year Management</h2>
          <p className="text-muted mb-0">
            Manage academic year dates and status.
          </p>
        </div>

        <div className="d-flex gap-2">
          {onBack && (
            <button className="btn btn-outline-secondary" onClick={onBack}>
              Back
            </button>
          )}
          {canManage && (
            <button className="btn btn-primary" onClick={startCreate}>
              + Add Academic Year
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
              {editingId ? "Edit Academic Year" : "Create Academic Year"}
            </h5>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label htmlFor="academicYearName" className="form-label">
                    Academic Year Name
                  </label>
                  <input
                    id="academicYearName"
                    className="form-control"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="2026-2027"
                    pattern="[0-9]{4}-[0-9]{4}"
                    required
                  />
                  <div className="form-text">
                    Must match the years in the start and end dates.
                  </div>
                </div>

                <div className="col-md-4">
                  <label htmlFor="startDate" className="form-label">
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    className="form-control"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label htmlFor="endDate" className="form-label">
                    End Date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    className="form-control"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                    required
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
                      : "Create Academic Year"}
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
              <label htmlFor="yearSearch" className="form-label">
                Search by Academic Year
              </label>
              <input
                id="yearSearch"
                className="form-control"
                placeholder="For example, 2026-2027"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="col-md-4">
              <label htmlFor="yearStatus" className="form-label">
                Filter by Status
              </label>
              <select
                id="yearStatus"
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
              <p className="mt-2 mb-0">Loading academic years...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Academic Year</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {years.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManage ? 5 : 4}
                        className="text-center text-muted py-4"
                      >
                        No academic years found.
                      </td>
                    </tr>
                  ) : (
                    years.map((year) => (
                      <tr key={year._id}>
                        <td className="fw-semibold">{year.name}</td>
                        <td>{year.startDate.slice(0, 10)}</td>
                        <td>{year.endDate.slice(0, 10)}</td>
                        <td>
                          <span
                            className={`badge ${
                              year.status === "Active"
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                          >
                            {year.status}
                          </span>
                        </td>
                        {canManage && (
                          <td>
                            <div className="d-flex flex-wrap gap-2">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => startEdit(year)}
                              >
                                Edit
                              </button>
                              <button
                                className={`btn btn-sm ${
                                  year.status === "Active"
                                    ? "btn-outline-danger"
                                    : "btn-outline-success"
                                }`}
                                onClick={() => changeStatus(year)}
                              >
                                {year.status === "Active"
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
