
import { useState, useEffect } from "react";
import api from "./services/api";
import FeeReceipt from "./FeeReceipt";

function FeePaymentManagement({ user }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellingPayment, setCancellingPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [outstandingInstallments, setOutstandingInstallments] = useState([]);
  const [selectedInstallment, setSelectedInstallment] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );0
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    loadPayments();
  }, []);

  useEffect(() => {
    if (showForm) {
        loadActiveAssignments();
    }
  }, [showForm]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/fee-payments", {
        params: {
            page: 1,
            limit: 100,
        },
      });

      setPayments(response.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load fee payments."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadActiveAssignments = async () => {
    try {
        const response = await api.get("/fee-assignments", {
        params: {
            page: 1,
            limit: 100,
            status: "Active",
        },
        });

        setActiveAssignments(response.data.data || []);
    } catch (err) {
        setError(
        err.response?.data?.message ||
        "Unable to load active fee assignments."
        );
    }
  };

  const loadOutstandingInstallments = async (assignmentId) => {
    try {
        setError("");
        setOutstandingInstallments([]);
        setSelectedInstallment("");
        setAmountPaid("");

        const response = await api.get(
        `/fee-payments/outstanding/${assignmentId}`
        );

        const installments = response.data.data?.installments;

        setOutstandingInstallments(
            Array.isArray(installments) ? installments : []
        );
    } catch (err) {
        setError(
        err.response?.data?.message ||
        "Unable to load outstanding installments."
        );
    }
  };

  const handleAssignmentChange = (assignmentId) => {
    setSelectedAssignment(assignmentId);

    if (assignmentId) {
        loadOutstandingInstallments(assignmentId);
    } else {
        setOutstandingInstallments([]);
        setSelectedInstallment("");
        setAmountPaid("");
    }
  };

  const handleSubmitPayment = async () => {
    try {
        setError("");
        setSuccess("");

        if (!selectedAssignment || !selectedInstallment || !amountPaid) {
        setError("Please complete all required payment fields.");
        return;
        }

        const amount = Number(amountPaid);

        if (!Number.isFinite(amount) || amount <= 0) {
        setError("Payment amount must be greater than zero.");
        return;
        }

        const installment = outstandingInstallments.find(
        (item) => item.installmentId === selectedInstallment
        );

        if (!installment || amount > installment.outstandingAmount) {
        setError("Payment amount cannot exceed the outstanding balance.");
        return;
        }

        setSubmitting(true);

        const response = await api.post("/fee-payments", {
        feeAssignmentId: selectedAssignment,
        installmentId: selectedInstallment,
        amountPaid: amount,
        paymentDate,
        paymentMethod,
        transactionReference: transactionReference.trim(),
        remarks: paymentRemarks.trim(),
        });

        setSuccess(
        response.data.message || "Payment recorded successfully."
        );

        setShowForm(false);
        await loadPayments();
    } catch (err) {
        setError(
        err.response?.data?.message || "Unable to record payment."
        );
    } finally {
        setSubmitting(false);
    }
  };

  const loadPaymentDetails = async (paymentId) => {
    try {
        setError("");
        setLoading(true);

        const response = await api.get(`/fee-payments/${paymentId}`);

        setSelectedPayment(response.data.data);
        setShowPaymentDetails(true);
    } catch (err) {
        setError(
        err.response?.data?.message ||
        "Unable to load payment details."
        );
    } finally {
        setLoading(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!cancellationReason.trim()) {
        setError("Please enter a cancellation reason.");
        return;
    }

    if (!selectedPayment?._id) {
        setError("No payment selected for cancellation.");
        return;
    }

    try {
        setCancellingPayment(true);
        setError("");
        setSuccess("");

        await api.patch(
        `/fee-payments/${selectedPayment._id}/cancel`,
        {
            cancellationReason: cancellationReason.trim(),
        }
        );

        setSuccess("Payment cancelled successfully.");
        setShowCancelForm(false);
        setCancellationReason("");

        await loadPayments();
        await loadPaymentDetails(selectedPayment._id);

    } catch (err) {
        setError(
        err.response?.data?.message ||
        "Failed to cancel payment."
        );
    } finally {
        setCancellingPayment(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
  const search = searchTerm.toLowerCase();

  const receiptNumber = payment.receiptNumber || "";
  const firstName = payment.studentId?.firstName || "";
  const lastName = payment.studentId?.lastName || "";
  const admissionNumber = payment.studentId?.admissionNumber || "";

  const matchesSearch =
    receiptNumber.toLowerCase().includes(search) ||
    firstName.toLowerCase().includes(search) ||
    lastName.toLowerCase().includes(search) ||
    admissionNumber.toLowerCase().includes(search);

  const matchesStatus =
    statusFilter === "All" || payment.status === statusFilter;

  const matchesMethod =
    methodFilter === "All" || payment.paymentMethod === methodFilter;

  return matchesSearch && matchesStatus && matchesMethod;
  });

  const totalRecords = filteredPayments.length;

  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  const startIndex = (currentPage - 1) * recordsPerPage;

  const paginatedPayments = filteredPayments.slice(
    startIndex,
    startIndex + recordsPerPage
  );

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Fee Payment Management</h3>
          <p className="text-muted mb-0">
            Record and manage student fee payments.
          </p>
        </div>
        <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            >
            <i className="bi bi-plus-circle me-2"></i>
            Record Payment
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {success && (
        <div className="alert alert-success">{success}</div>
      )}

      {showPaymentDetails && selectedPayment && (
        <div className="card shadow-sm mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Payment Details</h5>

            <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                setShowPaymentDetails(false);
                setSelectedPayment(null);
                }}
            >
                Back to Payment History
            </button>
            <button
                type="button"
                className="btn btn-primary btn-sm"
                    onClick={() => setShowReceipt(true)}
                >
                <i className="bi bi-receipt me-1"></i>
                Generate Receipt
            </button>
            </div>

            <div className="card-body">
                <div className="row g-3">

                    <div className="col-md-6">
                    <label className="text-muted small">Receipt Number</label>
                    <h6>{selectedPayment.receiptNumber}</h6>
                    </div>

                    <div className="col-md-6">
                    <label className="text-muted small">Payment Status</label>
                    <div>
                        <span
                        className={`badge ${
                            selectedPayment.status === "Completed"
                            ? "bg-success"
                            : "bg-danger"
                        }`}
                        >
                        {selectedPayment.status}
                        </span>
                    </div>
                    </div>

                </div>
                <hr className="my-4" />

                <h6 className="mb-3">Student Information</h6>

                <div className="row g-3">
                <div className="col-md-6">
                    <label className="text-muted small">Student Name</label>
                    <h6>
                    {selectedPayment.studentId?.firstName}{" "}
                    {selectedPayment.studentId?.lastName}
                    </h6>
                </div>

                <div className="col-md-6">
                    <label className="text-muted small">Admission Number</label>
                    <h6>
                    {selectedPayment.studentId?.admissionNumber || "-"}
                    </h6>
                </div>
                </div>
                <hr className="my-4" />

                <h6 className="mb-3">Payment Information</h6>

                <div className="row g-3">
                    <div className="col-md-6">
                        <label className="text-muted small">Installment Name</label>
                        <h6>{selectedPayment.installmentName}</h6>
                    </div>

                    <div className="col-md-6">
                        <label className="text-muted small">Amount Paid</label>
                        <h6>
                        ₹{Number(selectedPayment.amountPaid).toFixed(2)}
                        </h6>
                    </div>

                    <div className="col-md-6">
                        <label className="text-muted small">Payment Date</label>
                        <h6>
                        {selectedPayment.paymentDate
                            ? new Date(selectedPayment.paymentDate).toLocaleDateString("en-IN")
                            : "-"}
                        </h6>
                    </div>

                    <div className="col-md-6">
                        <label className="text-muted small">Payment Method</label>
                        <h6>{selectedPayment.paymentMethod}</h6>
                    </div>
                    <div className="col-md-6">
                    <label className="text-muted small">
                        Transaction Reference
                    </label>
                    <h6>
                        {selectedPayment.transactionReference || "-"}
                    </h6>
                    </div>

                    <div className="col-md-6">
                    <label className="text-muted small">
                        Received By
                    </label>
                    <h6>
                        {selectedPayment.receivedBy?.name || "-"}
                    </h6>
                    </div>

                    <div className="col-md-12">
                    <label className="text-muted small">
                        Payment Remarks
                    </label>
                    <p className="mb-0">
                        {selectedPayment.remarks || "-"}
                    </p>
                    </div>
                </div>

                {(user?.role === "Administrator" ||
                    user?.role === "Principal") &&
                    selectedPayment?.status === "Completed" && (
                        <div className="mt-4">
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                            setShowCancelForm(true);
                            setCancellationReason("");
                            setError("");
                            }}
                        >
                            <i className="bi bi-x-circle me-1"></i>
                            Cancel Payment
                        </button>
                        </div>
                    )}

                    {showCancelForm && (
                        <div className="card border-danger mt-3">
                            <div className="card-body">
                            <h6 className="text-danger fw-bold">
                                Cancel Fee Payment
                            </h6>

                            <label className="form-label">
                                Cancellation Reason *
                            </label>

                            <textarea
                                className="form-control"
                                rows="3"
                                maxLength="500"
                                value={cancellationReason}
                                onChange={(e) =>
                                setCancellationReason(e.target.value)
                                }
                                placeholder="Enter the reason for cancelling this payment..."
                            />

                            <small className="text-muted">
                                {cancellationReason.length}/500 characters
                            </small>

                            <div className="d-flex gap-2 mt-3">
                                <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleCancelPayment}
                                disabled={
                                    cancellingPayment ||
                                    cancellationReason.trim().length < 3
                                }
                                >
                                {cancellingPayment
                                    ? "Cancelling..."
                                    : "Confirm Cancellation"}
                                </button>

                                <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                    setShowCancelForm(false);
                                    setCancellationReason("");
                                    setError("");
                                }}
                                disabled={cancellingPayment}
                                >
                                Go Back
                                </button>
                            </div>
                            </div>
                        </div>
                        )}

                {selectedPayment.status === "Cancelled" && (
                    <>
                        <hr className="my-4" />

                        <h6 className="mb-3 text-danger">
                        Cancellation Information
                        </h6>

                        <div className="row g-3">
                        <div className="col-md-6">
                            <label className="text-muted small">
                            Cancelled At
                            </label>
                            <h6>
                            {selectedPayment.cancelledAt
                                ? new Date(selectedPayment.cancelledAt).toLocaleString("en-IN")
                                : "-"}
                            </h6>
                        </div>

                        <div className="col-md-6">
                            <label className="text-muted small">
                            Cancelled By
                            </label>
                            <h6>
                            {selectedPayment.cancelledBy?.name || "-"}
                            </h6>
                        </div>

                        <div className="col-md-12">
                            <label className="text-muted small">
                            Cancellation Reason
                            </label>
                            <p className="mb-0">
                            {selectedPayment.cancellationReason || "-"}
                            </p>
                        </div>
                        </div>
                    </>
                    )}
            </div>
        </div>
      )}

      {showReceipt && selectedPayment && (
        <FeeReceipt
            payment={selectedPayment}
            onBack={() => setShowReceipt(false)}
        />
      )}

      {showForm && (
        <div className="card shadow-sm mb-4">
            <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Record Fee Payment</h5>
            </div>

            <div className="card-body">
            <div className="mb-3">
                <label className="form-label">
                Student Fee Assignment
                </label>

                <select
                className="form-select"
                value={selectedAssignment}
                onChange={(e) => handleAssignmentChange(e.target.value)}
                >
                <option value="">Select Fee Assignment</option>

                {activeAssignments.map((assignment) => (
                    <option key={assignment._id} value={assignment._id}>
                    {assignment.studentId?.firstName}{" "}
                    {assignment.studentId?.lastName}
                    {" - "}
                    ₹{Number(assignment.finalTotal).toFixed(2)}
                    </option>
                ))}
                </select>
            </div>
            <div className="mb-3">
                <label className="form-label">Select Installment</label>

                <select
                    className="form-select"
                    value={selectedInstallment}
                    onChange={(e) => {
                    setSelectedInstallment(e.target.value);

                    const installment = outstandingInstallments.find(
                        (item) => item.installmentId === e.target.value
                    );

                    setAmountPaid(
                        installment ? installment.outstandingAmount.toString() : ""
                    );
                    }}
                    disabled={!selectedAssignment}
                >
                    <option value="">Select Installment</option>

                    {outstandingInstallments
                    .filter((item) => item.outstandingAmount > 0)
                    .map((installment) => (
                        <option
                        key={installment.installmentId}
                        value={installment.installmentId}
                        >
                        {installment.name} - Outstanding: ₹
                        {Number(installment.outstandingAmount).toFixed(2)}
                        </option>
                    ))}
                </select>
            </div>
            <div className="mb-3">
            <label className="form-label">Payment Amount (₹)</label>

            <input
                type="number"
                className="form-control"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder="Enter payment amount"
                disabled={!selectedInstallment}
            />

            <small className="text-muted">
                Maximum payable amount: ₹
                {Number(
                outstandingInstallments.find(
                    (item) => item.installmentId === selectedInstallment
                )?.outstandingAmount || 0
                ).toFixed(2)}
            </small>
            </div>
            <div className="mb-3">
        <label className="form-label">Payment Date</label>

        <input
            type="date"
            className="form-control"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
        />
        </div>
        <div className="mb-3">
        <label className="form-label">Payment Method</label>

        <select
            className="form-select"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
        >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="Card">Card</option>
        </select>
        </div>
        <div className="mb-3">
        <label className="form-label">
            Transaction Reference
        </label>

        <input
            type="text"
            className="form-control"
            value={transactionReference}
            onChange={(e) => setTransactionReference(e.target.value)}
            maxLength={100}
            placeholder="Enter UPI / Bank / Cheque reference (optional)"
        />

        <small className="text-muted">
            Maximum 100 characters.
        </small>
        </div>
        <div className="mb-3">
        <label className="form-label">Payment Remarks</label>

        <textarea
            className="form-control"
            rows="3"
            value={paymentRemarks}
            onChange={(e) => setPaymentRemarks(e.target.value)}
            maxLength={500}
            placeholder="Enter any additional payment remarks (optional)"
        />

        <small className="text-muted">
            {paymentRemarks.length}/500 characters
        </small>
        </div>
        <div className="d-flex gap-2 mt-4">
        <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmitPayment}
            disabled={
                submitting ||
                !selectedAssignment ||
                !selectedInstallment ||
                !amountPaid
            }
        >
            <i className="bi bi-check-circle me-2"></i>
            {submitting ? "Processing..." : "Submit Payment"}
        </button>

        <button
            type="button"
            className="btn btn-outline-secondary"
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
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
            <h5 className="mb-0">Payment History</h5>

            <div className="d-flex gap-2 flex-wrap">
                <div style={{ minWidth: "280px" }}>
                    <input
                    type="text"
                    className="form-control"
                    placeholder="Search receipt, student or admission no."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div style={{ minWidth: "160px" }}>
                    <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    >
                    <option value="All">All Statuses</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    </select>
                </div>
                <div style={{ minWidth: "170px" }}>
                <select
                    className="form-select"
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                >
                    <option value="All">All Payment Methods</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Card</option>
                </select>
                </div>
                </div>
            </div>

          {loading ? (
            <p>Loading payments...</p>
          ) : filteredPayments.length === 0 ? (
            <p className="text-muted mb-0">
              No fee payments found.
            </p>
          ) : (
            <div className="table-responsive">
                <table className="table table-bordered table-hover align-middle">
                <thead className="table-light">
                    <tr>
                    <th>Receipt No.</th>
                    <th>Student</th>
                    <th>Admission No.</th>
                    <th>Installment</th>
                    <th>Amount Paid</th>
                    <th>Payment Date</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                    {paginatedPayments.map((payment) => (
                    <tr key={payment._id}>
                        <td>{payment.receiptNumber}</td>

                        <td>
                        {payment.studentId?.firstName}{" "}
                        {payment.studentId?.lastName}
                        </td>

                        <td>
                        {payment.studentId?.admissionNumber || "-"}
                        </td>

                        <td>{payment.installmentName}</td>

                        <td>
                        ₹{Number(payment.amountPaid).toFixed(2)}
                        </td>

                        <td>
                        {payment.paymentDate
                            ? new Date(payment.paymentDate).toLocaleDateString("en-IN")
                            : "-"}
                        </td>

                        <td>{payment.paymentMethod}</td>

                        <td>
                        <span
                            className={`badge ${
                            payment.status === "Completed"
                                ? "bg-success"
                                : "bg-danger"
                            }`}
                        >
                            {payment.status}
                        </span>
                        </td>
                        <td>
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => loadPaymentDetails(payment._id)}
                            >
                                <i className="bi bi-eye me-1"></i>
                                View
                            </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted">
                        Showing {startIndex + 1} to{" "}
                        {Math.min(startIndex + recordsPerPage, totalRecords)} of{" "}
                        {totalRecords} records
                    </small>

                    <div className="d-flex align-items-center gap-2">
                        <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                        >
                        Previous
                        </button>

                        <span className="small">
                        Page {currentPage} of {totalPages}
                        </span>

                        <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                        >
                        Next
                        </button>
                    </div>
                    </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default FeePaymentManagement;
