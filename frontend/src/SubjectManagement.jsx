
import { useEffect, useState } from "react";
import api from "./services/api";

function SubjectManagement() {
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

    return (
        <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2>Subject Management</h2>
                    <p className="text-muted mb-0">
                    Manage school subjects.
                    </p>
                </div>

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
                            Subject form fields will be added here.
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
                                    </tr>
                                </thead>

                                <tbody>
                                    {subjects.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4 text-muted">
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
