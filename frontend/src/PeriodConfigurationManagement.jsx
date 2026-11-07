import { useCallback, useEffect, useState } from "react";
import api from "./services/api";

const emptyPeriod = {
  periodNumber: "",
  name: "",
  startTime: "",
  endTime: "",
  type: "Teaching"
};

function PeriodSchedule({
  title,
  scheduleType,
  periods,
  canManage,
  onAdd,
  onUpdate,
  onRemove
}) {
  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">{title}</h5>

        {canManage && (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => onAdd(scheduleType)}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Add Period
          </button>
        )}
      </div>

      <div className="card-body">
        {periods.length === 0 ? (
          <p className="text-muted mb-0">
            No periods configured.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Period No.</th>
                  <th>Name</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Type</th>
                  {canManage && <th>Action</th>}
                </tr>
              </thead>

              <tbody>
                {periods.map((period, index) => (
                  <tr key={`${scheduleType}-${index}`}>
                    <td>{period.periodNumber}</td>

                    <td>
                      {canManage ? (
                        <input
                          type="text"
                          className="form-control"
                          value={period.name}
                          onChange={(e) =>
                            onUpdate(scheduleType, index, "name", e.target.value)
                          }
                        />
                      ) : period.name}
                    </td>

                    <td>
                      {canManage ? (
                        <input
                          type="time"
                          className="form-control"
                          value={period.startTime}
                          onChange={(e) =>
                            onUpdate(scheduleType, index, "startTime", e.target.value)
                          }
                        />
                      ) : period.startTime}
                    </td>

                    <td>
                      {canManage ? (
                        <input
                          type="time"
                          className="form-control"
                          value={period.endTime}
                          onChange={(e) =>
                            onUpdate(scheduleType, index, "endTime", e.target.value)
                          }
                        />
                      ) : period.endTime}
                    </td>

                    <td>
                      {canManage ? (
                        <select
                          className="form-select"
                          value={period.type}
                          onChange={(e) =>
                            onUpdate(scheduleType, index, "type", e.target.value)
                          }
                        >
                          <option value="Teaching">Teaching</option>
                          <option value="Break">Break</option>
                        </select>
                      ) : period.type}
                    </td>

                    {canManage && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => onRemove(scheduleType, index)}
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PeriodConfigurationManagement({ user, onBack }) {
  const canManage = ["Administrator", "Principal"].includes(user?.role);


  const [academicYears, setAcademicYears] = useState([]);
  const [configurations, setConfigurations] = useState([]);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");

      const selectedAcademicYear = academicYears.find(
        (year) => year._id === selectedAcademicYearId
    );

  const canManageSelectedYear =
    canManage &&
    selectedAcademicYear?.status === "Active" &&
    (!configurations[0] || configurations[0].status === "Active");


  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [workingDays, setWorkingDays] = useState([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ]);

    const availableDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  const handleWorkingDayChange = (day) => {
    setWorkingDays((previousDays) =>
      previousDays.includes(day)
        ? previousDays.filter((item) => item !== day)
        : [...previousDays, day]
    );
  };

    const addPeriod = (scheduleType) => {
    const setPeriods =
      scheduleType === "weekday"
        ? setWeekdayPeriods
        : setSaturdayPeriods;

    setPeriods((previousPeriods) => [
      ...previousPeriods,
      {
        ...emptyPeriod,
        periodNumber: previousPeriods.length + 1
      }
    ]);
  };

    const updatePeriod = (scheduleType, index, field, value) => {
    const setPeriods =
      scheduleType === "weekday"
        ? setWeekdayPeriods
        : setSaturdayPeriods;

    setPeriods((previousPeriods) =>
      previousPeriods.map((period, i) =>
        i === index
          ? { ...period, [field]: value }
          : period
      )
    );
  };

    const removePeriod = (scheduleType, index) => {
    const setPeriods =
      scheduleType === "weekday"
        ? setWeekdayPeriods
        : setSaturdayPeriods;

    setPeriods((previousPeriods) =>
      previousPeriods
        .filter((_, i) => i !== index)
        .map((period, i) => ({
          ...period,
          periodNumber: i + 1
        }))
    );
  };

  const [weekdayPeriods, setWeekdayPeriods] = useState([]);
  const [saturdayPeriods, setSaturdayPeriods] = useState([]);
    const loadAcademicYears = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/academic-years");

        const years = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data.data)
                ? response.data.data
                : response.data.academicYears || [];

      setAcademicYears(years);

      if (years.length > 0) {
        setSelectedAcademicYearId(years[0]._id);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load Academic Years."
      );
    }
  }, []);

    const loadConfigurations = useCallback(async (academicYearId) => {
    if (!academicYearId) {
      setConfigurations([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get("/period-configurations", {
        params: {
          academicYearId
        }
      });

        const records = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data.data)
            ? response.data.data
            : response.data.configurations || [];

      setConfigurations(records);

            if (records.length > 0) {
                const configuration = records[0];

                setWorkingDays(configuration.workingDays || []);
                setWeekdayPeriods(configuration.weekdayPeriods || []);
                setSaturdayPeriods(configuration.saturdayPeriods || []);
            } else {
                setWorkingDays([
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday"
                ]);

                setWeekdayPeriods([]);
                setSaturdayPeriods([]);
            }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load Period Configurations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

    const saveConfiguration = async () => {
        setError("");
        setSuccess("");
    if (!selectedAcademicYearId) {
      setError("Please select an Academic Year.");
      return;
    }

    if (workingDays.length === 0) {
      setError("Please select at least one working day.");
      return;
    }

    if (weekdayPeriods.length === 0 || saturdayPeriods.length === 0) {
      setError("Please configure at least one weekday and Saturday period.");
      return;
    }

    const cleanPeriods = (periods) =>
        periods.map(({ _id, ...period }) => period);

    const configurationData = {
        academicYearId: selectedAcademicYearId,
        workingDays,
        weekdayPeriods: cleanPeriods(weekdayPeriods),
        saturdayPeriods: cleanPeriods(saturdayPeriods)
    };

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (configurations.length > 0) {
        await api.patch(
          `/period-configurations/${configurations[0]._id}`,
            {
                workingDays,
                weekdayPeriods: cleanPeriods(weekdayPeriods),
                saturdayPeriods: cleanPeriods(saturdayPeriods)
            }
        );
      } else {
        await api.post(
          "/period-configurations",
          configurationData
        );
      }

      setSuccess("Period Configuration saved successfully.");

      await loadConfigurations(selectedAcademicYearId);
    } catch (err) {
        const responseData = err.response?.data;

        if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
            setError(
            responseData.errors
                .map((item) => item.message)
                .join(" ")
            );
        } else {
            setError(
            responseData?.message ||
            "Unable to save Period Configuration."
            );
        }
    } finally {
      setSaving(false);
    }
  };

    const handleStatusChange = async () => {
    if (configurations.length === 0) {
      return;
    }

    const configuration = configurations[0];

    const newStatus =
      configuration.status === "Active" ? "Inactive" : "Active";

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.patch(
        `/period-configurations/${configuration._id}`,
        { status: newStatus }
      );

      setSuccess(`Period Configuration ${newStatus} successfully.`);

      await loadConfigurations(selectedAcademicYearId);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to change Period Configuration status."
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadConfigurations(selectedAcademicYearId);
  }, [selectedAcademicYearId, loadConfigurations]);

  useEffect(() => {
    loadAcademicYears();
  }, [loadAcademicYears]);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="mb-1">Period Configuration Management</h2>
          <p className="text-muted mb-0">
            Configure weekday and Saturday periods for each academic year.
          </p>
        </div>

        <div>
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
      </div>

      <div className="card shadow-sm">
        <div className="card-body">


          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">
                Academic Year
              </label>

              <select
                className="form-select"
                value={selectedAcademicYearId}
                onChange={(e) =>
                  setSelectedAcademicYearId(e.target.value)
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
          </div>

                    <hr />

                    <h5 className="mb-3">Working Days</h5>

                    <div className="d-flex flex-wrap gap-4 mb-3">
                        {availableDays.map((day) => (
                        <div className="form-check" key={day}>
                            <input
                            className="form-check-input"
                            type="checkbox"
                            id={`working-day-${day}`}
                            checked={workingDays.includes(day)}
                            onChange={() => handleWorkingDayChange(day)}
                            />

                            <label
                            className="form-check-label"
                            htmlFor={`working-day-${day}`}
                            >
                            {day}
                            </label>
                        </div>
                        ))}
                    </div>

                    <hr />

                    <PeriodSchedule
                        title="Monday to Friday Period Configuration"
                        scheduleType="weekday"
                        periods={weekdayPeriods}
                        canManage={canManageSelectedYear}
                        onAdd={addPeriod}
                        onUpdate={updatePeriod}
                        onRemove={removePeriod}
                    />

                    <PeriodSchedule
                        title="Saturday Period Configuration"
                        scheduleType="saturday"
                        periods={saturdayPeriods}
                        canManage={canManageSelectedYear}
                        onAdd={addPeriod}
                        onUpdate={updatePeriod}
                        onRemove={removePeriod}
                    />

                    {configurations.length > 0 && (
                        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                            <div>
                                <strong>Configuration Status: </strong>

                                <span
                                className={`badge ${
                                    configurations[0].status === "Active"
                                    ? "bg-success"
                                    : "bg-secondary"
                                }`}
                                >
                                {configurations[0].status}
                                </span>
                            </div>

                        {canManage && selectedAcademicYear?.status === "Active" && configurations.length > 0 && (
                            <button
                            type="button"
                            className={`btn btn-sm ${
                                configurations[0].status === "Active"
                                ? "btn-outline-danger"
                                : "btn-outline-success"
                            }`}
                            onClick={handleStatusChange}
                            disabled={saving || loading}
                            >
                            {configurations[0].status === "Active"
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                        )}
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success">
                        {success}
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-danger">
                        {error}
                        </div>
                    )}

                    {loading && (
                        <div className="text-center my-3">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        </div>
                    )}

                    {canManageSelectedYear && (
                        <div className="d-flex justify-content-end">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={saveConfiguration}
                            disabled={saving || loading || !selectedAcademicYearId}
                        >
                            {saving ? "Saving..." : "Save Configuration"}
                        </button>
                        </div>
                    )}

          {academicYears.length === 0 && !error && (
            <div className="alert alert-info mb-0">
              No Academic Years are available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}