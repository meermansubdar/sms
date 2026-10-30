
import { Routes, Route } from "react-router-dom";
import AuthGate from "./auth/AuthGate";
import StudentProfile from "./StudentProfile";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthGate />} />
      <Route
        path="/students/:studentId"
        element={<AuthGate />}
      />
    </Routes>
  );
}
