
import { useEffect, useMemo, useState } from "react";
import api from "./services/api";

const MANAGE_ROLES = ["Administrator", "Principal"];

function getArray(response) {
  const data = response?.data?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

export default function EnrollmentManagement({ user, onBack }) {
  const canManage = MANAGE_ROLES.includes(user?.role);

  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [transferForm, setTransferForm] = useState({
    newClassId: "",
    newSectionId: "",
    newRollNumber: "",
    transferDate: new Date().toISOString().slice(0, 10),
    remarks: "",
  });

  const [filters, setFilters] = useState({
    academicYearId: "",
    classId: "",
    sectionId: "",
    status: "",
    search: "",
  });

  const [form, setForm] = useState({
    studentId: "",
    academicYearId: "",
    classId: "",
    sectionId: "",
    rollNumber: "",
    enrollmentDate: new Date().toISOString().slice(0, 10),
    remarks: "",
  });

  async function loadReferenceData() {
    const [studentResponse, yearResponse, classResponse, sectionResponse] =
      await Promise.all([
        api.get("/students", { params: { limit: 100 } }),
        api.get("/academic-years", { params: { limit: 100 } }),
        api.get("/classes", { params: { limit: 100 } }),
        api.get("/sections", { params: { limit: 100 } }),
      ]);

    setStudents(getArray(studentResponse).filter((item) => item.status === "Active"));
    setAcademicYears(getArray(yearResponse));
    setClasses(getArray(classResponse));
    setSections(getArray(sectionResponse));
  }

  async function loadEnrollments() {
    const params = { limit: 100 };

    if (filters.academicYearId) params.academicYearId = filters.academicYearId;
    if (filters.classId) params.classId = filters.classId;
    if (filters.sectionId) params.sectionId = filters.sectionId;
    if (filters.status) params.status = filters.status;

    const response = await api.get("/enrollments", { params });
    setEnrollments(getArray(response));
  }

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      await Promise.all([loadReferenceData(), loadEnrollments()]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
    // Load initial page data once when the component opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyFilters(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loadEnrollments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const filterSections = useMemo(() => {
    if (!filters.classId) return sections;

    return sections.filter((section) => {
      const sectionClassId =
        typeof section.classId === "object"
          ? section.classId?._id
          : section.classId;

      return sectionClassId === filters.classId;
    });
  }, [sections, filters.classId]);

  const formSections = useMemo(() => {
    return sections.filter((section) => {
      const sectionClassId =
        typeof section.classId === "object"
          ? section.classId?._id
          : section.classId;

      return sectionClassId === form.classId && section.status === "Active";
    });
  }, [sections, form.classId]);

    const transferSections = useMemo(() => {
        if (!transferForm.newClassId) return [];

        return sections.filter((section) => {
            const sectionClassId =
            typeof section.classId === "object"
                ? section.classId?._id
                : section.classId;

            return (
            sectionClassId === transferForm.newClassId &&
            section.status === "Active"
            );
        });
    }, [sections, transferForm.newClassId]);

  const visibleEnrollments = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    if (!search) return enrollments;

    return enrollments.filter((item) => {
      const student = item.studentId || {};
      const fullName =
        `${student.firstName || ""} ${student.lastName || ""}`.toLowerCase();

      return (
        fullName.includes(search) ||
        (student.admissionNumber || "").toLowerCase().includes(search) ||
        String(item.rollNumber || "").includes(search)
      );
    });
  }, [enrollments, filters.search]);

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === "classId" ? { sectionId: "" } : {}),
    }));
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "classId" ? { sectionId: "" } : {}),
    }));
  }

  async function createEnrollment(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.studentId || !form.academicYearId || !form.classId || !form.sectionId) {
      setError("Please select a student, academic year, class, and section.");
      return;
    }

    const rollNumber = Number(form.rollNumber);

    if (!Number.isInteger(rollNumber) || rollNumber < 1) {
      setError("Roll number must be a whole number greater than zero.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/enrollments", {
        studentId: form.studentId,
        academicYearId: form.academicYearId,
        classId: form.classId,
        sectionId: form.sectionId,
        rollNumber,
        enrollmentDate: form.enrollmentDate,
        remarks: form.remarks.trim(),
      });

      setSuccess("Enrollment created successfully.");
      setShowForm(false);
      setForm({
        studentId: "",
        academicYearId: "",
        classId: "",
        sectionId: "",
        rollNumber: "",
        enrollmentDate: new Date().toISOString().slice(0, 10),
        remarks: "",
      });

      await loadEnrollments();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  
function startTransfer(enrollment) {
  setError("");
  setSuccess("");
  setSelectedEnrollment(enrollment);

  const currentClassId =
    typeof enrollment.classId === "object"
      ? enrollment.classId?._id
      : enrollment.classId;

  setTransferForm({
    newClassId: currentClassId || "",
    newSectionId: "",
    newRollNumber: "",
    transferDate: new Date().toISOString().slice(0, 10),
    remarks: "",
  });
}

function updateTransferForm(field, value) {
  setTransferForm((current) => ({
    ...current,
    [field]: value,
    ...(field === "newClassId" ? { newSectionId: "" } : {}),
  }));
}

async function submitTransfer(event) {
  event.preventDefault();
  setError("");
  setSuccess("");

  if (!selectedEnrollment) {
    setError("Please select an enrollment to transfer.");
    return;
  }

  const newRollNumber = Number(transferForm.newRollNumber);

  if (!Number.isInteger(newRollNumber) || newRollNumber < 1) {
    setError("The new roll number must be a whole number greater than zero.");
    return;
  }

  const currentSectionId =
    typeof selectedEnrollment.sectionId === "object"
      ? selectedEnrollment.sectionId?._id
      : selectedEnrollment.sectionId;

  if (
    transferForm.newClassId === selectedEnrollment.classId?._id &&
    transferForm.newSectionId === currentSectionId
  ) {
    setError("Choose a different class or section for the transfer.");
    return;
  }

  const confirmed = window.confirm(
    `Transfer ${studentName(selectedEnrollment.studentId)} to the selected class and section? The current enrollment will be preserved as transfer history.`
  );

  if (!confirmed) return;

  setSaving(true);

  try {
    await api.patch(
      `/enrollments/${selectedEnrollment._id}/transfer`,
      {
        newClassId: transferForm.newClassId,
        newSectionId: transferForm.newSectionId,
        newRollNumber,
        transferDate: transferForm.transferDate,
        remarks: transferForm.remarks.trim(),
      }
    );

    setSuccess("Student transferred successfully. Previous enrollment history has been preserved.");
    setSelectedEnrollment(null);

    await loadEnrollments();
  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setSaving(false);
  }
}


  function studentName(student) {
    if (!student) return "—";
    return `${student.firstName || ""} ${student.lastName || ""}`.trim() || "—";
  }

  if (loading) {
    return (
      <main className="container py-4">
        <p role="status">Loading enrollment data...</p>
      </main>
    );
  }

  return (
    <main className="container-fluid px-3 px-md-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h2 className="mb-1">Enrollment Management</h2>
          <p className="text-secondary mb-0">
            Assign students to an academic year, class, and section.
          </p>
        </div>

        <div className="d-flex gap-2">
          {onBack && (
            <button className="btn btn-outline-secondary" onClick={onBack}>
              Back
            </button>
          )}

          {canManage && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setError("");
                setSuccess("");
                setShowForm((current) => !current);
              }}
            >
              {showForm ? "Close Form" : "New Enrollment"}
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
        <section className="card shadow-sm mb-4">
          <div className="card-header fw-semibold">Create Enrollment</div>
          <div className="card-body">
            <form onSubmit={createEnrollment}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="enrollmentStudent">
                    Student *
                  </label>
                  <select
                    id="enrollmentStudent"
                    className="form-select"
                    value={form.studentId}
                    onChange={(event) => updateForm("studentId", event.target.value)}
                    required
                  >
                    <option value="">Select student</option>
                    {students.map((student) => (
                      <option key={student._id} value={student._id}>
                        {student.admissionNumber} — {studentName(student)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label" htmlFor="enrollmentYear">
                    Academic Year *
                  </label>
                  <select
                    id="enrollmentYear"
                    className="form-select"
                    value={form.academicYearId}
                    onChange={(event) => updateForm("academicYearId", event.target.value)}
                    required
                  >
                    <option value="">Select academic year</option>
                    {academicYears
                      .filter((year) => year.status === "Active")
                      .map((year) => (
                        <option key={year._id} value={year._id}>
                          {year.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label" htmlFor="enrollmentClass">
                    Class *
                  </label>
                  <select
                    id="enrollmentClass"
                    className="form-select"
                    value={form.classId}
                    onChange={(event) => updateForm("classId", event.target.value)}
                    required
                  >
                    <option value="">Select class</option>
                    {classes
                      .filter((item) => item.status === "Active")
                      .map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label" htmlFor="enrollmentSection">
                    Section *
                  </label>
                  <select
                    id="enrollmentSection"
                    className="form-select"
                    value={form.sectionId}
                    onChange={(event) => updateForm("sectionId", event.target.value)}
                    disabled={!form.classId}
                    required
                  >
                    <option value="">Select section</option>
                    {formSections.map((section) => (
                      <option key={section._id} value={section._id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label" htmlFor="enrollmentRoll">
                    Roll Number *
                  </label>
                  <input
                    id="enrollmentRoll"
                    type="number"
                    min="1"
                    step="1"
                    className="form-control"
                    value={form.rollNumber}
                    onChange={(event) => updateForm("rollNumber", event.target.value)}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label" htmlFor="enrollmentDate">
                    Enrollment Date *
                  </label>
                  <input
                    id="enrollmentDate"
                    type="date"
                    className="form-control"
                    value={form.enrollmentDate}
                    onChange={(event) => updateForm("enrollmentDate", event.target.value)}
                    required
                  />
                </div>

                <div className="col-md-8">
                  <label className="form-label" htmlFor="enrollmentRemarks">
                    Remarks
                  </label>
                  <input
                    id="enrollmentRemarks"
                    type="text"
                    maxLength="500"
                    className="form-control"
                    value={form.remarks}
                    onChange={(event) => updateForm("remarks", event.target.value)}
                    placeholder="Optional remarks"
                  />
                </div>
              </div>

              <div className="mt-4 d-flex gap-2">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Create Enrollment"}
                </button>
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      
        {selectedEnrollment && canManage && (
        <section className="card shadow-sm mb-4">
            <div className="card-header fw-semibold">
            Transfer Student
            </div>

            <div className="card-body">
            <p>
                <strong>Student:</strong>{" "}
                {studentName(selectedEnrollment.studentId)}
                {" · "}
                <strong>Current class:</strong>{" "}
                {selectedEnrollment.classId?.name || "—"}
                {" · "}
                <strong>Section:</strong>{" "}
                {selectedEnrollment.sectionId?.name || "—"}
                {" · "}
                <strong>Roll number:</strong>{" "}
                {selectedEnrollment.rollNumber}
            </p>

            <p className="text-secondary small">
                Academic year: {selectedEnrollment.academicYearId?.name || "—"}
            </p>

            <form onSubmit={submitTransfer}>
                <div className="row g-3">
                <div className="col-md-4">
                    <label className="form-label" htmlFor="transferClass">
                    Destination Class *
                    </label>

                    <select
                    id="transferClass"
                    className="form-select"
                    value={transferForm.newClassId}
                    onChange={(event) =>
                        updateTransferForm("newClassId", event.target.value)
                    }
                    required
                    >
                    <option value="">Select class</option>
                    {classes
                        .filter((item) => item.status === "Active")
                        .map((item) => (
                        <option key={item._id} value={item._id}>
                            {item.name}
                        </option>
                        ))}
                    </select>
                </div>

                <div className="col-md-4">
                    <label className="form-label" htmlFor="transferSection">
                    Destination Section *
                    </label>

                    <select
                    id="transferSection"
                    className="form-select"
                    value={transferForm.newSectionId}
                    onChange={(event) =>
                        updateTransferForm("newSectionId", event.target.value)
                    }
                    disabled={!transferForm.newClassId}
                    required
                    >
                    <option value="">Select section</option>
                    {transferSections.map((section) => (
                        <option key={section._id} value={section._id}>
                        {section.name}
                        </option>
                    ))}
                    </select>
                </div>

                <div className="col-md-4">
                    <label className="form-label" htmlFor="transferRoll">
                    New Roll Number *
                    </label>

                    <input
                    id="transferRoll"
                    type="number"
                    min="1"
                    step="1"
                    className="form-control"
                    value={transferForm.newRollNumber}
                    onChange={(event) =>
                        updateTransferForm("newRollNumber", event.target.value)
                    }
                    required
                    />
                </div>

                <div className="col-md-4">
                    <label className="form-label" htmlFor="transferDate">
                    Transfer Date *
                    </label>

                    <input
                    id="transferDate"
                    type="date"
                    className="form-control"
                    value={transferForm.transferDate}
                    onChange={(event) =>
                        updateTransferForm("transferDate", event.target.value)
                    }
                    required
                    />
                </div>

                <div className="col-md-8">
                    <label className="form-label" htmlFor="transferRemarks">
                    Remarks
                    </label>

                    <input
                    id="transferRemarks"
                    type="text"
                    maxLength="500"
                    className="form-control"
                    value={transferForm.remarks}
                    onChange={(event) =>
                        updateTransferForm("remarks", event.target.value)
                    }
                    placeholder="Reason for transfer (optional)"
                    />
                </div>
                </div>

                <div className="mt-4 d-flex gap-2">
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                >
                    {saving ? "Transferring..." : "Confirm Transfer"}
                </button>

                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={saving}
                    onClick={() => setSelectedEnrollment(null)}
                >
                    Cancel
                </button>
                </div>
            </form>
            </div>
        </section>
        )}


      <section className="card shadow-sm">
        <div className="card-header fw-semibold">Enrollment Records</div>
        <div className="card-body">
          <form onSubmit={applyFilters} className="row g-3 mb-4">
            <div className="col-md-3">
              <label className="form-label" htmlFor="filterYear">Academic Year</label>
              <select
                id="filterYear"
                className="form-select"
                value={filters.academicYearId}
                onChange={(event) => updateFilter("academicYearId", event.target.value)}
              >
                <option value="">All years</option>
                {academicYears.map((year) => (
                  <option key={year._id} value={year._id}>{year.name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label" htmlFor="filterClass">Class</label>
              <select
                id="filterClass"
                className="form-select"
                value={filters.classId}
                onChange={(event) => updateFilter("classId", event.target.value)}
              >
                <option value="">All classes</option>
                {classes.map((item) => (
                  <option key={item._id} value={item._id}>{item.name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label" htmlFor="filterSection">Section</label>
              <select
                id="filterSection"
                className="form-select"
                value={filters.sectionId}
                onChange={(event) => updateFilter("sectionId", event.target.value)}
                disabled={!filters.classId}
              >
                <option value="">All sections</option>
                {filterSections.map((section) => (
                  <option key={section._id} value={section._id}>{section.name}</option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label" htmlFor="filterStatus">Status</label>
              <select
                id="filterStatus"
                className="form-select"
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Transferred">Transferred</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label" htmlFor="filterSearch">Search</label>
              <input
                id="filterSearch"
                className="form-control"
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Student name, admission number, or roll number"
              />
            </div>

            <div className="col-md-6 d-flex align-items-end gap-2">
              <button className="btn btn-outline-primary" type="submit">
                Apply Filters
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => {
                  const cleared = {
                    academicYearId: "",
                    classId: "",
                    sectionId: "",
                    status: "",
                    search: "",
                  };
                  setFilters(cleared);
                  setLoading(true);
                  setError("");
                  api.get("/enrollments", { params: { limit: 100 } })
                    .then((response) => setEnrollments(getArray(response)))
                    .catch((err) => setError(getErrorMessage(err)))
                    .finally(() => setLoading(false));
                }}
              >
                Clear
              </button>
            </div>
          </form>

          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission No.</th>
                  <th>Academic Year</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Roll No.</th>
                  <th>Enrollment Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleEnrollments.map((item) => (
                  <tr key={item._id}>
                    <td>{studentName(item.studentId)}</td>
                    <td>{item.studentId?.admissionNumber || "—"}</td>
                    <td>{item.academicYearId?.name || "—"}</td>
                    <td>{item.classId?.name || "—"}</td>
                    <td>{item.sectionId?.name || "—"}</td>
                    <td>{item.rollNumber}</td>
                    <td>
                      {item.enrollmentDate
                        ? new Date(item.enrollmentDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          item.status === "Active"
                            ? "text-bg-success"
                            : item.status === "Transferred"
                              ? "text-bg-info"
                              : "text-bg-secondary"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                    {canManage && item.status === "Active" && (
                        <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => startTransfer(item)}
                        disabled={saving}
                        >
                        Transfer
                        </button>
                    )}
                    </td>
                  </tr>
                ))}

                {visibleEnrollments.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center text-secondary py-4">
                      No enrollment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <small className="text-secondary">
            Showing {visibleEnrollments.length} record(s).
          </small>
        </div>
      </section>
    </main>
  );
}
