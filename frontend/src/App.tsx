import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell";
import SessionGuard from "./components/SessionGuard";
import HomePage from "./pages/HomePage";
import AllPage from "./pages/AllPage";
import LoginPage from "./pages/LoginPage";
import MePage from "./pages/MePage";
import ResultPage from "./pages/ResultPage";

// 각 탭의 placeholder
function CalendarPage() {
  return <h1 className="p-6 text-2xl font-bold">일정</h1>;
}
function ReportPage() {
  return <h1 className="p-6 text-2xl font-bold">리포트</h1>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <SessionGuard>
              <AppShell />
            </SessionGuard>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/all" element={<AllPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/me" element={<MePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
