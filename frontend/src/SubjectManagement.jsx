
import { useEffect, useState } from "react";
import api from "./services/api";

function SubjectManagement({ user, onBack, canManage }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });

  const fetchSubjects = async () => {
    try {
        setLoading(true);
        setError("");

        const params = {};

        if (search.trim()) {
        params.search = search.trim();
        }

        if (statusFilter !== "All") {
        params.status = statusFilter;
        }

        const response = await api.get("/subjects", { params });

        setSubjects(response.data.data || []);
    } catch (err) {
        setError(
        err.response?.data?.message || "Failed to load subjects."
        );
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
      fetchSubjects();
  }, [search, statusFilter]);

    const handleSaveSubject = async () => {
        try {
            setError("");
            setSuccess("");

            if (!formData.name.trim() || !formData.code.trim()) {
            setError("Subject Name and Subject Code are required.");
            return;
            }

            await api.post("/subjects", {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim(),
            });

            setSuccess("Subject added successfully.");

            setFormData({
            name: "",
            code: "",
            description: "",
            });

            setShowForm(false);

            await fetchSubjects();
        } catch (err) {
            setError(
            err.response?.data?.message || "Failed to save subject."
            );
        }
    };

    const handleEditSubject = (subject) => {
        setEditingSubject(subject);

        setFormData({
            name: subject.name,
            code: subject.code,
            description: subject.description || "",
        });

        setShowForm(true);
        setError("");
        setSuccess("");
    };

    const handleUpdateSubject = async () => {
    try {
        setError("");
        setSuccess("");

        if (!formData.name.trim() || !formData.code.trim()) {
            setError("Subject Name and Subject Code are required.");
            return;
        }

        await api.patch(`/subjects/${editingSubject._id}`, {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim(),
        });

        setSuccess("Subject updated successfully.");

        setEditingSubject(null);

        setFormData({
            name: "",
            code: "",
            description: "",
        });

        setShowForm(false);

        await fetchSubjects();
    } catch (err) {
        setError(
            err.response?.data?.message || "Failed to update subject."
        );
    }
    };

    const handleToggleStatus = async (subject) => {
        const newStatus =
            subject.status === "Active" ? "Inactive" : "Active";

        const action =
            newStatus === "Active" ? "activate" : "deactivate";

        if (!window.confirm(`Are you sure you want to ${action} this subject?`)) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await api.patch(`/subjects/${subject._id}/status`, {
                status: newStatus,
            });

            setSuccess(`Subject ${action}d successfully.`);

            await fetchSubjects();
        } catch (err) {
            setError(
                err.response?.data?.message || "Failed to update subject status."
            );
        }
    };

    return (
        <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2>Subject Management</h2>
                    <p className="text-muted mb-0">
                    Manage school subjects.
                    </p>
                </div>

                    {canManage && (
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                            setEditingSubject(null);
                            setFormData({
                                name: "",
                                code: "",
                                description: "",
                            });
                            setShowForm(true);
                            }}
                        >
                            <i className="bi bi-plus-circle me-2"></i>
                            Add Subject
                        </button>
                    )}
            </div>

            {error && (
            <div className="alert alert-danger">
                {error}
            </div>
            )}

            {success && (
            <div className="alert alert-success">
                {success}
            </div>
            )}

            {showForm && (
                    <div className="card shadow-sm mb-4">
                        <div className="card-header">
                            <h5 className="mb-0">
                                {editingSubject ? "Edit Subject" : "Add New Subject"}
                            </h5>
                        </div>

                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label">
                                    Subject Name <span className="text-danger">*</span>
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter subject name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                        ...formData,
                                        name: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">
                                    Subject Code <span className="text-danger">*</span>
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter subject code (e.g. MATH)"
                                    value={formData.code}
                                    onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        code: e.target.value.toUpperCase(),
                                    })
                                  }
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">
                                    Description
                                </label>

                                <textarea
                                    className="form-control"
                                    rows="3"
                                    placeholder="Enter subject description (optional)"
                                    maxLength={500}
                                    value={formData.description}
                                    onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        description: e.target.value,
                                    })
                                    }
                                />

                                <small className="text-muted">
                                    Maximum 500 characters.
                                </small>
                            </div>

                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={editingSubject ? handleUpdateSubject : handleSaveSubject}
                                >
                                    <i className="bi bi-save me-2"></i>
                                    Save Subject
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancel
                                </button>
                            </div>

                        </div>
                    </div>
                )}

            <div className="card shadow-sm">
                <div className="card-body">
                    <div className="row g-3 mb-3">
                        <div className="col-md-6">
                            <input
                            type="text"
                            className="form-control"
                            placeholder="Search by subject name or code..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="col-md-3">
                            <select
                            className="form-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="text-muted mt-2">Loading subjects...</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                    <th>#</th>
                                    <th>Subject Name</th>
                                    <th>Subject Code</th>
                                    <th>Description</th>
                                    <th>Status</th>
                                    <th>Created On</th>
                                    <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {subjects.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4 text-muted">
                                        No subjects found.
                                        </td>
                                    </tr>
                                    ) : (
                                        subjects.map((subject, index) => (
                                            <tr key={subject._id}>
                                                <td>{index + 1}</td>
                                                <td className="fw-semibold">{subject.name}</td>
                                                <td>{subject.code}</td>
                                                <td>{subject.description || "-"}</td>
                                                <td>
                                                    <span
                                                    className={`badge ${
                                                        subject.status === "Active"
                                                        ? "bg-success"
                                                        : "bg-secondary"
                                                    }`}
                                                    >
                                                    {subject.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {subject.createdAt
                                                    ? new Date(subject.createdAt).toLocaleDateString()
                                                    : "-"}
                                                </td>
                                                <td>
                                                    {canManage && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={() => handleEditSubject(subject)}
                                                            >
                                                                <i className="bi bi-pencil-square me-1"></i>
                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={`btn btn-sm ms-2 ${
                                                                    subject.status === "Active"
                                                                        ? "btn-outline-danger"
                                                                        : "btn-outline-success"
                                                                }`}
                                                                onClick={() => handleToggleStatus(subject)}
                                                            >
                                                                {subject.status === "Active" ? "Deactivate" : "Activate"}
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SubjectManagement;
