import { Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudySetup from "./pages/StudySetup";
import Dashboard from "./pages/Dashboard";
import Syllabus from "./pages/Syllabus";
import Timetable from "./pages/Timetable";
import Quiz from "./pages/Quiz";
import Profile from "./pages/Profile";
import Layout from "./components/Layout";

function App() {
  return (
    <Routes>
      {/* PUBLIC AUTH & LANDING */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/study-setup" element={<StudySetup />} />

      {/* DASHBOARD SAAS APP WITH PERSISTENT SIDEBAR & NAVBAR */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/syllabus" element={<Syllabus />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default App;