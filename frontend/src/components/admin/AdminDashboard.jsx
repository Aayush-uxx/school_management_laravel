import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import { DAYS, PERIODS } from "../../utils/scheduleConstants";

const AdminDashboard = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("teachers");
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: "", code: "" });

  const [showGradeForm, setShowGradeForm] = useState(false);
  const [newGrade, setNewGrade] = useState({ grade: "", section: "A" });

  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [gradeTimetable, setGradeTimetable] = useState([]);
  const [gradeLoading, setGradeLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedGradeId) fetchGradeTimetable(selectedGradeId);
  }, [selectedGradeId]);

  const fetchData = async () => {
    const [teachersRes, subjectsRes, gradesRes, leavesRes] =
      await Promise.allSettled([
        API.get("/teachers"),
        API.get("/subjects"),
        API.get("/grades"),
        API.get("/leaves"),
      ]);
    if (teachersRes.status === "fulfilled")
      setTeachers(teachersRes.value.data.teachers);
    if (subjectsRes.status === "fulfilled")
      setSubjects(subjectsRes.value.data.subjects);
    if (gradesRes.status === "fulfilled")
      setGrades(gradesRes.value.data.grades);
    if (leavesRes.status === "fulfilled")
      setLeaves(leavesRes.value.data.leaves);
    setLoading(false);
  };

  const fetchGradeTimetable = async (gradeId) => {
    setGradeLoading(true);
    try {
      const res = await API.get(`/timetable/grade/${gradeId}`);
      setGradeTimetable(res.data.timetable);
    } finally {
      setGradeLoading(false);
    }
  };
  const toggleCurriculum = async (grade, subjectId) => {
    const current = grade.subjects.map((s) => s.id);
    const updated = current.includes(subjectId)
      ? current.filter((id) => id !== subjectId)
      : [...current, subjectId];

    if (updated.length === 0) {
      alert("A grade needs at least one subject");
      return;
    }

    await API.put(`/grades/${grade.id}/subjects`, { subject_ids: updated });
    fetchData();
  };

  const getSlot = (dayName, periodId) => {
    const dayKey = dayName.toLowerCase();
    return gradeTimetable.find(
      (t) => t.day === dayKey && t.period === periodId
    );
  };

  const deleteTeacher = async (id) => {
    if (window.confirm("Remove this teacher?")) {
      await API.delete(`/teachers/${id}`);
      fetchData();
      if (selectedGradeId) fetchGradeTimetable(selectedGradeId);
    }
  };

  const addSubject = async () => {
    await API.post("/subjects", newSubject);
    setShowSubjectForm(false);
    setNewSubject({ name: "", code: "" });
    fetchData();
  };

  const deleteSubject = async (id) => {
    if (window.confirm("Delete subject?")) {
      await API.delete(`/subjects/${id}`);
      fetchData();
    }
  };

  const addGrade = async () => {
    await API.post("/grades", {
      grade: parseInt(newGrade.grade),
      section: newGrade.section,
    });
    setShowGradeForm(false);
    setNewGrade({ grade: "", section: "A" });
    fetchData();
  };

  const deleteGrade = async (id) => {
    if (window.confirm("Delete grade?")) {
      await API.delete(`/grades/${id}`);
      fetchData();
    }
  };

  const handleLeaveAction = async (id, action) => {
    await API.put(`/leaves/${id}/${action}`);
    fetchData();
  };

  if (loading) return <div style={{ padding: "20px" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Arial" }}>
      <div
        style={{
          width: "220px",
          background: "#2c3e50",
          color: "white",
          padding: "20px",
        }}
      >
        <h3>Scheduler Admin</h3>
        <hr style={{ margin: "15px 0", borderColor: "#34495e" }} />
        {["teachers", "subjects", "grades", "timetable", "leaves"].map(
          (tab) => (
            <p
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                cursor: "pointer",
                padding: "10px",
                textTransform: "capitalize",
                background: activeTab === tab ? "#34495e" : "",
                borderRadius: "4px",
              }}
            >
              {tab}
            </p>
          )
        )}
        <button
          onClick={logout}
          style={{
            width: "100%",
            marginTop: "20px",
            padding: "10px",
            background: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          flex: 1,
          padding: "30px",
          background: "#f4f7f6",
          overflowY: "auto",
        }}
      >
        {activeTab === "teachers" && (
          <div>
            <h2>Manage Teachers</h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "white",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <thead style={{ background: "#3498db", color: "white" }}>
                <tr>
                  <th style={{ padding: "12px" }}>Name</th>
                  <th style={{ padding: "12px" }}>Email</th>
                  <th style={{ padding: "12px" }}>Assignments</th>
                  <th style={{ padding: "12px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {t.name}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {t.email}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {t.assignments
                        .map(
                          (a) =>
                            `${a.subject.name} (Grade ${a.grade.grade} ${a.grade.section})`
                        )
                        .join(", ") || "-"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <button
                        onClick={() => deleteTeacher(t.id)}
                        style={{
                          background: "#e74c3c",
                          color: "white",
                          border: "none",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "subjects" && (
          <div>
            <h2>Manage Subjects</h2>
            <button
              onClick={() => setShowSubjectForm(!showSubjectForm)}
              style={{ marginBottom: "15px", padding: "8px 16px" }}
            >
              {showSubjectForm ? "Cancel" : "+ Add Subject"}
            </button>
            {showSubjectForm && (
              <div
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                }}
              >
                <input
                  placeholder="Name"
                  value={newSubject.name}
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, name: e.target.value })
                  }
                  style={{ marginRight: "10px", padding: "8px" }}
                />
                <input
                  placeholder="Code"
                  value={newSubject.code}
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, code: e.target.value })
                  }
                  style={{ marginRight: "10px", padding: "8px" }}
                />
                <button
                  onClick={addSubject}
                  style={{
                    padding: "8px 16px",
                    background: "#2ecc71",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                  }}
                >
                  Add
                </button>
              </div>
            )}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "white",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <thead style={{ background: "#3498db", color: "white" }}>
                <tr>
                  <th style={{ padding: "12px" }}>Name</th>
                  <th style={{ padding: "12px" }}>Code</th>
                  <th style={{ padding: "12px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {s.name}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {s.code}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <button
                        onClick={() => deleteSubject(s.id)}
                        style={{
                          background: "#e74c3c",
                          color: "white",
                          border: "none",
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "grades" && (
          <div>
            <h2>Manage Grades</h2>
            <button
              onClick={() => setShowGradeForm(!showGradeForm)}
              style={{ marginBottom: "15px", padding: "8px 16px" }}
            >
              {showGradeForm ? "Cancel" : "+ Add Grade"}
            </button>
            {showGradeForm && (
              <div
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                }}
              >
                <input
                  type="number"
                  placeholder="Grade number"
                  value={newGrade.grade}
                  onChange={(e) =>
                    setNewGrade({ ...newGrade, grade: e.target.value })
                  }
                  style={{ marginRight: "10px", padding: "8px" }}
                />
                <select
                  value={newGrade.section}
                  onChange={(e) =>
                    setNewGrade({ ...newGrade, section: e.target.value })
                  }
                  style={{ marginRight: "10px", padding: "8px" }}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
                <button
                  onClick={addGrade}
                  style={{
                    padding: "8px 16px",
                    background: "#2ecc71",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                  }}
                >
                  Add
                </button>
              </div>
            )}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "white",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <thead style={{ background: "#3498db", color: "white" }}>
                <tr>
                  <th style={{ padding: "12px" }}>Grade</th>
                  <th style={{ padding: "12px" }}>Section</th>
                  <th style={{ padding: "12px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <div key={g.id} className="curriculum-block">
                    <div className="curriculum-title">
                      Grade {g.grade} {g.section} — Subjects taught
                    </div>
                    <div className="curriculum-checkboxes">
                      {subjects.map((s) => (
                        <label key={s.id} className="assign-checkbox">
                          <input
                            type="checkbox"
                            checked={g.subjects.some((gs) => gs.id === s.id)}
                            onChange={() => toggleCurriculum(g, s.id)}
                          />
                          {s.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "timetable" && (
          <div>
            <h2>Timetable</h2>
            <select
              value={selectedGradeId}
              onChange={(e) => setSelectedGradeId(e.target.value)}
              style={{ padding: "8px", marginBottom: "20px" }}
            >
              <option value="">Select Grade</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  Grade {g.grade} {g.section}
                </option>
              ))}
            </select>

            {selectedGradeId && !gradeLoading && (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "white",
                }}
              >
                <thead>
                  <tr style={{ background: "#2c3e50", color: "white" }}>
                    <th style={{ padding: "12px", border: "1px solid #ddd" }}>
                      Day/Period
                    </th>
                    {PERIODS.map((p) => (
                      <th
                        key={p.id}
                        style={{ padding: "12px", border: "1px solid #ddd" }}
                      >
                        {p.isBreak ? "Break" : p.name}
                        <br />
                        <small>{p.time}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day}>
                      <td
                        style={{
                          padding: "12px",
                          border: "1px solid #ddd",
                          fontWeight: "bold",
                        }}
                      >
                        {day}
                      </td>
                      {PERIODS.map((period) => {
                        if (period.isBreak)
                          return (
                            <td
                              key={period.id}
                              style={{
                                padding: "12px",
                                border: "1px solid #ddd",
                                color: "#999",
                              }}
                            >
                              Break
                            </td>
                          );
                        const slot = getSlot(day, period.id);
                        return (
                          <td
                            key={period.id}
                            style={{
                              padding: "12px",
                              border: "1px solid #ddd",
                            }}
                          >
                            <div
                              style={{ fontWeight: "bold", color: "#2980b9" }}
                            >
                              {slot?.subject || "-"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#7f8c8d" }}>
                              {slot?.teacher?.name || "-"}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "leaves" && (
          <div>
            <h2>Manage Leaves</h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "white",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <thead style={{ background: "#f39c12", color: "white" }}>
                <tr>
                  <th style={{ padding: "12px" }}>Teacher</th>
                  <th style={{ padding: "12px" }}>Date</th>
                  <th style={{ padding: "12px" }}>Reason</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {l.teacher?.name}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {l.date}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {l.reason}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {l.status}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {l.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleLeaveAction(l.id, "approve")}
                            style={{
                              background: "#27ae60",
                              color: "white",
                              border: "none",
                              padding: "4px 8px",
                              marginRight: "5px",
                              borderRadius: "4px",
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleLeaveAction(l.id, "reject")}
                            style={{
                              background: "#e74c3c",
                              color: "white",
                              border: "none",
                              padding: "4px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            Reject
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
  );
};

export default AdminDashboard;
