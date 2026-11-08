import { useEffect, useState } from "react";
import api from "./services/api";

function TeacherAssignmentManagement({ user, onBack, canManage }) {
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);

  const [formData, setFormData] = useState({
    teacherId: "",
    subjectId: "",
    academicYearId: "",
    sectionId: "",
  });

    useEffect(() => {
      const loadData = async () => {
        try {
            setLoading(true);
            setError("");

            const requests = [
            api.get("/teacher-assignments"),
            api.get("/subjects", { params: { status: "Active" } }),
            api.get("/sections", {
                params: { status: "Active", limit: 100 },
            }),
            api.get("/academic-years", {
                params: { status: "Active", limit: 100 },
            }),
            ];

            // Only Administrators and Principals can load the teacher list.
            if (canManage) {
            requests.push(api.get("/users/teachers"));
            }

            const responses = await Promise.all(requests);

            setAssignments(responses[0].data.data || []);
            setSubjects(responses[1].data.data || []);
            setSections(responses[2].data.data || []);
            setAcademicYears(responses[3].data.data || []);

            if (canManage) {
            setTeachers(responses[4].data.data || []);
            }
        } catch (err) {
            setError(
            err.response?.data?.message ||
                "Unable to load teacher assignment data."
            );
        } finally {
            setLoading(false);
        }
      };

        loadData();
            }, [canManage]);
        
        const handleEdit = (assignment) => {
            setError("");
            setSuccess("");

            setEditingAssignmentId(assignment._id);

            setFormData({
                teacherId: assignment.teacherId?._id || "",
                subjectId: assignment.subjectId?._id || "",
                academicYearId: assignment.academicYearId?._id || "",
                sectionId: assignment.sectionId?._id || "",
            });

            setShowForm(true);
        };

        const handleSubmit = async () => {
            try {
                setError("");
                setSuccess("");

                const response = editingAssignmentId
                ? await api.put(
                    `/teacher-assignments/${editingAssignmentId}`,
                    formData
                    )
                : await api.post("/teacher-assignments", formData);

                setSuccess(
                response.data.message || "Teacher assignment created successfully."
                );

                // Refresh the assignment list.
                const assignmentsResponse = await api.get("/teacher-assignments");

                setAssignments(assignmentsResponse.data.data || []);

                // Reset the form.
                setFormData({
                teacherId: "",
                subjectId: "",
                academicYearId: "",
                sectionId: "",
                });

                setEditingAssignmentId(null);
                setShowForm(false);
            } catch (err) {
                setError(
                err.response?.data?.message ||
                    "Unable to create teacher assignment."
                );
            }
        };

        const handleStatusChange = async (assignmentId, currentStatus) => {
            try {
                setError("");
                setSuccess("");

                const newStatus =
                currentStatus === "Active" ? "Inactive" : "Active";

                const response = await api.patch(
                `/teacher-assignments/${assignmentId}/status`,
                { status: newStatus }
                );

                setSuccess(
                response.data.message || "Assignment status updated successfully."
                );

                const assignmentsResponse = await api.get("/teacher-assignments");
                setAssignments(assignmentsResponse.data.data || []);
            } catch (err) {
                setError(
                err.response?.data?.message ||
                    "Unable to update assignment status."
                );
            }
        };

        return (
            <div className="container-fluid">
            <h2 className="mb-4">Teacher Assignment Management</h2>
            {canManage && (
                <div className="mb-3">
                    <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                        setShowForm((previous) => !previous);
                        setEditingAssignmentId(null);
                        setFormData({
                            teacherId: "",
                            subjectId: "",
                            academicYearId: "",
                            sectionId: "",
                        });
                        setError("");
                        setSuccess("");
                    }}
                    >
                    {showForm ? "Cancel" : "Assign Teacher"}
                    </button>
                </div>
            )}

        {success && (
        <div className="alert alert-success">
            {success}
        </div>
        )}

        {error && (
            <div className="alert alert-danger">{error}</div>
        )}
        

        {showForm && canManage && (
            <div className="card shadow-sm mb-4">
                <div className="card-header">
                    <h5 className="mb-0">
                        {editingAssignmentId
                            ? "Edit Teacher Assignment"
                            : "Assign Teacher to Subject"}
                    </h5>
                </div>

                <div className="card-body">
                <div className="row g-3">

                    <div className="col-md-6">
                    <label className="form-label">Teacher</label>
                    <select
                        className="form-select"
                        value={formData.teacherId}
                        onChange={(e) =>
                        setFormData({
                            ...formData,
                            teacherId: e.target.value,
                        })
                        }
                    >
                        <option value="">Select Teacher</option>
                        {teachers.map((teacher) => (
                        <option key={teacher._id} value={teacher._id}>
                            {teacher.name} ({teacher.email})
                        </option>
                        ))}
                    </select>
                    </div>

                    <div className="col-md-6">
                    <label className="form-label">Subject</label>
                    <select
                        className="form-select"
                        value={formData.subjectId}
                        onChange={(e) =>
                        setFormData({
                            ...formData,
                            subjectId: e.target.value,
                        })
                        }
                    >
                        <option value="">Select Subject</option>
                        {subjects.map((subject) => (
                        <option key={subject._id} value={subject._id}>
                            {subject.name}
                        </option>
                        ))}
                    </select>
                    </div>

                    <div className="col-md-6">
                    <label className="form-label">Academic Year</label>
                    <select
                        className="form-select"
                        value={formData.academicYearId}
                        onChange={(e) =>
                        setFormData({
                            ...formData,
                            academicYearId: e.target.value,
                        })
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

                    <div className="col-md-6">
                    <label className="form-label">Section</label>
                    <select
                        className="form-select"
                        value={formData.sectionId}
                        onChange={(e) =>
                        setFormData({
                            ...formData,
                            sectionId: e.target.value,
                        })
                        }
                    >
                        <option value="">Select Section</option>
                        {sections.map((section) => (
                        <option key={section._id} value={section._id}>
                            {section.classId?.name} - {section.name}
                        </option>
                        ))}
                    </select>
                    </div>

                </div>

                <div className="mt-4">
                    <button
                        type="button"
                        className="btn btn-success"
                        onClick={handleSubmit}
                        disabled={
                            !formData.teacherId ||
                            !formData.subjectId ||
                            !formData.academicYearId ||
                            !formData.sectionId
                        }
                    >
                        {editingAssignmentId ? "Update Assignment" : "Save Assignment"}
                    </button>
                </div>

                </div>
            </div>
            )}
            
      {loading ? (
        <p>Loading assignments...</p>
        ) : assignments.length === 0 ? (
        <div className="alert alert-info">
            No teacher assignments found.
        </div>
        ) : (
        <div className="card shadow-sm">
            <div className="card-header">
            <h5 className="mb-0">Teacher Assignments</h5>
            </div>

            <div className="card-body">
            <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle">
                <thead className="table-light">
                    <tr>
                    <th>Teacher</th>
                    <th>Subject</th>
                    <th>Academic Year</th>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Status</th>
                    <th>Actions</th>
                    </tr>
                </thead>

                <tbody>
                    {assignments.map((assignment) => (
                    <tr key={assignment._id}>
                        <td>{assignment.teacherId?.name || "N/A"}</td>
                        <td>{assignment.subjectId?.name || "N/A"}</td>
                        <td>{assignment.academicYearId?.name || "N/A"}</td>
                        <td>
                        {assignment.sectionId?.classId?.name || "N/A"}
                        </td>
                        <td>{assignment.sectionId?.name || "N/A"}</td>
                        <td>
                        <span
                            className={`badge ${
                            assignment.status === "Active"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                        >
                            {assignment.status}
                        </span>
                        </td>
                        <td>
                        {canManage && (
                            <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => handleEdit(assignment)}
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                className={`btn btn-sm ${
                                assignment.status === "Active"
                                    ? "btn-danger"
                                    : "btn-success"
                                }`}
                                onClick={() =>
                                handleStatusChange(assignment._id, assignment.status)
                                }
                            >
                                {assignment.status === "Active" ? "Deactivate" : "Activate"}
                            </button>
                            </div>
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

export default TeacherAssignmentManagement;