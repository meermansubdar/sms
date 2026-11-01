
import { useState, useEffect } from "react";
import api from "./services/api";

function FeePaymentManagement() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    loadPayments();
  }, []);

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
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {success && (
        <div className="alert alert-success">{success}</div>
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
