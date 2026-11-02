import React, { useEffect, useState } from "react";
import api from "./services/api";
import * as XLSX from "xlsx";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function FeeCollectionDashboard({ user, onBack }) {
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYearWiseCollections, setAcademicYearWiseCollections] = useState([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    async function loadAcademicYears() {
      try {
        setLoading(true);
        const response = await api.get("/academic-years");

        const years = response.data.data || [];
        setAcademicYears(years);

        const activeYear = years.find(
          (year) => year.status === "Active"
        );

        if (activeYear) {
          setAcademicYearId(activeYear._id);
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Unable to load academic years."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAcademicYears();
    loadAcademicYearWiseCollections();
  }, []);

  async function loadDashboardData(selectedYearId) {
    if (!selectedYearId) {
        setDashboardData(null);
        return;
    }

    try {
        setDashboardLoading(true);
        setError("");

        const response = await api.get(
        `/dashboard/fee-collection?academicYearId=${selectedYearId}`
        );

        setDashboardData(response.data.data);
    } catch (err) {
        setDashboardData(null);
        setError(
        err.response?.data?.message ||
        "Unable to load Fee Collection Dashboard data."
        );
    } finally {
        setDashboardLoading(false);
    }
  }

  const loadAcademicYearWiseCollections = async () => {
    try {
        const response = await api.get("/dashboard/academic-year-wise");

        setAcademicYearWiseCollections(response.data.data || []);
    } catch (error) {
        console.error("Unable to load academic-year-wise collections:", error);
    }
  };

  const exportToExcel = () => {
    if (!dashboardData) {
        alert("Dashboard data is not available.");
        return;
    }

    // Sheet 1: Financial Summary
    const summaryData = [
        ["Metric", "Amount"],
        ["Academic Year", academicYears.find(
        (year) => year._id === academicYearId
        )?.name || ""],
        ["Total Fees Assigned", dashboardData.totalAssigned],
        ["Total Fees Collected", dashboardData.totalCollected],
        ["Outstanding Fees", dashboardData.totalOutstanding],
        ["Collection Percentage", `${dashboardData.collectionPercentage}%`],
        ["Total Concessions", dashboardData.totalConcessions],
    ];

    // Sheet 2: Monthly Fee Collection
    const monthlyData = [
        ["Month", "Year", "Fees Collected"],
        ...dashboardData.monthlyCollections.map((item) => [
        item.month,
        item.year,
        item.totalCollected,
        ]),
    ];

    // Sheet 3: Class-wise Fee Collection
    const classData = [
        ["Class", "Fees Assigned", "Fees Collected", "Outstanding", "Collection %"],
        ...dashboardData.classWiseCollections.map((item) => [
        item.className,
        item.totalAssigned,
        item.totalCollected,
        item.totalOutstanding,
        `${item.collectionPercentage}%`,
        ]),
    ];

    // Sheet 4: Academic-year-wise Fee Collection
    const academicYearData = [
        ["Academic Year", "Fees Assigned", "Fees Collected", "Outstanding", "Collection %"],
        ...academicYearWiseCollections.map((item) => [
        item.academicYear,
        item.totalAssigned,
        item.totalCollected,
        item.totalOutstanding,
        `${item.collectionPercentage}%`,
        ]),
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(summaryData),
        "Financial Summary"
    );

    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(monthlyData),
        "Monthly Collection"
    );

    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(classData),
        "Class-wise Collection"
    );

    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(academicYearData),
        "Academic Year Collection"
    );

    XLSX.writeFile(
        workbook,
        `Fee_Collection_Report_${academicYearId}.xlsx`
    );
  };

  useEffect(() => {
    if (academicYearId) {
        loadDashboardData(academicYearId);
    }
  }, [academicYearId]);

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Fee Collection Dashboard</h2>
          <p className="text-secondary mb-0">
            Monitor fee assignments, collections and outstanding balances.
          </p>
        </div>

        <div className="d-flex gap-2">
            <button
                className="btn btn-success"
                onClick={exportToExcel}
                disabled={!dashboardData || dashboardLoading}
            >
                <i className="bi bi-file-earmark-excel me-2"></i>
                Export to Excel
            </button>

            <button
                className="btn btn-outline-secondary"
                onClick={onBack}
            >
                Back
            </button>
        </div>
        </div>

      {loading ? (
        <p>Loading academic years...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="row mb-4">
          <div className="col-md-4">
            <label className="form-label fw-semibold">
              Select Academic Year
            </label>

            <select
              className="form-select"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
            >
              <option value="">Select Academic Year</option>

              {academicYears.map((year) => (
                <option key={year._id} value={year._id}>
                  {year.name} ({year.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
            {dashboardLoading && (
        <div className="text-center py-4">
          Loading dashboard data...
        </div>
      )}

      {!dashboardLoading && dashboardData && (
        <div className="row g-3 mt-2">
          <div className="col-md-6 col-xl-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-secondary">Total Fees Assigned</h6>
                <h3>₹{dashboardData.totalAssigned.toLocaleString("en-IN")}</h3>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-secondary">Total Fees Collected</h6>
                <h3 className="text-success">
                  ₹{dashboardData.totalCollected.toLocaleString("en-IN")}
                </h3>
              </div>
            </div>
          </div>

          <div className="col-md-6 col-xl-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-secondary">Outstanding Fees</h6>
                <h3 className="text-danger">
                  ₹{dashboardData.totalOutstanding.toLocaleString("en-IN")}
                </h3>
              </div>
            </div>
          </div>


          <div className="col-md-6 col-xl-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="text-secondary">Total Concessions</h6>
                <h3>
                  ₹{dashboardData.totalConcessions.toLocaleString("en-IN")}
                </h3>
              </div>
            </div>
          </div>


          <div className="col-12">
            <div className="card shadow-sm">
                <div className="card-body">
                <h6 className="fw-semibold mb-3">Collection Percentage</h6>

                <h3 className="text-success mb-2">
                    {dashboardData.collectionPercentage}%
                </h3>

                <div
                    className="progress"
                    style={{ height: "12px" }}
                    role="progressbar"
                    aria-valuenow={dashboardData.collectionPercentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                >
                    <div
                    className="progress-bar bg-success"
                    style={{
                        width: `${Math.min(dashboardData.collectionPercentage, 100)}%`,
                    }}
                    />
                </div>

                <small className="text-secondary d-block mt-2">
                    ₹{dashboardData.totalCollected.toLocaleString("en-IN")} collected
                    out of ₹{dashboardData.totalAssigned.toLocaleString("en-IN")} assigned.
                </small>
                </div>
            </div>
            </div>



        </div>
      )}

            {!dashboardLoading && dashboardData && (
                <div className="card shadow-sm mt-4">
                <div className="card-body">
                    <h5 className="fw-semibold mb-4">
                    Monthly Fee Collection
                    </h5>

                    <div style={{ width: "100%", height: 350 }}>
                    <ResponsiveContainer>
                        <BarChart data={dashboardData.monthlyCollections}>
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            dataKey="month"
                            tickFormatter={(month, index) => {
                            const item = dashboardData.monthlyCollections[index];
                            return `${month} ${item.year}`;
                            }}
                        />

                        <YAxis
                            tickFormatter={(value) =>
                            `₹${value.toLocaleString("en-IN")}`
                            }
                        />

                        <Tooltip
                            formatter={(value) =>
                            `₹${Number(value).toLocaleString("en-IN")}`
                            }
                            labelFormatter={(label, payload) =>
                            payload?.[0]?.payload
                                ? `${label} ${payload[0].payload.year}`
                                : label
                            }
                        />

                        <Bar
                            dataKey="totalCollected"
                            name="Fees Collected"
                            fill="#198754"
                            radius={[5, 5, 0, 0]}
                        />
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                </div>
                </div>
            )}

            {!dashboardLoading && dashboardData && (
                <div className="card shadow-sm mt-4">
                    <div className="card-body">
                    <h5 className="fw-semibold mb-4">
                        Class-wise Fee Collection
                    </h5>

                    <div className="table-responsive">
                        <table className="table table-bordered table-hover align-middle">
                        <thead className="table-light">
                            <tr>
                            <th>Class</th>
                            <th className="text-end">Fees Assigned</th>
                            <th className="text-end">Fees Collected</th>
                            <th className="text-end">Outstanding</th>
                            <th className="text-end">Collection %</th>
                            </tr>
                        </thead>

                        <tbody>
                            {dashboardData.classWiseCollections.map((item) => (
                            <tr key={item.classId}>
                                <td className="fw-semibold">{item.className}</td>
                                <td className="text-end">
                                ₹{item.totalAssigned.toLocaleString("en-IN")}
                                </td>
                                <td className="text-end text-success">
                                ₹{item.totalCollected.toLocaleString("en-IN")}
                                </td>
                                <td className="text-end text-danger">
                                ₹{item.totalOutstanding.toLocaleString("en-IN")}
                                </td>
                                <td className="text-end">
                                {item.collectionPercentage.toFixed(2)}%
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                    </div>
                </div>
                )}

                {!loading && academicYearWiseCollections.length > 0 && (
                    <div className="card shadow-sm mt-4">
                        <div className="card-body">
                        <h5 className="fw-semibold mb-4">
                            Academic-year-wise Fee Collection
                        </h5>

                        <div className="table-responsive">
                            <table className="table table-bordered table-hover align-middle">
                            <thead className="table-light">
                                <tr>
                                <th>Academic Year</th>
                                <th className="text-end">Fees Assigned</th>
                                <th className="text-end">Fees Collected</th>
                                <th className="text-end">Outstanding</th>
                                <th className="text-end">Collection %</th>
                                </tr>
                            </thead>

                            <tbody>
                                {academicYearWiseCollections.map((item) => (
                                <tr key={item.academicYearId}>
                                    <td className="fw-semibold">{item.academicYear}</td>
                                    <td className="text-end">
                                    ₹{item.totalAssigned.toLocaleString("en-IN")}
                                    </td>
                                    <td className="text-end text-success">
                                    ₹{item.totalCollected.toLocaleString("en-IN")}
                                    </td>
                                    <td className="text-end text-danger">
                                    ₹{item.totalOutstanding.toLocaleString("en-IN")}
                                    </td>
                                    <td className="text-end">
                                    {item.collectionPercentage.toFixed(2)}%
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

export default FeeCollectionDashboard;