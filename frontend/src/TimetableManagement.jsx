import { useEffect, useState } from "react";
import api from "./services/api";

export default function TimetableManagement({ user, onBack, canManage }) {

      const [academicYears, setAcademicYears] = useState([]);
      const [selectedAcademicYearId, setSelectedAcademicYearId] = useState("");
      const [loadingAcademicYears, setLoadingAcademicYears] = useState(false);
      const [error, setError] = useState("");

      const [sections, setSections] = useState([]);
      const [selectedSectionId, setSelectedSectionId] = useState("");
      const [loadingSections, setLoadingSections] = useState(false);     
      
      const [subjects, setSubjects] = useState([]);
      const [selectedSubjectId, setSelectedSubjectId] = useState("");
      const [loadingSubjects, setLoadingSubjects] = useState(false);

      const [workingDays, setWorkingDays] = useState([]);
      const [selectedDay, setSelectedDay] = useState("");
      
      const [filterSectionId, setFilterSectionId] = useState("");
      const [filterDay, setFilterDay] = useState("");

      const [periodConfiguration, setPeriodConfiguration] = useState(null);
      const [loadingPeriodConfiguration, setLoadingPeriodConfiguration] = useState(false);

      const [availablePeriods, setAvailablePeriods] = useState([]);
      const [selectedPeriodNumber, setSelectedPeriodNumber] = useState("");

      const [eligibleTeachers, setEligibleTeachers] = useState([]);
      const [selectedTeacherId, setSelectedTeacherId] = useState("");
      const [loadingTeachers, setLoadingTeachers] = useState(false);
      const [roomNumber, setRoomNumber] = useState("");

      const getPeriodTime = (entry) => {
        if (!periodConfiguration) {
            return "-";
        }

        const periods =
            entry.day === "Saturday"
            ? periodConfiguration.saturdayPeriods || []
            : periodConfiguration.weekdayPeriods || [];

        const period = periods.find(
            (item) =>
            item.periodNumber === entry.periodNumber &&
            item.type === "Teaching"
        );

        if (!period) {
            return "-";
        }

        return `${period.startTime} - ${period.endTime}`;
      };

      const [saving, setSaving] = useState(false);
      const [successMessage, setSuccessMessage] = useState("");

      const [timetableEntries, setTimetableEntries] = useState([]);
      const [loadingTimetable, setLoadingTimetable] = useState(false);

      const [editingTimetableId, setEditingTimetableId] = useState("");
      const [deletingTimetableId, setDeletingTimetableId] = useState("");

      const handleEditTimetable = (entry) => {
        setEditingTimetableId(entry._id);

        setSelectedAcademicYearId(entry.academicYearId?._id || "");
        setSelectedSectionId(entry.sectionId?._id || "");
        setSelectedSubjectId(entry.subjectId?._id || "");
        setSelectedDay(entry.day || "");
        setSelectedPeriodNumber(String(entry.periodNumber));
        setRoomNumber(entry.roomNumber || "");

        setSelectedTeacherId(entry.teacherId?._id || "");
        setSuccessMessage("");
        setError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
      };

      const handleCancelEdit = () => {
        setEditingTimetableId("");
        setSelectedSectionId("");
        setSelectedSubjectId("");
        setSelectedDay("");
        setSelectedPeriodNumber("");
        setSelectedTeacherId("");
        setRoomNumber("");
        setError("");
        setSuccessMessage("");
      };

      const handleDeleteTimetable = async (entryId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this timetable entry?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingTimetableId(entryId);
            setError("");
            setSuccessMessage("");

            await api.delete(`/timetables/${entryId}`);

            setTimetableEntries((previousEntries) =>
            previousEntries.filter(
                (entry) => entry._id !== entryId
            )
            );

            setSuccessMessage(
            "Timetable entry deleted successfully."
            );

            if (editingTimetableId === entryId) {
            handleCancelEdit();
            }
        } catch (err) {
            setError(
            err.response?.data?.message ||
            "Unable to delete timetable entry."
            );
        } finally {
            setDeletingTimetableId("");
        }
      };


      const handleSaveTimetable = async () => {
        if (
            !selectedAcademicYearId ||
            !selectedSectionId ||
            !selectedSubjectId ||
            !selectedDay ||
            !selectedPeriodNumber ||
            !selectedTeacherId
        ) {
            setError("Please complete all required fields.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccessMessage("");

            const payload = {
            academicYearId: selectedAcademicYearId,
            sectionId: selectedSectionId,
            day: selectedDay,
            periodNumber: Number(selectedPeriodNumber),
            subjectId: selectedSubjectId,
            teacherId: selectedTeacherId,
            roomNumber: roomNumber.trim(),
            };

            const response = editingTimetableId
            ? await api.put(`/timetables/${editingTimetableId}`, payload)
            : await api.post("/timetables", payload);

            setSuccessMessage(
            response.data.message ||
            "Timetable entry saved successfully."
            );

            setTimetableEntries((previousEntries) => {
            if (editingTimetableId) {
                return previousEntries.map((entry) =>
                entry._id === editingTimetableId
                    ? response.data.data
                    : entry
                );
            }

            return [...previousEntries, response.data.data];
            });

            // Exit editing mode
            setEditingTimetableId("");

            // Reset entry form
            setSelectedSectionId("");
            setSelectedSubjectId("");
            setSelectedDay("");
            setSelectedPeriodNumber("");
            setSelectedTeacherId("");
            setRoomNumber("");

            // Clear table filters to display all entries
            setFilterSectionId("");
            setFilterDay("");

        } catch (err) {
            setError(
            err.response?.data?.message ||
            "Unable to save timetable entry."
            );
        } finally {
            setSaving(false);
        }
      };


    useEffect(() => {
        async function loadAcademicYears() {
            try {
                setLoadingAcademicYears(true);
                setError("");

                const response = await api.get("/academic-years", {
                params: { status: "Active", limit: 100 },
                });

                const records = response.data.data || [];

                setAcademicYears(records);

                if (records.length > 0) {
                setSelectedAcademicYearId(records[0]._id);
                }
            } catch (err) {
                setError(
                err.response?.data?.message ||
                "Unable to load Academic Years."
                );
            } finally {
                setLoadingAcademicYears(false);
            }
        }

        loadAcademicYears();
    }, []);

    useEffect(() => {
    async function loadSections() {
        if (!selectedAcademicYearId) {
            setSections([]);
            setSelectedSectionId("");
            return;
        }

        try {
            setLoadingSections(true);
            setError("");

            const response = await api.get("/sections", {
            params: { status: "Active", limit: 100 },
            });

            const records = response.data.data || [];

            setSections(records);

            setSelectedSectionId((currentId) =>
            records.some((section) => section._id === currentId)
                ? currentId
                : ""
            );
        } catch (err) {
            setError(
            err.response?.data?.message ||
            "Unable to load Sections."
            );
        } finally {
            setLoadingSections(false);
        }
    }

    loadSections();
}, [selectedAcademicYearId]);

    useEffect(() => {
        async function loadSubjects() {
            try {
                setLoadingSubjects(true);
                setError("");

                const response = await api.get("/subjects", {
                params: { status: "Active", limit: 100 },
                });

                const records = response.data.data || [];

                setSubjects(records);
                setSelectedSubjectId("");
            } catch (err) {
                setError(
                err.response?.data?.message ||
                "Unable to load Subjects."
                );
            } finally {
                setLoadingSubjects(false);
            }
        }

        loadSubjects();
    }, []);

        useEffect(() => {
        async function loadPeriodConfiguration() {
            if (!selectedAcademicYearId) {
                setPeriodConfiguration(null);
                setWorkingDays([]);
                setSelectedDay("");
                return;
            }

            try {
                setLoadingPeriodConfiguration(true);
                setError("");

                const response = await api.get("/period-configurations", {
                params: { academicYearId: selectedAcademicYearId },
                });

                const records = response.data.data || [];
                const configuration = records[0] || null;

                setPeriodConfiguration(configuration);

                const configuredDays = configuration?.workingDays || [];

                setWorkingDays(configuredDays);

                setSelectedDay((currentDay) =>
                configuredDays.includes(currentDay)
                    ? currentDay
                    : ""
                );
            } catch (err) {
                setPeriodConfiguration(null);
                setWorkingDays([]);
                setSelectedDay("");

                setError(
                err.response?.data?.message ||
                "Unable to load Period Configuration."
                );
            } finally {
                setLoadingPeriodConfiguration(false);
            }
        }

        loadPeriodConfiguration();
    }, [selectedAcademicYearId]);

  useEffect(() => {
    if (!periodConfiguration || !selectedDay) {
      setAvailablePeriods([]);
      setSelectedPeriodNumber("");
      return;
    }

    const periods =
      selectedDay === "Saturday"
        ? periodConfiguration.saturdayPeriods || []
        : periodConfiguration.weekdayPeriods || [];

    const teachingPeriods = periods.filter(
      (period) => period.type === "Teaching"
    );

    setAvailablePeriods(teachingPeriods);

    setSelectedPeriodNumber((currentNumber) =>
    teachingPeriods.some(
        (period) => String(period.periodNumber) === currentNumber
    )
        ? currentNumber
        : ""
    );
  }, [periodConfiguration, selectedDay]);

  useEffect(() => {
    async function loadEligibleTeachers() {
      if (
        !selectedAcademicYearId ||
        !selectedSectionId ||
        !selectedSubjectId
      ) {
        setEligibleTeachers([]);
        setSelectedTeacherId("");
        return;
      }

      try {
        setLoadingTeachers(true);
        setError("");

        const response = await api.get("/teacher-assignments", {
          params: {
            academicYearId: selectedAcademicYearId,
            sectionId: selectedSectionId,
            status: "Active",
          },
        });

        const assignments = response.data.data || [];

        const matchingAssignments = assignments.filter(
          (assignment) =>
            assignment.subjectId?._id === selectedSubjectId
        );

        const teachers = matchingAssignments
          .map((assignment) => assignment.teacherId)
          .filter(
            (teacher, index, list) =>
              teacher &&
              list.findIndex(
                (item) => item._id === teacher._id
              ) === index
          );

        setEligibleTeachers(teachers);
        setSelectedTeacherId((currentId) =>
        teachers.some((teacher) => teacher._id === currentId)
            ? currentId
            : ""
        );
      } catch (err) {
        setEligibleTeachers([]);
        setSelectedTeacherId("");

        setError(
          err.response?.data?.message ||
          "Unable to load eligible Teachers."
        );
      } finally {
        setLoadingTeachers(false);
      }
    }

    loadEligibleTeachers();
  }, [
    selectedAcademicYearId,
    selectedSectionId,
    selectedSubjectId,
  ]);

  useEffect(() => {
    async function loadTimetableEntries() {
        if (!selectedAcademicYearId) {
        setTimetableEntries([]);
        return;
        }

        try {
        setLoadingTimetable(true);
        setError("");

        const response = await api.get("/timetables", {
            params: {
            academicYearId: selectedAcademicYearId,
                ...(filterSectionId && {
                sectionId: filterSectionId,
                }),
                ...(filterDay && {
                day: filterDay,
                }),
            },
        });

        console.log("Timetable API Response:", response.data.data);

        setTimetableEntries(response.data.data || []);
        } catch (err) {
        setTimetableEntries([]);

        setError(
            err.response?.data?.message ||
            "Unable to load timetable entries."
        );
        } finally {
        setLoadingTimetable(false);
        }
    }

    loadTimetableEntries();
  }, [
    selectedAcademicYearId,
    filterSectionId,
    filterDay,
  ]);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Timetable Management</h2>

        <button
          className="btn btn-secondary"
          onClick={onBack}
        >
          Back
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
            {successMessage}
        </div>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Academic Year
              </label>

              <select
                className="form-select"
                value={selectedAcademicYearId}
                onChange={(e) =>
                  setSelectedAcademicYearId(e.target.value)
                }
                disabled={loadingAcademicYears}
              >
                <option value="">
                  {loadingAcademicYears
                    ? "Loading Academic Years..."
                    : "Select Academic Year"}
                </option>

                {academicYears.map((year) => (
                  <option key={year._id} value={year._id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Section
              </label>

              <select
                className="form-select"
                value={selectedSectionId}
                onChange={(e) =>
                  setSelectedSectionId(e.target.value)
                }
                disabled={!selectedAcademicYearId || loadingSections}
              >
                <option value="">
                  {loadingSections
                    ? "Loading Sections..."
                    : "Select Section"}
                </option>

                {sections.map((section) => (
                  <option key={section._id} value={section._id}>
                    {section.classId?.name} - {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Subject
              </label>

              <select
                className="form-select"
                value={selectedSubjectId}
                onChange={(e) =>
                  setSelectedSubjectId(e.target.value)
                }
                disabled={loadingSubjects}
              >
                <option value="">
                  {loadingSubjects
                    ? "Loading Subjects..."
                    : "Select Subject"}
                </option>

                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Day
              </label>

              <select
                className="form-select"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                disabled={
                  loadingPeriodConfiguration ||
                  workingDays.length === 0
                }
              >
                <option value="">
                  {loadingPeriodConfiguration
                    ? "Loading Working Days..."
                    : "Select Day"}
                </option>

                {workingDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>

              {!loadingPeriodConfiguration &&
                workingDays.length === 0 && (
                  <small className="text-danger">
                    No working days configured for this Academic Year.
                  </small>
                )}
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Period
              </label>

              <select
                className="form-select"
                value={selectedPeriodNumber}
                onChange={(e) =>
                  setSelectedPeriodNumber(e.target.value)
                }
                disabled={!selectedDay || availablePeriods.length === 0}
              >
                <option value="">
                  {selectedDay
                    ? "Select Period"
                    : "Select Day First"}
                </option>

                {availablePeriods.map((period) => (
                  <option
                    key={period.periodNumber}
                    value={period.periodNumber}
                  >
                    Period {period.periodNumber} ({period.startTime} - {period.endTime})
                  </option>
                ))}
              </select>

              {selectedDay && availablePeriods.length === 0 && (
                <small className="text-danger">
                  No Teaching periods configured for this day.
                </small>
              )}
            </div>

            <div className="col-md-4">
              <label className="form-label fw-semibold">
                Teacher
              </label>

              <select
                className="form-select"
                value={selectedTeacherId}
                onChange={(e) =>
                  setSelectedTeacherId(e.target.value)
                }
                disabled={
                  !selectedSubjectId || loadingTeachers
                }
              >
                <option value="">
                  {loadingTeachers
                    ? "Loading Teachers..."
                    : "Select Teacher"}
                </option>

                {eligibleTeachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name}
                  </option>
                ))}
              </select>

              {!loadingTeachers &&
                selectedSubjectId &&
                eligibleTeachers.length === 0 && (
                  <small className="text-danger">
                    No active Teacher Assignment found for this selection.
                  </small>
                )}
            </div>

            <div className="col-md-4">
            <label className="form-label fw-semibold">
                Room Number (Optional)
            </label>

            <input
                type="text"
                className="form-control"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. Room 101 or Lab 2"
                maxLength={30}
            />
            </div>

          </div>
        

            <div className="mt-4">
                {canManage && (
                    <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveTimetable}
                    disabled={saving}
                    >
                    {saving
                        ? "Saving..."
                        : editingTimetableId
                            ? "Update Timetable"
                            : "Save Timetable"}
                    </button>
                )}

                {editingTimetableId && (
                    <button
                        type="button"
                        className="btn btn-secondary ms-2"
                        onClick={handleCancelEdit}
                        disabled={saving}
                    >
                        Cancel Edit
                    </button>
                )}

            </div>
        </div>

      </div>

      <div className="card shadow-sm">
        <div className="card-body">
            <h5 className="card-title mb-3">
            Timetable Entries
            </h5>
            
            <div className="row g-3 mb-3">
                <div className="col-md-6">
                    <label className="form-label">Filter by Section</label>
                    <select
                    className="form-select"
                    value={filterSectionId}
                    onChange={(e) => setFilterSectionId(e.target.value)}
                    >
                    <option value="">All Sections</option>
                    {sections.map((section) => (
                        <option key={section._id} value={section._id}>
                        {section.classId?.name} - {section.name}
                        </option>
                    ))}
                    </select>
                </div>

                <div className="col-md-6">
                    <label className="form-label">Filter by Day</label>
                    <select
                    className="form-select"
                    value={filterDay}
                    onChange={(e) => setFilterDay(e.target.value)}
                    >
                    <option value="">All Days</option>
                    {workingDays.map((day) => (
                        <option key={day} value={day}>
                        {day}
                        </option>
                    ))}
                    </select>
                </div>
            </div>

            {loadingTimetable && (
                <div className="text-center py-3">
                    <div
                    className="spinner-border text-primary"
                    role="status"
                    >
                    <span className="visually-hidden">
                        Loading...
                    </span>
                    </div>
                    <p className="mt-2 mb-0">
                    Loading timetable entries...
                    </p>
                </div>
            )}

            {!loadingTimetable && timetableEntries.length === 0 && (
                <div className="alert alert-info mb-0">
                    No timetable entries found for the selected filters.
                </div>
            )}

            {!loadingTimetable && timetableEntries.length > 0 && (
                <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle">
                    <thead className="table-light">
                        <tr>
                        <th>Day</th>
                        <th>Period</th>
                        <th>Time</th>
                        <th>Class</th>
                        <th>Section</th>
                        <th>Subject</th>
                        <th>Teacher</th>
                        <th>Room</th>
                        <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {timetableEntries.map((entry) => (
                        <tr key={entry._id}>
                            <td>{entry.day}</td>
                            <td>{entry.periodNumber}</td>
                            <td>
                            {getPeriodTime(entry)}
                            </td>
                            <td>
                            {entry.sectionId?.classId?.name || "-"}
                            </td>
                            <td>
                            {entry.sectionId?.name || "-"}
                            </td>
                            <td>
                            {entry.subjectId?.name || "-"}
                            </td>
                            <td>
                            {entry.teacherId?.name || "-"}
                            </td>
                            <td>{entry.roomNumber || "-"}</td>
                            <td>
                                {canManage && (
                                    <>
                                        <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => handleEditTimetable(entry)}
                                        >
                                        Edit
                                        </button>

                                        <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger ms-2"
                                        onClick={() => handleDeleteTimetable(entry._id)}
                                        disabled={deletingTimetableId === entry._id}
                                        >
                                        {deletingTimetableId === entry._id
                                            ? "Deleting..."
                                            : "Delete"}
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            )}
            
        </div>
      </div>
    </div>
  );
}