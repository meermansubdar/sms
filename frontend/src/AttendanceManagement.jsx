
import { useEffect, useState } from "react";
import api from "./services/api";

export default function AttendanceManagement({ user, onBack }) {
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );

  const [attendance, setAttendance] = useState({});
  const [remarks, setRemarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const canManage = ["Administrator", "Principal"].includes(user?.role);

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setError("");

      try {
        const [yearResponse, classResponse] = await Promise.all([
          api.get("/academic-years"),
          api.get("/classes"),
        ]);

        const years = yearResponse.data.data || [];
        const classList = classResponse.data.data || [];

        setAcademicYears(years);
        setClasses(classList);

        const activeYear = years.find(
          (item) => item.status === "Active"
        );

        if (activeYear) {
          setAcademicYearId(activeYear._id);
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load academic years and classes."
        );
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadSections() {
      setSections([]);
      setSectionId("");
      setStudents([]);
      setAttendance({});
      setRemarks({});

      if (!classId) return;

      try {
        const response = await api.get("/sections", {
          params: { classId, status: "Active", limit: 100 },
        });

        setSections(response.data.data || []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load sections."
        );
      }
    }

    loadSections();
  }, [classId]);

  async function loadStudents() {
    if (!academicYearId || !classId || !sectionId || !date) {
      setError("Select an academic year, class, section, and date.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setStudents([]);
    setAttendance({});
    setRemarks({});

    try {
      const response = await api.get("/enrollments", {
        params: {
          academicYearId,
          classId,
          sectionId,
          status: "Active",
          limit: 100,
        },
      });

      const enrollments = response.data.data || [];
      const studentRows = enrollments.map((enrollment) => ({
        enrollmentId: enrollment._id,
        studentId: enrollment.studentId?._id,
        studentName: [
          enrollment.studentId?.firstName,
          enrollment.studentId?.lastName,
        ]
          .filter(Boolean)
          .join(" "),
        rollNumber: enrollment.rollNumber,
      }));

      setStudents(studentRows);

      const initialAttendance = {};
      const initialRemarks = {};

      studentRows.forEach((student) => {
        initialAttendance[student.enrollmentId] = "Present";
        initialRemarks[student.enrollmentId] = "";
      });

      setAttendance(initialAttendance);
      setRemarks(initialRemarks);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load enrolled students."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveAttendance() {
    if (!students.length) {
      setError("Load the enrolled students before saving attendance.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const year = academicYears.find(
        (item) => item._id === academicYearId
      );

      const selectedClass = classes.find(
        (item) => item._id === classId
      );

      const selectedSection = sections.find(
        (item) => item._id === sectionId
      );

      const existingResponse = await api.get("/attendance", {
        params: {
          date,
          academicYearId,
          classId,
          sectionId,
          limit: 100,
        },
      });

      const existingRecords = existingResponse.data.data || [];
      const existingByEnrollment = new Map(
        existingRecords.map((record) => [
          record.enrollmentId?._id || record.enrollmentId,
          record,
        ])
      );

      for (const student of students) {
        const existing = existingByEnrollment.get(student.enrollmentId);

        const payload = {
          status: attendance[student.enrollmentId] || "Present",
          remarks: remarks[student.enrollmentId] || "",
        };

        if (existing) {
          await api.patch(`/attendance/${existing._id}`, payload);
        } else {
          await api.post("/attendance", {
            studentId: student.studentId,
            enrollmentId: student.enrollmentId,
            academicYearId,
            classId,
            sectionId,
            date,
            ...payload,
          });
        }
      }

      setMessage("Attendance saved successfully.");
      setLoading(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save all attendance records. Reload the list and verify saved records before retrying."
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadExistingAttendance() {
    if (!date || !academicYearId || !classId || !sectionId) return;

    try {
      const response = await api.get("/attendance", {
        params: {
          date,
          academicYearId,
          classId,
          sectionId,
          limit: 100,
        },
      });

      const records = response.data.data || [];
      const nextAttendance = {};
      const nextRemarks = {};

      records.forEach((record) => {
        const enrollmentId =
          record.enrollmentId?._id || record.enrollmentId;

        nextAttendance[enrollmentId] = record.status;
        nextRemarks[enrollmentId] = record.remarks || "";
      });

      setAttendance((previous) => ({ ...previous, ...nextAttendance }));
      setRemarks((previous) => ({ ...previous, ...nextRemarks }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load existing attendance."
      );
    }
  }

  async function loadDailyReport() {
    if (!academicYearId || !classId || !sectionId || !date) {
      setReportError(
        "Select an academic year, class, section, and date."
      );
      return;
    }

    setReportLoading(true);
    setReportError("");
    setReport(null);

    try {
      const response = await api.get("/attendance/daily-report", {
        params: {
          date,
          academicYearId,
          classId,
          sectionId,
        },
      });

      setReport(response.data.data);
    } catch (err) {
      setReportError(
        err.response?.data?.message ||
          "Unable to load the daily attendance report."
      );
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    if (students.length) {
      loadExistingAttendance();
    }
  }, [students.length, date, academicYearId, classId, sectionId]);

  return (
    <main className="container-fluid px-3 px-md-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="mb-1">Attendance Management</h2>
          <p className="text-secondary mb-0">
            Mark and maintain daily student attendance.
          </p>
        </div>

        {onBack && (
          <button className="btn btn-outline-secondary" onClick={onBack}>
            Back to Students
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="alert alert-success" role="status">
          {message}
        </div>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label">Academic Year</label>
              <select
                className="form-select"
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
              >
                <option value="">Select academic year</option>
                {academicYears.map((year) => (
                  <option key={year._id} value={year._id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label">Class</label>
              <select
                className="form-select"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">Select class</option>
                {classes.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-2">
              <label className="form-label">Section</label>
              <select
                className="form-select"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={!classId}
              >
                <option value="">Select section</option>
                {sections.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-6 col-lg-2">
              <label className="form-label">Attendance Date</label>
              <input
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="col-12 col-lg-2">
              <button
                className="btn btn-primary w-100"
                onClick={loadStudents}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load Students"}
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={loadDailyReport}
                disabled={reportLoading}
              >
                {reportLoading ? "Generating..." : "Generate Daily Report"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0">Student Attendance</h5>
          <small className="text-secondary">
            {students.length} student(s) loaded
          </small>
        </div>

        <div className="card-body">
          {!students.length ? (
            <p className="text-secondary mb-0">
              Select the filters above and click Load Students.
            </p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Roll No.</th>
                      <th>Student Name</th>
                      <th style={{ minWidth: 150 }}>Attendance Status</th>
                      <th style={{ minWidth: 220 }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.enrollmentId}>
                        <td>{student.rollNumber}</td>
                        <td>{student.studentName || "Unnamed student"}</td>
                        <td>
                          <select
                            className="form-select"
                            value={
                              attendance[student.enrollmentId] || "Present"
                            }
                            onChange={(e) =>
                              setAttendance((previous) => ({
                                ...previous,
                                [student.enrollmentId]: e.target.value,
                              }))
                            }
                            disabled={!canManage}
                          >
                            {["Present", "Absent", "Late", "Excused"].map(
                              (status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              )
                            )}
                          </select>
                        </td>
                        <td>
                          <input
                            className="form-control"
                            value={remarks[student.enrollmentId] || ""}
                            maxLength={500}
                            onChange={(e) =>
                              setRemarks((previous) => ({
                                ...previous,
                                [student.enrollmentId]: e.target.value,
                              }))
                            }
                            placeholder="Optional remarks"
                            disabled={!canManage}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {canManage ? (
                <button
                  className="btn btn-success"
                  onClick={saveAttendance}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              ) : (
                <div className="alert alert-info mb-0">
                  You have view-only access to attendance records.
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Daily Attendance Report */}
      {reportError && (
        <div className="alert alert-danger mt-3">
          {reportError}
        </div>
      )}

      {report && (
        <div className="card mt-4">
          <div className="card-header">
            <h5 className="mb-0">Daily Attendance Report</h5>
          </div>

          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <strong>Total Students</strong>
                <h4>{report.totalStudents}</h4>
              </div>

              <div className="col-md-3">
                <strong>Present</strong>
                <h4 className="text-success">{report.present}</h4>
              </div>

              <div className="col-md-3">
                <strong>Absent</strong>
                <h4 className="text-danger">{report.absent}</h4>
              </div>

              <div className="col-md-3">
                <strong>Late</strong>
                <h4 className="text-warning">{report.late}</h4>
              </div>

              <div className="col-md-3">
                <strong>Excused</strong>
                <h4>{report.excused}</h4>
              </div>

              <div className="col-md-3">
                <strong>Marked</strong>
                <h4>{report.marked}</h4>
              </div>

              <div className="col-md-3">
                <strong>Not Marked</strong>
                <h4>{report.notMarked}</h4>
              </div>

              <div className="col-md-3">
                <strong>Attendance Percentage</strong>
                <h4 className="text-primary">
                  {report.attendancePercentage}%
                </h4>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
