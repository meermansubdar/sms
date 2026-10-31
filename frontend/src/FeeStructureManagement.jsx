
import { useEffect, useState } from "react";
import api from "./services/api";

export default function FeeStructureManagement({ user, onBack }) {
  const [feeStructures, setFeeStructures] = useState([]);

  const [pagination, setPagination] = useState({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
  });

  const [academicYears, setAcademicYears] = useState([]);
  const [classes, setClasses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingFeeId, setEditingFeeId] = useState(null);

  const [viewingFee, setViewingFee] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    academicYearId: "",
    classId: "",
    currency: "INR",
    components: [
      { name: "", amount: "" },
    ],
    installments: [
      { name: "", amount: "", dueDate: "" },
    ],
    remarks: "",
  });

  const componentTotal = formData.components.reduce(
    (total, component) => total + Number(component.amount || 0),
    0
    );

  const installmentTotal = formData.installments.reduce(
    (total, installment) => total + Number(installment.amount || 0),
    0
    );

  const feeDifference = Number(
    (componentTotal - installmentTotal).toFixed(2)
    );

  async function loadDropdowns() {
    try {
      const [yearResponse, classResponse] = await Promise.all([
        api.get("/academic-years", {
          params: { limit: 100 },
        }),
        api.get("/classes", {
          params: { limit: 100 },
        }),
      ]);

      setAcademicYears(yearResponse.data.data || []);
      setClasses(classResponse.data.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load Academic Years and Classes."
      );
    }
  }

  
    function validateFeeStructure() {
    if (!formData.name.trim()) {
        return "Please enter the Fee Structure Name.";
    }

    if (!formData.academicYearId) {
        return "Please select an Academic Year.";
    }

    if (!formData.classId) {
        return "Please select a Class.";
    }

    for (let i = 0; i < formData.components.length; i++) {
        const component = formData.components[i];

        if (!component.name.trim()) {
        return `Please enter the name of Fee Component ${i + 1}.`;
        }

        if (
        component.amount === "" ||
        !Number.isFinite(Number(component.amount)) ||
        Number(component.amount) < 0
        ) {
        return `Please enter a valid amount for Fee Component ${i + 1}.`;
        }
    }

    for (let i = 0; i < formData.installments.length; i++) {
        const installment = formData.installments[i];

        if (!installment.name.trim()) {
        return `Please enter the name of Installment ${i + 1}.`;
        }

        if (
        installment.amount === "" ||
        !Number.isFinite(Number(installment.amount)) ||
        Number(installment.amount) < 0
        ) {
        return `Please enter a valid amount for Installment ${i + 1}.`;
        }

        if (!installment.dueDate) {
        return `Please select a due date for Installment ${i + 1}.`;
        }
    }

    const dueDates = formData.installments.map(
        (installment) => installment.dueDate
    );

    if (new Set(dueDates).size !== dueDates.length) {
        return "Each installment must have a different due date.";
    }

    if (feeDifference !== 0) {
        return "Total Fee Components must equal Total Installments.";
    }

    return "";
    }

    async function handleViewFee(feeId) {
        try {
            setError("");

            const response = await api.get(`/fee-structures/${feeId}`);

            setViewingFee(response.data.data);
            setShowDetails(true);

        } catch (err) {
            alert(
                err.response?.data?.message ||
                "Unable to load Fee Structure details."
            );
        }
    }

    const handleEditFee = async (feeId) => {
      try {
        setFormError("");

        const response = await api.get(`/fee-structures/${feeId}`);
        const fee = response.data.data;

        setFormData({
          name: fee.name || "",
          academicYearId: fee.academicYearId?._id || "",
          classId: fee.classId?._id || "",
          currency: fee.currency || "INR",
          components: (fee.components || []).map((component) => ({
            name: component.name,
            amount: String(component.amount),
          })),
          installments: (fee.installments || []).map((installment) => ({
            name: installment.name,
            amount: String(installment.amount),
            dueDate: installment.dueDate
              ? installment.dueDate.slice(0, 10)
              : "",
          })),
          remarks: fee.remarks || "",
        });

        setEditingFeeId(feeId);

        setShowForm(true);
      } catch (err) {
        alert(
          err.response?.data?.message || "Failed to load Fee Structure."
        );
      }
    };

    async function handleToggleFeeStatus(fee) {
      const newStatus =
          fee.status === "Active" ? "Inactive" : "Active";

      const confirmed = window.confirm(
          `Are you sure you want to mark "${fee.name}" as ${newStatus}?`
      );

      if (!confirmed) {
          return;
      }

      try {
          const response = await api.patch(
              `/fee-structures/${fee._id}/status`,
              { status: newStatus }
          );

          alert(
              response.data.message ||
              `Fee Structure marked ${newStatus}.`
          );

          await loadFeeStructures();

      } catch (err) {
          alert(
              err.response?.data?.message ||
              "Unable to update Fee Structure status."
          );
      }
  }
    
    async function handleSaveFeeStructure(e) {
        e.preventDefault();

        setFormError("");

        const validationMessage = validateFeeStructure();

        if (validationMessage) {
            setFormError(validationMessage);
            return;
        }

        try {
            setSaving(true);

            const payload = {
                name: formData.name.trim(),
                academicYearId: formData.academicYearId,
                classId: formData.classId,
                currency: "INR",
                components: formData.components.map((component) => ({
                    name: component.name.trim(),
                    amount: Number(component.amount),
                })),
                installments: formData.installments.map((installment) => ({
                    name: installment.name.trim(),
                    amount: Number(installment.amount),
                    dueDate: installment.dueDate,
                })),
                remarks: formData.remarks.trim(),
            };

            if (editingFeeId) {
                await api.patch(`/fee-structures/${editingFeeId}`, payload);
                alert("Fee Structure updated successfully!");
            } else {
                await api.post("/fee-structures", payload);
                alert("Fee Structure created successfully!");
            }

            setShowForm(false);
            setEditingFeeId(null);

            setFormData({
                name: "",
                academicYearId: "",
                classId: "",
                currency: "INR",
                components: [{ name: "", amount: "" }],
                installments: [{ name: "", amount: "", dueDate: "" }],
                remarks: "",
            });

            await loadFeeStructures();

        } catch (err) {
            setFormError(
                err.response?.data?.message ||
                "Unable to save Fee Structure."
            );
        } finally {
            setSaving(false);
        }
    }
  async function loadFeeStructures() {
      try {
          setLoading(true);
          setError("");

          const response = await api.get("/fee-structures", {
              params: {
                  search,
                  status,
                  academicYearId,
                  classId,
                  page: pagination.page,
                  limit: pagination.limit,
              },
          });

          setFeeStructures(response.data.data || []);

          setPagination((prev) => ({
              ...prev,
              ...response.data.pagination,
          }));

      } catch (err) {
          setError(
              err.response?.data?.message ||
              "Unable to load Fee Structures."
          );
      } finally {
          setLoading(false);
      }
  }

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
      setPagination((prev) => ({
          ...prev,
          page: 1,
      }));
  }, [search, status, academicYearId, classId]);

  useEffect(() => {
      loadFeeStructures();
  }, [search, status, academicYearId, classId, pagination.page]);

  return (
    <main className="container-fluid px-3 px-md-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Fee Structure Management</h2>
          <p className="text-secondary mb-0">
            Manage class-wise fee structures and installments.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onBack}
        >
          Back
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {showDetails && viewingFee && (
          <div className="card shadow-sm mb-4">
              <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="mb-0">Fee Structure Details</h5>

                      <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => {
                              setShowDetails(false);
                              setViewingFee(null);
                          }}
                      >
                          <i className="bi bi-arrow-left me-1"></i>
                          Back to List
                      </button>
                  </div>

                  <div className="row g-3 mb-4">
                      <div className="col-md-4">
                          <label className="text-secondary">Fee Structure</label>
                          <h6>{viewingFee.name}</h6>
                      </div>

                      <div className="col-md-4">
                          <label className="text-secondary">Academic Year</label>
                          <h6>{viewingFee.academicYearId?.name || "-"}</h6>
                      </div>

                      <div className="col-md-4">
                          <label className="text-secondary">Class</label>
                          <h6>{viewingFee.classId?.name || "-"}</h6>
                      </div>

                      <div className="col-md-4">
                          <label className="text-secondary">Status</label>
                          <div>
                              <span className={`badge ${
                                  viewingFee.status === "Active"
                                      ? "bg-success"
                                      : "bg-secondary"
                              }`}>
                                  {viewingFee.status}
                              </span>
                          </div>
                      </div>
                  </div>

                  <hr />

                  <h6 className="mb-3">Fee Components</h6>

                  <div className="table-responsive mb-4">
                      <table className="table table-bordered">
                          <thead className="table-light">
                              <tr>
                                  <th>Component Name</th>
                                  <th className="text-end">Amount</th>
                              </tr>
                          </thead>
                          <tbody>
                              {(viewingFee.components || []).map((component, index) => (
                                  <tr key={index}>
                                      <td>{component.name}</td>
                                      <td className="text-end">
                                          ₹{Number(component.amount).toLocaleString("en-IN", {
                                              minimumFractionDigits: 2,
                                          })}
                                      </td>
                                  </tr>
                              ))}
                              <tr className="table-light fw-bold">
                                  <td>Total Fee</td>
                                  <td className="text-end">
                                      ₹{(viewingFee.components || []).reduce(
                                          (total, component) =>
                                              total + Number(component.amount || 0),
                                          0
                                      ).toLocaleString("en-IN", {
                                          minimumFractionDigits: 2,
                                      })}
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>

                  <h6 className="mb-3">Installment Details</h6>

                  <div className="table-responsive mb-4">
                      <table className="table table-bordered">
                          <thead className="table-light">
                              <tr>
                                  <th>Installment Name</th>
                                  <th className="text-end">Amount</th>
                                  <th>Due Date</th>
                              </tr>
                          </thead>
                          <tbody>
                              {(viewingFee.installments || []).map((installment, index) => (
                                  <tr key={index}>
                                      <td>{installment.name}</td>
                                      <td className="text-end">
                                          ₹{Number(installment.amount).toLocaleString("en-IN", {
                                              minimumFractionDigits: 2,
                                          })}
                                      </td>
                                      <td>
                                          {installment.dueDate
                                              ? new Date(installment.dueDate).toLocaleDateString("en-IN")
                                              : "-"}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  <h6>Remarks</h6>
                  <p className="text-secondary mb-0">
                      {viewingFee.remarks || "No remarks available."}
                  </p>
              </div>
          </div>
      )}

      
        {showForm && (
        <div className="card shadow-sm mb-4">
            <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">Add Fee Structure</h5>

                    <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setShowForm(false)}
                    ></button>
                </div>

                <div className="row g-3">
                    <div className="col-md-4">
                    <label className="form-label">Fee Structure Name</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Annual Fee"
                        value={formData.name}
                        onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                        }
                    />
                    </div>

                    <div className="col-md-4">
                        <label className="form-label">Academic Year</label>
                        <select
                            className="form-select"
                            value={formData.academicYearId}
                            onChange={(e) =>
                            setFormData({ ...formData, academicYearId: e.target.value })
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

                    <div className="col-md-4">
                        <label className="form-label">Class</label>
                        <select
                            className="form-select"
                            value={formData.classId}
                            onChange={(e) =>
                            setFormData({ ...formData, classId: e.target.value })
                            }
                        >
                            <option value="">Select Class</option>
                            {classes.map((schoolClass) => (
                            <option key={schoolClass._id} value={schoolClass._id}>
                                {schoolClass.name}
                            </option>
                            ))}
                        </select>
                    </div>
                </div>

                <hr className="my-4" />

                <h5 className="mb-3">Fee Components</h5>

                {formData.components.map((component, index) => (
                    <div className="row g-3 mb-3" key={index}>
                        <div className="col-md-5">
                            <label className="form-label">
                            Component Name
                            </label>
                            <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Tuition Fee"
                            value={component.name}
                            onChange={(e) => {
                                const updated = [...formData.components];
                                updated[index].name = e.target.value;
                                setFormData({ ...formData, components: updated });
                            }}
                            />
                        </div>

                        <div className="col-md-5">
                            <label className="form-label">
                            Amount (₹)
                            </label>
                            <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-control"
                            placeholder="Enter amount"
                            value={component.amount}
                            onChange={(e) => {
                                const updated = [...formData.components];
                                updated[index].amount = e.target.value;
                                setFormData({ ...formData, components: updated });
                            }}
                            />
                        </div>

                        <div className="col-md-2 d-flex align-items-end">
                            <button
                            type="button"
                            className="btn btn-outline-danger w-100"
                            disabled={formData.components.length === 1}
                            onClick={() => {
                                setFormData({
                                ...formData,
                                components: formData.components.filter(
                                    (_, i) => i !== index
                                ),
                                });
                            }}
                            >
                            Remove
                            </button>
                        </div>
                    </div>
                ))}

                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() =>
                        setFormData({
                            ...formData,
                            components: [
                            ...formData.components,
                            { name: "", amount: "" },
                            ],
                        })
                        }
                    >
                        + Add Component
                    </button>

                    <hr className="my-4" />

                    <h5 className="mb-3">Fee Installments</h5>

                    {formData.installments.map((installment, index) => (
                        <div className="row g-3 mb-3" key={index}>
                        <div className="col-md-4">
                            <label className="form-label">Installment Name</label>
                            <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. First Installment"
                            value={installment.name}
                            onChange={(e) => {
                                const updated = [...formData.installments];
                                updated[index].name = e.target.value;
                                setFormData({ ...formData, installments: updated });
                            }}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Amount (₹)</label>
                            <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="form-control"
                            placeholder="Enter amount"
                            value={installment.amount}
                            onChange={(e) => {
                                const updated = [...formData.installments];
                                updated[index].amount = e.target.value;
                                setFormData({ ...formData, installments: updated });
                            }}
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label">Due Date</label>
                            <input
                            type="date"
                            className="form-control"
                            value={installment.dueDate}
                            onChange={(e) => {
                                const updated = [...formData.installments];
                                updated[index].dueDate = e.target.value;
                                setFormData({ ...formData, installments: updated });
                            }}
                            />
                        </div>

                        <div className="col-md-2 d-flex align-items-end">
                            <button
                            type="button"
                            className="btn btn-outline-danger w-100"
                            disabled={formData.installments.length === 1}
                            onClick={() => {
                                setFormData({
                                ...formData,
                                installments: formData.installments.filter(
                                    (_, i) => i !== index
                                ),
                                });
                            }}
                            >
                            Remove
                            </button>
                        </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() =>
                        setFormData({
                            ...formData,
                            installments: [
                            ...formData.installments,
                            { name: "", amount: "", dueDate: "" },
                            ],
                        })
                        }
                    >
                        + Add Installment
                    </button>
                    </div>
                    <hr className="my-4" />

                    <h5 className="mb-3">Fee Summary</h5>

                    <div className="row g-3">
                        <div className="col-md-4">
                        <div className="card bg-light">
                            <div className="card-body">
                            <div className="text-secondary">Total Fee Components</div>
                            <h4 className="mb-0">
                                ₹{componentTotal.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                })}
                            </h4>
                            </div>
                        </div>
                        </div>

                        <div className="col-md-4">
                        <div className="card bg-light">
                            <div className="card-body">
                            <div className="text-secondary">Total Installments</div>
                            <h4 className="mb-0">
                                ₹{installmentTotal.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                })}
                            </h4>
                            </div>
                        </div>
                        </div>

                        <div className="col-md-4">
                        <div className="card bg-light">
                            <div className="card-body">
                            <div className="text-secondary">Difference
                            <small>
                                &nbsp;({feeDifference === 0
                                ? "Totals match"
                                : "Totals do not match"})
                            </small>

                            </div>
                            <h4 className={`mb-0 ${feeDifference === 0 ? "text-success" : "text-danger"}`}>
                                ₹{Math.abs(feeDifference).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                })}
                            </h4>
                            </div>
                        </div>
                        </div>
                    </div> 
                    
                    {formError && (
                        <div className="alert alert-danger mt-3">
                        {formError}
                        </div>
                    )}

                    <div className="mt-4">
                        <label className="form-label">Remarks (Optional)</label>
                        <textarea
                        className="form-control"
                        rows="3"
                        maxLength={500}
                        placeholder="Enter any additional information..."
                        value={formData.remarks}
                        onChange={(e) =>
                            setFormData({ ...formData, remarks: e.target.value })
                        }
                        />
                        <small className="text-secondary">
                        {formData.remarks.length}/500 characters
                        </small>
                    </div>

                    
                    <div className="d-flex justify-content-end gap-2 mt-4">
                        <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                            setShowForm(false);
                            setFormError("");
                        }}
                        disabled={saving}
                        >
                        Cancel
                        </button>

                        <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSaveFeeStructure}
                        disabled={saving}
                        >
                        {saving ? "Saving..." : "Save Fee Structure"}
                        </button>
                    </div>
                </div>
                )}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Search Fee Structures</h5>

          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fee structure..."
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Academic Year</label>
              <select
                className="form-select"
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
              >
                <option value="">All Academic Years</option>
                {academicYears.map((year) => (
                  <option key={year._id} value={year._id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Class</label>
              <select
                className="form-select"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass._id} value={schoolClass._id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="card-title mb-0">Fee Structures</h5>

            {(user.role === "Administrator" || user.role === "Principal") && (
                <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditingFeeId(null);
                  setFormError("");
                  setFormData({
                      name: "",
                      academicYearId: "",
                      classId: "",
                      currency: "INR",
                      components: [{ name: "", amount: "" }],
                      installments: [{ name: "", amount: "", dueDate: "" }],
                      remarks: "",
                  });
                  setShowForm(true);
              }}
                >
                <i className="bi bi-plus-lg me-2"></i>
                Add Fee Structure
                </button>
            )}
            </div>

          {loading ? (
            <p className="text-secondary">Loading fee structures...</p>
          ) : feeStructures.length === 0 ? (
            <p className="text-secondary mb-0">
              No fee structures found.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Fee Structure</th>
                    <th>Academic Year</th>
                    <th>Class</th>
                    <th>Total Amount</th>
                    <th>Installments</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {feeStructures.map((fee) => {
                    const totalAmount = (fee.components || []).reduce(
                      (total, component) => total + Number(component.amount || 0),
                      0
                    );

                    return (
                      <tr key={fee._id}>
                        <td>{fee.name}</td>
                        <td>{fee.academicYearId?.name || "-"}</td>
                        <td>{fee.classId?.name || "-"}</td>
                        <td>
                          ₹{totalAmount.toLocaleString("en-IN")}
                        </td>
                        <td>{fee.installments?.length || 0}</td>
                        <td>
                          <span
                            className={`badge ${
                              fee.status === "Active"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {fee.status}
                          </span>
                        </td>
                        <td>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-info text-white"
                                    onClick={() => handleViewFee(fee._id)}
                                >
                                    <i className="bi bi-eye"></i> View
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleEditFee(fee._id)}
                                >
                                    <i className="bi bi-pencil"></i> Edit
                                </button>

                                <button
                                    type="button"
                                    className={`btn btn-sm ${
                                        fee.status === "Active" ? "btn-danger" : "btn-success"
                                    }`}
                                    onClick={() => handleToggleFeeStatus(fee)}
                                >
                                    {fee.status === "Active" ? "Deactivate" : "Activate"}
                                </button>
                            </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="d-flex justify-content-between align-items-center mt-3">
                  <div>
                      Showing {feeStructures.length} of {pagination.total} records
                      (Page {pagination.page} of {pagination.totalPages})
                  </div>

                  <div className="d-flex gap-2">
                      <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          disabled={pagination.page <= 1}
                          onClick={() =>
                              setPagination((prev) => ({
                                  ...prev,
                                  page: prev.page - 1,
                              }))
                          }
                      >
                          Previous
                      </button>

                      <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          disabled={pagination.page >= pagination.totalPages}
                          onClick={() =>
                              setPagination((prev) => ({
                                  ...prev,
                                  page: prev.page + 1,
                              }))
                          }
                      >
                          Next
                      </button>
                  </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
