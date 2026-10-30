
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "./services/api";

export default function StudentProfile() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [enrollments, setEnrollments] = useState([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [enrollmentError, setEnrollmentError] = useState("");

  const currentEnrollment = enrollments.find(
    (enrollment) => enrollment.status === "Active"
  );

    const previousEnrollments = enrollments.filter(
    (enrollment) => enrollment.status !== "Active"
  );

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(`/students/${studentId}`);
        setStudent(response.data.data);

        try {
            setEnrollmentLoading(true);
            setEnrollmentError("");

            const enrollmentResponse = await api.get("/enrollments", {
                params: {
                studentId,
                limit: 100,
                },
            });

            setEnrollments(enrollmentResponse.data.data || []);
            } catch (err) {
            setEnrollmentError(
                err.response?.data?.message ||
                "Unable to load enrollment history."
            );
            } finally {
            setEnrollmentLoading(false);
            }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load student profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadStudent();
  }, [studentId]);

  if (loading) {
    return <div className="container py-5">Loading student profile...</div>;
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/")}
        >
          Back to Students
        </button>
      </div>
    );
  }

  if (!student) return null;

  return (
    <main className="container py-4">
      <button
        className="btn btn-outline-secondary mb-4"
        onClick={() => navigate("/")}
      >
        <i className="bi bi-arrow-left me-2"></i>
        Back to Students
      </button>

      <h2>Student Profile</h2>
      <div className="card shadow-sm mt-3">
        <div className="card-body">
          <h4>
            {student.firstName} {student.lastName}
          </h4>
          <p className="mb-1">
            Admission Number: {student.admissionNumber}
          </p>
          <p className="mb-1">
            Email: {student.email || "—"}
          </p>
          <p className="mb-1">
            Phone: {student.phone || "—"}
          </p>
          <p className="mb-0">
            Status: {student.status}
          </p>
        </div>
      </div>

      {enrollmentLoading ? (
        <div className="alert alert-info mt-3">
            Loading current enrollment...
        </div>
        ) : enrollmentError ? (
        <div className="alert alert-warning mt-3">
            Unable to load current enrollment.
        </div>
        ) : currentEnrollment ? (
        <section className="card border-primary shadow-sm mt-3">
            <div className="card-header bg-primary text-white">
            <h3 className="h5 mb-0">Current Enrollment</h3>
            </div>

            <div className="card-body">
            <div className="row g-3">
                <div className="col-12 col-md-3">
                <small className="text-secondary">Academic Year</small>
                <div className="fw-semibold">
                    {currentEnrollment.academicYearId?.name || "—"}
                </div>
                </div>

                <div className="col-12 col-md-3">
                <small className="text-secondary">Class</small>
                <div className="fw-semibold">
                    {currentEnrollment.classId?.name || "—"}
                </div>
                </div>

                <div className="col-12 col-md-3">
                <small className="text-secondary">Section</small>
                <div className="fw-semibold">
                    {currentEnrollment.sectionId?.name || "—"}
                </div>
                </div>

                <div className="col-12 col-md-3">
                <small className="text-secondary">Roll Number</small>
                <div className="fw-semibold">
                    {currentEnrollment.rollNumber || "—"}
                </div>
                </div>

                <div className="col-12">
                <span className="badge text-bg-success">Currently Active</span>
                </div>
            </div>
            </div>
        </section>
        ) : (
        <div className="alert alert-warning mt-3">
            No active enrollment found for this student.
        </div>
        )}

        <section className="card shadow-sm mt-4">
            <div className="card-header bg-white py-3">
            <h3 className="h5 mb-0">Enrollment History</h3>
            </div>

            <div className="card-body">
            {enrollmentLoading ? (
                <p>Loading enrollment history...</p>
            ) : enrollmentError ? (
                <div className="alert alert-warning mb-0">
                {enrollmentError}
                </div>
            ) : previousEnrollments.length === 0 ? (
            <p className="text-secondary mb-0">
                No previous enrollment records found.
            </p>
            ) : (
                <div className="table-responsive">
                <table className="table table-hover align-middle">
                    <thead className="table-light">
                    <tr>
                        <th>Academic Year</th>
                        <th>Class</th>
                        <th>Section</th>
                        <th>Roll Number</th>
                        <th>Enrollment Date</th>
                        <th>Status</th>
                    </tr>
                    </thead>

                    <tbody>
                    {previousEnrollments.map((enrollment) => (
                        <tr key={enrollment._id}>
                        <td>
                            {enrollment.academicYearId?.name || "—"}
                        </td>
                        <td>
                            {enrollment.classId?.name || "—"}
                        </td>
                        <td>
                            {enrollment.sectionId?.name || "—"}
                        </td>
                        <td>{enrollment.rollNumber || "—"}</td>
                        <td>
                            {enrollment.enrollmentDate
                            ? new Date(
                                enrollment.enrollmentDate
                                ).toLocaleDateString()
                            : "—"}
                        </td>
                        <td>
                            <span
                            className={`badge ${
                                enrollment.status === "Active"
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                            >
                            {enrollment.status}
                            </span>
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
  );
}
