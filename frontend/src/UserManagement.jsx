
import { useCallback, useEffect, useState } from "react";
import api from "./services/api";

const ROLES = [
  "Administrator",
  "Principal",
  "Teacher",
  "Student",
  "Parent",
  "Accountant",
];

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  role: "Teacher",
};

const EMPTY_EDIT_FORM = {
  name: "",
  email: "",
  role: "Teacher",
  status: "Active",
};

export default function UserManagement({ user, onBack }) {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const availableRoles =
    user?.role === "Administrator"
      ? ROLES
      : ["Teacher", "Student", "Parent", "Accountant"];

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { page, limit: 10 };
      if (role) params.role = role;
      if (status) params.status = status;

      const response = await api.get("/users", { params });

      setUsers(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load users. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [page, role, status]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function changeRole(value) {
    setRole(value);
    setPage(1);
  }

  function changeStatus(value) {
    setStatus(value);
    setPage(1);
  }

  function openCreateForm() {
    setEditingUser(null);
    setForm({
      ...EMPTY_FORM,
      role: availableRoles.includes("Teacher")
        ? "Teacher"
        : availableRoles[0],
    });
    setFormError("");
    setEditError("");
    setMessage("");
    setShowForm(true);
  }

  function closeCreateForm() {
    if (saving) return;
    setShowForm(false);
    setFormError("");
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setFormError("");
    setMessage("");

    if (form.name.trim().length < 2) {
      setFormError("Name must contain at least 2 characters.");
      return;
    }

    if (form.password.length < 8) {
      setFormError("Password must contain at least 8 characters.");
      return;
    }

    if (!availableRoles.includes(form.role)) {
      setFormError("You cannot assign the selected role.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/users", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      setShowForm(false);
      setForm(EMPTY_FORM);
      setMessage("User created successfully.");
      setPage(1);
      setRole("");
      setStatus("");
    } catch (err) {
      const responseData = err.response?.data;
      const validationMessage = responseData?.errors
        ?.map((item) => item.message)
        .join(" ");

      setFormError(
        validationMessage ||
          responseData?.message ||
          "Unable to create user. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function openEditForm(item) {
    setShowForm(false);
    setFormError("");
    setEditError("");
    setMessage("");
    setEditingUser(item);
    setEditForm({
      name: item.name || "",
      email: item.email || "",
      role: item.role || "Teacher",
      status: item.status || "Active",
    });
  }

  function closeEditForm() {
    if (savingEdit) return;
    setEditingUser(null);
    setEditError("");
  }

  function handleEditFormChange(event) {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  }

  async function handleUpdateUser(event) {
    event.preventDefault();
    setEditError("");
    setMessage("");

    if (editForm.name.trim().length < 2) {
      setEditError("Name must contain at least 2 characters.");
      return;
    }

    if (!availableRoles.includes(editForm.role)) {
      setEditError("You cannot assign the selected role.");
      return;
    }

    if (
      editingUser._id === user?.id &&
      editForm.status === "Inactive"
    ) {
      setEditError("You cannot deactivate your own account.");
      return;
    }

    setSavingEdit(true);

    try {
      await api.patch(`/users/${editingUser._id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        status: editForm.status,
      });

      setEditingUser(null);
      setMessage("User updated successfully.");
      await loadUsers();
    } catch (err) {
      const responseData = err.response?.data;
      const validationMessage = responseData?.errors
        ?.map((item) => item.message)
        .join(" ");

      setEditError(
        validationMessage ||
          responseData?.message ||
          "Unable to update user. Please try again."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <main className="container-fluid px-3 px-md-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">User Management</h2>
          <p className="text-secondary mb-0">
            View and manage school user accounts.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateForm}
          >
            <i className="bi bi-person-plus me-2" aria-hidden="true" />
            Add User
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onBack}
          >
            Back to Students
          </button>
        </div>
      </div>

      {message && (
        <div className="alert alert-success alert-dismissible" role="status">
          {message}
          <button
            type="button"
            className="btn-close"
            aria-label="Dismiss"
            onClick={() => setMessage("")}
          />
        </div>
      )}

      {showForm && (
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0">Create New User</h5>
          </div>

          <div className="card-body">
            {formError && (
              <div className="alert alert-danger" role="alert">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="newUserName" className="form-label">
                    Full Name
                  </label>
                  <input
                    id="newUserName"
                    name="name"
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={handleFormChange}
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    required
                    disabled={saving}
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="newUserEmail" className="form-label">
                    Email Address
                  </label>
                  <input
                    id="newUserEmail"
                    name="email"
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={handleFormChange}
                    maxLength={254}
                    autoComplete="email"
                    required
                    disabled={saving}
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="newUserPassword" className="form-label">
                    Temporary Password
                  </label>
                  <input
                    id="newUserPassword"
                    name="password"
                    type="password"
                    className="form-control"
                    value={form.password}
                    onChange={handleFormChange}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                    disabled={saving}
                  />
                  <div className="form-text">
                    Use at least 8 characters.
                  </div>
                </div>

                <div className="col-md-6">
                  <label htmlFor="newUserRole" className="form-label">
                    User Role
                  </label>
                  <select
                    id="newUserRole"
                    name="role"
                    className="form-select"
                    value={form.role}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                  >
                    {availableRoles.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Creating User..." : "Create User"}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeCreateForm}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0">Edit User</h5>
          </div>

          <div className="card-body">
            {editError && (
              <div className="alert alert-danger" role="alert">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateUser}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="editUserName" className="form-label">
                    Full Name
                  </label>
                  <input
                    id="editUserName"
                    name="name"
                    type="text"
                    className="form-control"
                    value={editForm.name}
                    onChange={handleEditFormChange}
                    minLength={2}
                    maxLength={100}
                    required
                    disabled={savingEdit}
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="editUserEmail" className="form-label">
                    Email Address
                  </label>
                  <input
                    id="editUserEmail"
                    name="email"
                    type="email"
                    className="form-control"
                    value={editForm.email}
                    onChange={handleEditFormChange}
                    maxLength={254}
                    required
                    disabled={savingEdit}
                  />
                </div>

                <div className="col-md-6">
                  <label htmlFor="editUserRole" className="form-label">
                    User Role
                  </label>
                  <select
                    id="editUserRole"
                    name="role"
                    className="form-select"
                    value={editForm.role}
                    onChange={handleEditFormChange}
                    required
                    disabled={savingEdit}
                  >
                    {availableRoles.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label htmlFor="editUserStatus" className="form-label">
                    Account Status
                  </label>
                  <select
                    id="editUserStatus"
                    name="status"
                    className="form-select"
                    value={editForm.status}
                    onChange={handleEditFormChange}
                    required
                    disabled={savingEdit}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving Changes..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeEditForm}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label htmlFor="userRoleFilter" className="form-label">
                Filter by role
              </label>
              <select
                id="userRoleFilter"
                className="form-select"
                value={role}
                onChange={(event) => changeRole(event.target.value)}
              >
                <option value="">All roles</option>
                {ROLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label htmlFor="userStatusFilter" className="form-label">
                Filter by status
              </label>
              <select
                id="userStatusFilter"
                className="form-select"
                value={status}
                onChange={(event) => changeStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="col-md-4">
              <button
                type="button"
                className="btn btn-outline-primary w-100"
                onClick={loadUsers}
                disabled={loading}
              >
                Refresh Users
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-3"
            onClick={loadUsers}
          >
            Retry
          </button>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <h5 className="mb-0">School Users</h5>
          <span className="badge text-bg-secondary">
            {pagination.total} total
          </span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-secondary">
                    No users found for the selected filters.
                  </td>
                </tr>
              ) : (
                users.map((item) => {
                  const canEditRole = availableRoles.includes(item.role);

                  return (
                    <tr key={item._id}>
                      <td className="fw-semibold">{item.name}</td>
                      <td>{item.email}</td>
                      <td>{item.role}</td>
                      <td>
                        <span
                          className={`badge ${
                            item.status === "Active"
                              ? "text-bg-success"
                              : "text-bg-secondary"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      
                    <td>
                    <div className="d-flex flex-wrap gap-2">
                        <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openEditForm(item)}
                        disabled={!canEditRole}
                        title={
                            canEditRole
                            ? "Edit user"
                            : "Your role cannot manage this account"
                        }
                        >
                        <i
                            className="bi bi-pencil-square me-1"
                            aria-hidden="true"
                        />
                        Edit
                        </button>

                        <button
                        type="button"
                        className={`btn btn-sm ${
                            item.status === "Active"
                            ? "btn-outline-danger"
                            : "btn-outline-success"
                        }`}
                        disabled={
                            !canEditRole ||
                            (item._id === user?.id && item.status === "Active")
                        }
                        onClick={async () => {
                            const nextStatus =
                            item.status === "Active" ? "Inactive" : "Active";

                            const confirmed = window.confirm(
                            `Are you sure you want to ${nextStatus.toLowerCase()} ${item.name}'s account?`
                            );

                            if (!confirmed) return;

                            setMessage("");
                            setError("");

                            try {
                            await api.patch(`/users/${item._id}`, {
                                status: nextStatus,
                            });

                            setMessage(
                                `${item.name}'s account is now ${nextStatus.toLowerCase()}.`
                            );

                            await loadUsers();
                            } catch (err) {
                            setError(
                                err.response?.data?.message ||
                                `Unable to ${nextStatus.toLowerCase()} this account.`
                            );
                            }
                        }}
                        title={
                            item._id === user?.id && item.status === "Active"
                            ? "You cannot deactivate your own account"
                            : `${item.status === "Active" ? "Deactivate" : "Activate"} user`
                        }
                        >
                        <i
                            className={`bi ${
                            item.status === "Active"
                                ? "bi-person-x"
                                : "bi-person-check"
                            } me-1`}
                            aria-hidden="true"
                        />
                        {item.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                    </div>
                    </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer bg-white d-flex justify-content-between align-items-center gap-2">
          <small className="text-secondary">
            Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
          </small>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              disabled={
                loading ||
                pagination.totalPages === 0 ||
                page >= pagination.totalPages
              }
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
