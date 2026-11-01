import React, { useEffect, useState } from "react";
import api from "./services/api";

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

        <button
          className="btn btn-outline-secondary"
          onClick={onBack}
        >
          Back
        </button>
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

    </div>
  );
}

export default FeeCollectionDashboard;