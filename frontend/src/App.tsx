import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "./components/AppShell";

// 각 탭의 placeholder
function HomePage() {
  return <h1 className="p-6 text-2xl font-bold">홈</h1>;
}
function CalendarPage() {
  return <h1 className="p-6 text-2xl font-bold">일정</h1>;
}
function AllPage() {
  return <h1 className="p-6 text-2xl font-bold">전체</h1>;
}
function ReportPage() {
  return <h1 className="p-6 text-2xl font-bold">리포트</h1>;
}
function MePage() {
  return <h1 className="p-6 text-2xl font-bold">나</h1>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/all" element={<AllPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/me" element={<MePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
