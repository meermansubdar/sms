import { useEffect, useState } from "react";
import api from "./services/api";

export default function HomeworkManagement({
  user,
  onBack,
  canManage,
}) {
  const [homeworkEntries, setHomeworkEntries] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [loadingHomework, setLoadingHomework] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingHomeworkId, setEditingHomeworkId] = useState(null);

  const [formData, setFormData] = useState({
    academicYearId: "",
    sectionId: "",
    subjectId: "",
    teacherId: "",
    title: "",
    description: "",
    assignedDate: "",
    dueDate: "",
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingHomework(true);
        setError("");

        const requests = [
          api.get("/homework"),
        ];

        // Load assignments only for users who can create or edit Homework.
        if (
          user.role === "Administrator" ||
          user.role === "Principal" ||
          user.role === "Teacher"
        ) {
          requests.push(
            api.get("/teacher-assignments", {
              params: { status: "Active" },
            })
          );
        }

        const responses = await Promise.all(requests);

        setHomeworkEntries(responses[0].data.data || []);

        if (requests.length > 1) {
          setAssignments(responses[1].data.data || []);
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load Homework data."
        );
      } finally {
        setLoadingHomework(false);
      }
    };

    loadData();
  }, [user.role]);

  const handleEdit = (entry) => {
    setError("");
    setSuccessMessage("");

    setFormData({
      academicYearId: entry.academicYearId?._id || "",
      sectionId: entry.sectionId?._id || "",
      subjectId: entry.subjectId?._id || "",
      teacherId: entry.teacherId?._id || "",
      title: entry.title || "",
      description: entry.description || "",
      assignedDate: String(entry.assignedDate || "").slice(0, 10),
      dueDate: String(entry.dueDate || "").slice(0, 10),
    });

    setEditingHomeworkId(entry._id);
    setShowForm(true);
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${entry.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");

      const response = await api.delete(
        `/homework/${entry._id}`
      );

      setSuccessMessage(
        response.data.message ||
          "Homework deactivated successfully."
      );

      const homeworkResponse = await api.get("/homework");

      setHomeworkEntries(homeworkResponse.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to deactivate Homework."
      );
    }
  };

  const handleStatusChange = async (entry) => {
    const newStatus =
      entry.status === "Active" ? "Inactive" : "Active";

    try {
      setError("");
      setSuccessMessage("");

      const response = await api.patch(
        `/homework/${entry._id}/status`,
        { status: newStatus }
      );

      setSuccessMessage(
        response.data.message ||
          `Homework marked ${newStatus} successfully.`
      );

      const homeworkResponse = await api.get("/homework");

      setHomeworkEntries(homeworkResponse.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update Homework status."
      );
    }
  };

  const handleSubmit = async () => {
    try {
      setError("");
      setSuccessMessage("");

      const payload = {
        academicYearId: formData.academicYearId,
        sectionId: formData.sectionId,
        subjectId: formData.subjectId,
        teacherId: formData.teacherId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        assignedDate: formData.assignedDate,
        dueDate: formData.dueDate,
      };

      const response = editingHomeworkId
        ? await api.put(
            `/homework/${editingHomeworkId}`,
            payload
          )
        : await api.post("/homework", payload);

      setSuccessMessage(
        response.data.message ||
          "Homework saved successfully."
      );

      const homeworkResponse = await api.get("/homework");

      setHomeworkEntries(homeworkResponse.data.data || []);

      setFormData({
        academicYearId: "",
        sectionId: "",
        subjectId: "",
        teacherId: "",
        title: "",
        description: "",
        assignedDate: "",
        dueDate: "",
      });

      setEditingHomeworkId(null);
      setShowForm(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save Homework."
      );
    }
  };

  return (
    <div className="container-fluid px-3 px-md-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">Homework Management</h3>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
        >
          Back
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        {showForm && (
            <div className="card shadow-sm mb-4">
            <div className="card-header">
                <h5 className="mb-0">
                {editingHomeworkId ? "Edit Homework" : "Add Homework"}
                </h5>
            </div>

            <div className="card-body">
                <div className="row g-3">

                    <div className="col-md-12">
                        <label className="form-label">
                        Teacher Assignment
                        </label>

                        <select
                        className="form-select"
                        value={formData.teacherId && formData.sectionId && formData.subjectId && formData.academicYearId
                            ? assignments.find(
                                (assignment) =>
                                assignment.teacherId?._id === formData.teacherId &&
                                assignment.sectionId?._id === formData.sectionId &&
                                assignment.subjectId?._id === formData.subjectId &&
                                assignment.academicYearId?._id === formData.academicYearId
                            )?._id || ""
                            : ""}
                        onChange={(e) => {
                            const selectedAssignment = assignments.find(
                            (assignment) => assignment._id === e.target.value
                            );

                            if (selectedAssignment) {
                            setFormData((previous) => ({
                                ...previous,
                                teacherId: selectedAssignment.teacherId?._id || "",
                                academicYearId: selectedAssignment.academicYearId?._id || "",
                                sectionId: selectedAssignment.sectionId?._id || "",
                                subjectId: selectedAssignment.subjectId?._id || "",
                            }));
                            }
                        }}
                        required
                        >
                        <option value="">Select Teacher Assignment</option>

                        {assignments.map((assignment) => (
                            <option
                            key={assignment._id}
                            value={assignment._id}
                            >
                            {assignment.teacherId?.name} |{" "}
                            {assignment.subjectId?.name} |{" "}
                            {assignment.sectionId?.classId?.name} -{" "}
                            {assignment.sectionId?.name} |{" "}
                            {assignment.academicYearId?.name}
                            </option>
                        ))}
                        </select>

                        {assignments.length === 0 && (
                        <div className="form-text text-danger">
                            No active Teacher Assignments are available.
                        </div>
                        )}

                        <div className="col-md-6">
                            <label className="form-label">
                            Homework Title
                            </label>

                            <input
                            type="text"
                            className="form-control"
                            value={formData.title}
                            onChange={(e) =>
                                setFormData((previous) => ({
                                ...previous,
                                title: e.target.value,
                                }))
                            }
                            maxLength={150}
                            placeholder="Enter Homework title"
                            required
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label">
                            Description
                            </label>

                            <textarea
                            className="form-control"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData((previous) => ({
                                ...previous,
                                description: e.target.value,
                                }))
                            }
                            maxLength={2000}
                            rows={3}
                            placeholder="Enter Homework instructions"
                            required
                            />
                        </div>

                    </div>

                    <div className="col-md-6">
                        <label className="form-label">
                        Assigned Date
                        </label>

                        <input
                        type="date"
                        className="form-control"
                        value={formData.assignedDate}
                        onChange={(e) =>
                            setFormData((previous) => ({
                            ...previous,
                            assignedDate: e.target.value,
                            }))
                        }
                        required
                        />
                    </div>

                    <div className="col-md-6">
                        <label className="form-label">
                        Due Date
                        </label>

                        <input
                        type="date"
                        className="form-control"
                        value={formData.dueDate}
                        min={formData.assignedDate || undefined}
                        onChange={(e) =>
                            setFormData((previous) => ({
                            ...previous,
                            dueDate: e.target.value,
                            }))
                        }
                        required
                        />
                    </div>

                </div>

                <div className="mt-4 d-flex gap-2">
                <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleSubmit}
                    disabled={
                    !formData.academicYearId ||
                    !formData.sectionId ||
                    !formData.subjectId ||
                    !formData.teacherId ||
                    !formData.title.trim() ||
                    !formData.description.trim() ||
                    !formData.assignedDate ||
                    !formData.dueDate ||
                    formData.dueDate < formData.assignedDate
                    }
                >
                    {editingHomeworkId ? "Update Homework" : "Save Homework"}
                </button>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                    setShowForm(false);
                    setEditingHomeworkId(null);
                    setError("");
                    setSuccessMessage("");
                    }}
                >
                    Cancel
                </button>
                </div>
            </div>
            </div>
        )}
        <h5 className="mb-0">Homework Records</h5>

        {!showForm && canManage && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowForm(true);
              setEditingHomeworkId(null);
              setError("");
              setSuccessMessage("");
            }}
          >
            Add Homework
          </button>
        )}
      </div>

      {loadingHomework ? (
        <div className="alert alert-info">
          Loading Homework records...
        </div>
      ) : homeworkEntries.length === 0 ? (
        <div className="alert alert-info">
          No Homework records found.
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-header">
            <h5 className="mb-0">Homework Records</h5>
          </div>

          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Academic Year</th>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Subject</th>
                    <th>Homework Title</th>
                    <th>Assigned Date</th>
                    <th>Due Date</th>
                    <th>Teacher</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {homeworkEntries.map((entry) => (
                    <tr key={entry._id}>
                      <td>{entry.academicYearId?.name || "N/A"}</td>
                      <td>
                        {entry.sectionId?.classId?.name || "N/A"}
                      </td>
                      <td>{entry.sectionId?.name || "N/A"}</td>
                      <td>{entry.subjectId?.name || "N/A"}</td>
                      <td>
                        <strong>{entry.title}</strong>
                        <div className="small text-muted">
                          {entry.description}
                        </div>
                      </td>
                      <td>
                        {entry.assignedDate
                          ? new Date(entry.assignedDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td>
                        {entry.dueDate
                          ? new Date(entry.dueDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td>{entry.teacherId?.name || "N/A"}</td>
                      <td>
                        <span
                          className={`badge ${
                            entry.status === "Active"
                              ? "bg-success"
                              : "bg-secondary"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                        <td>
                        {canManage && (
                          user.role === "Administrator" ||
                          user.role === "Principal" ||
                          (
                            user.role === "Teacher" &&
                            entry.teacherId?._id === user.id
                          )
                        ) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={() => handleEdit(entry)}
                          >
                            Edit
                          </button>
                        )}

                        {canManage && (
                          user.role === "Administrator" ||
                          user.role === "Principal" ||
                          (
                            user.role === "Teacher" &&
                            entry.teacherId?._id === user.id
                          )
                        ) && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger me-2"
                            onClick={() => handleDelete(entry)}
                          >
                            Deactivate
                          </button>
                        )}

                        {(user.role === "Administrator" ||
                          user.role === "Principal") && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleStatusChange(entry)}
                          >
                            {entry.status === "Active"
                              ? "Mark Inactive"
                              : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}