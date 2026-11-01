
import { useEffect, useState } from "react";
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

export default function FeeAssignmentManagement({ user, onBack }) {
  const canManage = MANAGE_ROLES.includes(user?.role);

  const [assignments, setAssignments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const [paymentSummaries, setPaymentSummaries] = useState({});

  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  
  const [feeStructures, setFeeStructures] = useState([]);

  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");

  const [selectedFeeStructureId, setSelectedFeeStructureId] = useState("");

  const [concessionType, setConcessionType] = useState("None");
  const [concessionValue, setConcessionValue] = useState(0);
  const [remarks, setRemarks] = useState("");

  const selectedEnrollment = enrollments.find(
    (enrollment) => enrollment._id === selectedEnrollmentId
  );

  const matchingFeeStructures = selectedEnrollment
    ? feeStructures.filter(
        (structure) =>
          structure.academicYearId?._id ===
            selectedEnrollment.academicYearId?._id &&
          structure.classId?._id === selectedEnrollment.classId?._id
      )
    : [];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleCreateAssignment() {
    setError("");
    setSuccess("");

    if (!selectedEnrollmentId) {
        setError("Please select a student enrollment.");
        return;
    }

    if (!selectedFeeStructureId) {
        setError("Please select a fee structure.");
        return;
    }

    if (
        concessionType !== "None" &&
        (concessionValue === "" ||
        !Number.isFinite(Number(concessionValue)) ||
        Number(concessionValue) < 0)
    ) {
        setError("Please enter a valid concession value.");
        return;
    }

    if (
        concessionType === "Percentage" &&
        Number(concessionValue) > 100
    ) {
        setError("Concession percentage cannot exceed 100%.");
        return;
    }

    const payload = {
        enrollmentId: selectedEnrollmentId,
        feeStructureId: selectedFeeStructureId,
        concessionType,
        concessionValue:
        concessionType === "None" ? 0 : Number(concessionValue),
        remarks: remarks.trim(),
    };

    setSaving(true);

    try {
        const response = await api.post("/fee-assignments", payload);

        setSuccess(
        response.data?.message || "Fee assignment created successfully."
        );

        setShowForm(false);
        const assignmentResponse = await api.get("/fee-assignments", {
            params: { limit: 20, page: 1 },
        });

        setAssignments(getArray(assignmentResponse));
    } catch (err) {
        setError(getErrorMessage(err));
    } finally {
        setSaving(false);
    }
  }

  async function handleViewPaymentBreakdown(assignment) {
    setBreakdownLoading(true);
    setError("");
    setSelectedBreakdown(null);

    try {
        const response = await api.get(
        `/fee-payments/outstanding/${assignment._id}`
        );

        setSelectedBreakdown({
        assignment,
        installments: response.data?.data?.installments || [],
        totalOutstanding: Number(
            response.data?.data?.totalOutstanding || 0
        ),
        });

        setShowPaymentBreakdown(true);

    } catch (err) {
        setError(getErrorMessage(err));
    } finally {
        setBreakdownLoading(false);
    }
  }

  useEffect(() => {
    async function loadPage() {
        setLoading(true);
        setError("");

        try {
        const [enrollmentResponse, structureResponse, assignmentResponse] =
            await Promise.all([
            api.get("/enrollments", {
                params: { status: "Active", limit: 100 },
            }),
            api.get("/fee-structures", {
                params: { status: "Active", limit: 100 },
            }),
            api.get("/fee-assignments", {
                params: { limit: 20, page: 1 },
            }),
            ]);

        setEnrollments(getArray(enrollmentResponse));
        setFeeStructures(getArray(structureResponse));

        const assignmentList = getArray(assignmentResponse);
        setAssignments(assignmentList);

        // Load payment summaries for each assignment
        const summaryResults = await Promise.all(
        assignmentList.map(async (assignment) => {
            try {
            const response = await api.get(
                `/fee-payments/outstanding/${assignment._id}`
            );

            const outstanding =
                Number(response.data?.data?.totalOutstanding || 0);

            const finalTotal = Number(assignment.finalTotal || 0);

            return {
                id: assignment._id,
                totalPaid: Math.max(0, finalTotal - outstanding),
                outstanding,
            };
            } catch (error) {
            return {
                id: assignment._id,
                totalPaid: null,
                outstanding: null,
            };
            }
        })
        );

        const summaries = {};

        summaryResults.forEach((summary) => {
        summaries[summary.id] = summary;
        });

        setPaymentSummaries(summaries);
        } catch (err) {
        setError(getErrorMessage(err));
        } finally {
        setLoading(false);
        }
    }

    loadPage();
    }, []);

  return (
    <main className="container-fluid px-3 px-md-4 py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h2 className="mb-1">Fee Assignment Management</h2>
          <p className="text-secondary mb-0">
            Assign fee structures to student enrollments.
          </p>
        </div>

        {canManage && (
            <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
            >
                <i className="bi bi-plus-circle me-2"></i>
                Create Fee Assignment
            </button>
        )}

        {onBack && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onBack}
          >
            Back
          </button>
        )}
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

      {loading ? (
        <p role="status">Loading fee assignment data...</p>
      ) : (
        <>
        {showForm && canManage && (
            <div className="card shadow-sm mb-4">
                <div className="card-header fw-semibold">
                Create Fee Assignment
                </div>
                <div className="card-body">
                <div className="mb-3">
                    <label htmlFor="enrollmentId" className="form-label">
                    Select Student Enrollment
                    </label>

                    <select
                    id="enrollmentId"
                    className="form-select"
                    value={selectedEnrollmentId}
                    onChange={(e) => {
                        setSelectedEnrollmentId(e.target.value);
                        setSelectedFeeStructureId("");
                    }}
                    >
                    <option value="">-- Select Enrollment --</option>

                    {enrollments.map((enrollment) => (
                        <option key={enrollment._id} value={enrollment._id}>
                        {enrollment.studentId?.firstName}{" "}
                        {enrollment.studentId?.lastName}
                        {" - "}
                        {enrollment.academicYearId?.name}
                        {" - "}
                        {enrollment.classId?.name}
                        </option>
                    ))}
                    </select>
                </div>
                <div className="mb-3">
                    <label htmlFor="feeStructureId" className="form-label">
                        Select Fee Structure
                    </label>

                    <select
                        id="feeStructureId"
                        className="form-select"
                        disabled={!selectedEnrollmentId}
                        value={selectedFeeStructureId}
                        onChange={(e) => setSelectedFeeStructureId(e.target.value)}
                    >
                        <option value="">-- Select Fee Structure --</option>

                        {matchingFeeStructures.map((structure) => (
                        <option key={structure._id} value={structure._id}>
                            {structure.name}
                        </option>
                        ))}
                    </select>

                    {selectedEnrollmentId && matchingFeeStructures.length === 0 && (
                        <small className="text-danger">
                        No active fee structure is available for this class and academic year.
                        </small>
                    )}
                    </div>
                                    <div className="mb-3">
                    <label htmlFor="concessionType" className="form-label">
                        Concession Type
                    </label>

                    <select
                        id="concessionType"
                        className="form-select"
                        value={concessionType}
                        onChange={(e) => {
                            setConcessionType(e.target.value);
                            setConcessionValue(0);
                        }}
                    >
                        <option value="None">No Concession</option>
                        <option value="Fixed">Fixed Amount (₹)</option>
                        <option value="Percentage">Percentage (%)</option>
                    </select>
                </div>
                                {concessionType !== "None" && (
                    <div className="mb-3">
                        <label htmlFor="concessionValue" className="form-label">
                            {concessionType === "Fixed"
                                ? "Concession Amount (₹)"
                                : "Concession Percentage (%)"}
                        </label>

                        <input
                            type="number"
                            id="concessionValue"
                            className="form-control"
                            min="0"
                            step={concessionType === "Fixed" ? "0.01" : "0.01"}
                            max={concessionType === "Percentage" ? "100" : undefined}
                            value={concessionValue}
                            onChange={(e) =>
                                setConcessionValue(
                                    e.target.value === "" ? "" : Number(e.target.value)
                                )
                            }
                            placeholder="Enter concession value"
                        />
                    </div>
                )}
                                <div className="mb-3">
                    <label htmlFor="remarks" className="form-label">
                        Remarks
                    </label>

                    <textarea
                        id="remarks"
                        className="form-control"
                        rows="3"
                        maxLength="500"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter remarks (optional)"
                    />

                    <small className="text-secondary">
                        {remarks.length}/500 characters
                    </small>
                </div>
                                <div className="d-flex gap-2 mt-4">
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={saving}
                        onClick={handleCreateAssignment}
                    >
                        {saving ? "Creating..." : "Create Assignment"}
                    </button>

                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowForm(false)}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                </div>
                </div>
            </div>
            )}
            {showPaymentBreakdown && selectedBreakdown && (
                <div className="card shadow-sm mb-4 border-primary">
                    <div className="card-header d-flex justify-content-between align-items-center">
                    <strong>Installment-wise Payment Breakdown</strong>

                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                        setShowPaymentBreakdown(false);
                        setSelectedBreakdown(null);
                        }}
                    >
                        Close
                    </button>
                    </div>

                    <div className="card-body">
                    <h6 className="mb-3">
                        Student: {selectedBreakdown.assignment.studentId?.firstName}{" "}
                        {selectedBreakdown.assignment.studentId?.lastName}
                    </h6>

                    <div className="table-responsive">
                        <table className="table table-bordered table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                            <th>Installment</th>
                            <th>Due Date</th>
                            <th>Amount Due</th>
                            <th>Amount Paid</th>
                            <th>Outstanding</th>
                            <th>Payment Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {selectedBreakdown.installments.map((installment) => {
                            const due = Number(installment.amountDue || 0);
                            const paid = Number(installment.amountPaid || 0);
                            const outstanding = Number(
                                installment.outstandingAmount || 0
                            );

                            const status =
                                outstanding <= 0
                                ? "Paid"
                                : paid > 0
                                ? "Partially Paid"
                                : "Pending";

                            return (
                                <tr key={installment.installmentId}>
                                <td>{installment.name}</td>
                                <td>
                                    {installment.dueDate
                                    ? new Date(installment.dueDate).toLocaleDateString("en-IN")
                                    : "—"}
                                </td>
                                <td>₹{due.toFixed(2)}</td>
                                <td>₹{paid.toFixed(2)}</td>
                                <td>₹{outstanding.toFixed(2)}</td>
                                <td>
                                    <span
                                    className={`badge ${
                                        status === "Paid"
                                        ? "text-bg-success"
                                        : status === "Partially Paid"
                                        ? "text-bg-warning"
                                        : "text-bg-secondary"
                                    }`}
                                    >
                                    {status}
                                    </span>
                                </td>
                                </tr>
                            );
                            })}
                        </tbody>
                        </table>
                    </div>

                    <div className="text-end fw-bold mt-3">
                        Total Outstanding: ₹
                        {selectedBreakdown.totalOutstanding.toFixed(2)}
                    </div>
                    </div>
                </div>
            )}
        <section className="card shadow-sm">
            <div className="card-header fw-semibold">
                Fee Assignment Records
            </div>

            <div className="card-body">
                <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="border rounded p-3">
                    <small className="text-secondary">Total Loaded Assignments</small>
                    <h4 className="mb-0">{assignments.length}</h4>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="border rounded p-3">
                    <small className="text-secondary">Active Assignments</small>
                    <h4 className="mb-0">
                        {assignments.filter((item) => item.status === "Active").length}
                    </h4>
                    </div>
                </div>

                <div className="col-md-4">
                    <div className="border rounded p-3">
                    <small className="text-secondary">Cancelled Assignments</small>
                    <h4 className="mb-0">
                        {assignments.filter((item) => item.status === "Cancelled").length}
                    </h4>
                    </div>
                </div>
                </div>

                <div className="table-responsive">
                <table className="table table-striped table-hover align-middle">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Academic Year</th>
                            <th>Class</th>
                            <th>Fee Structure</th>
                            <th>Original Total</th>
                            <th>Concession</th>
                            <th>Final Total</th>
                            <th>Total Paid</th>
                            <th>Outstanding Balance</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                    {assignments.map((item) => {
                        const student = item.studentId || {};
                        const studentName =
                        `${student.firstName || ""} ${student.lastName || ""}`.trim();
                        const paymentSummary = paymentSummaries[item._id];

                        return (
                        <tr key={item._id}>
                            <td>{studentName || "—"}</td>
                            <td>{item.academicYearId?.name || "—"}</td>
                            <td>{item.classId?.name || "—"}</td>
                            <td>{item.feeStructureId?.name || "—"}</td>
                            <td>₹{Number(item.originalTotal || 0).toFixed(2)}</td>
                            <td>₹{Number(item.concessionTotal || 0).toFixed(2)}</td>
                            <td>₹{Number(item.finalTotal || 0).toFixed(2)}</td>
                            <td>
                            {paymentSummary
                                ? `₹${paymentSummary.totalPaid.toFixed(2)}`
                                : "Loading..."}
                            </td>

                            <td className="fw-semibold text-danger">
                            {paymentSummary
                                ? `₹${paymentSummary.outstanding.toFixed(2)}`
                                : "Loading..."}
                            </td>
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
                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => handleViewPaymentBreakdown(item)}
                                    disabled={breakdownLoading}
                                >
                                    <i className="bi bi-eye me-1"></i>
                                    View Breakdown
                                </button>
                            </td>
                        </tr>
                        );
                    })}

                    {assignments.length === 0 && (
                        <tr>
                        <td colSpan="10" className="text-center text-secondary py-4">
                            No fee assignments found.
                        </td>
                        </tr>
                    )}
                    
                    </tbody>
                </table>
                </div>
            </div>
        </section>
        </>
      )}
      
    </main>
  );
}
