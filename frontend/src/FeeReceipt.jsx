function FeeReceipt({ payment, onBack }) {
  if (!payment) {
    return null;
  }

    const printStyles = `
    @media print {
        body * {
        visibility: hidden;
        }

        .receipt-container,
        .receipt-container * {
        visibility: visible;
        }

        .receipt-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 0 !important;
        }

        .receipt-actions {
        display: none !important;
        }

        .receipt-container .card {
        border: none !important;
        box-shadow: none !important;
        }
    }
    `;

  return (
    <div className="container py-4 receipt-container">
    <style>{printStyles}</style>
      <div className="card shadow-sm">
        <div className="card-body p-4">

          {/* School Header */}
            <div className="text-center mb-4">
            <img
                src="/zaruk-global-school-logo.jpg"
                alt="Zaruk Global School Logo"
                style={{
                width: "120px",
                height: "120px",
                objectFit: "contain",
                marginBottom: "10px"
                }}
            />

            <h3 className="fw-bold">Zaruk Global School</h3>

            <h5 className="mt-3">FEE PAYMENT RECEIPT</h5>
            <hr />
            </div>

          {/* Receipt Information */}
          <div className="row mb-4">
            <div className="col-md-6">
              <strong>Receipt Number:</strong>
              <p>{payment.receiptNumber}</p>
            </div>

            <div className="col-md-6">
              <strong>Payment Date:</strong>
              <p>
                {payment.paymentDate
                  ? new Date(payment.paymentDate).toLocaleDateString("en-IN")
                  : "-"}
              </p>
            </div>
          </div>

          {/* Student Information */}
          <h6 className="fw-bold">Student Information</h6>
          <hr />

          <p>
            <strong>Student Name:</strong>{" "}
            {payment.studentId?.firstName}{" "}
            {payment.studentId?.lastName}
          </p>

          <p>
            <strong>Admission Number:</strong>{" "}
            {payment.studentId?.admissionNumber || "-"}
          </p>

          {/* Payment Information */}
          <h6 className="fw-bold mt-4">Payment Information</h6>
          <hr />

          <p>
            <strong>Installment:</strong>{" "}
            {payment.installmentName}
          </p>

          <p>
            <strong>Payment Method:</strong>{" "}
            {payment.paymentMethod}
          </p>

          <p>
            <strong>Amount Paid:</strong>{" "}
            ₹{Number(payment.amountPaid).toFixed(2)}
          </p>

          <p>
            <strong>Transaction Reference:</strong>{" "}
            {payment.transactionReference || "-"}
          </p>

          <p>
            <strong>Received By:</strong>{" "}
            {payment.receivedBy?.name || "-"}
          </p>

          <hr />

          {/* Signature */}
          <div className="text-end mt-5">
            <p>________________________</p>
            <strong>Authorized Signatory</strong>
          </div>

          {/* Buttons */}
            <div className="d-flex gap-2 mt-4 receipt-actions">
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => window.print()}
                >
                    <i className="bi bi-printer me-1"></i>
                    Print Receipt
                </button>

                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={onBack}
                >
                    Back
                </button>
            </div>

        </div>
      </div>
    </div>
  );
}

export default FeeReceipt;