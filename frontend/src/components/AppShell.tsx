import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, Calendar, ClipboardList, Timer, User, type LucideIcon } from "lucide-react";
import Header from "./Header";
import { getTodayMinutes } from "../services/timer";

type Tab = { to: string; label: string; icon: LucideIcon; end?: boolean };

const tabs: Tab[] = [
  { to: "/", label: "홈", icon: Home, end: true },
  { to: "/calendar", label: "일정", icon: Calendar },
  { to: "/all", label: "전체", icon: ClipboardList },
  { to: "/report", label: "리포트", icon: Timer },
  { to: "/me", label: "나", icon: User },
];

// 데스크탑 사이드바(.nav + .nb @ ≥1024px) — 프로토타입과 동일
function sidebarItemClass(isActive: boolean) {
  return [
    "flex flex-row items-center gap-[14px] w-full",
    "px-4 py-[13px] rounded-xl",
    "text-sm font-bold tracking-[-0.1px]",
    "transition-colors duration-200",
    isActive ? "bg-ac-s text-ac-d" : "text-mu hover:bg-fa",
  ].join(" ");
}

// 모바일 하단 네비(.nb @ <1024px) — 프로토타입과 동일
function bottomNavItemClass(isActive: boolean) {
  return [
    "flex flex-col items-center justify-center gap-1",
    "py-1.5 rounded-xl",
    "text-[10px] font-semibold tracking-[0.1px]",
    "transition-colors duration-200",
    isActive ? "text-ac" : "text-mu",
  ].join(" ");
}

export default function AppShell() {
  const location = useLocation();
  const [todayMinutes, setTodayMinutes] = useState(0);

  // 라우트가 바뀔 때마다 오늘 집중 시간을 새로 조회한다 (타이머 완료 후 복귀 시 갱신)
  useEffect(() => {
    getTodayMinutes().then(setTodayMinutes).catch(() => {});
  }, [location.pathname]);

  return (
    // 프로토타입의 #phone — 모바일은 column, 데스크탑(≥1024px)은 row.
    // 페이지 콘텐츠 배경은 body(index.css)에서 책임지므로 shell 에서는 지정하지 않는다.
    <div className="min-h-screen lg:flex lg:flex-row text-tx">
      {/* ── 좌측 사이드바(.nav 데스크탑 변형) ── */}
      <aside
        className={[
          "hidden lg:flex lg:flex-col",
          "lg:w-[248px] lg:shrink-0 lg:h-screen",
          "lg:bg-sf lg:border-r lg:border-bd",
          "lg:px-[14px] lg:py-7 lg:gap-1",
        ].join(" ")}
        aria-label="기본 탭"
      >
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => sidebarItemClass(isActive)}
          >
            {/* 데스크탑 아이콘 22px */}
            <Icon size={22} aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </aside>

      {/* ── 메인 컬럼 — 헤더 + 페이지 콘텐츠 ──
       * pb 는 모바일에서 fixed 네비에 가려지지 않도록 네비 높이만큼 비워둔다. */}
      <div className="flex-1 flex flex-col min-h-screen lg:h-screen lg:min-h-0 lg:overflow-hidden pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-0">
        <Header todayMinutes={todayMinutes} />
        <main className="flex-1 lg:overflow-auto">
          <div className="w-full max-w-[900px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── 모바일 하단 네비(.nav 모바일 변형) ──
       * fixed 가 이미 positioning 컨텍스트를 만들므로 before:absolute 의 기준이 된다.
       * 별도 relative 를 추가하면 fixed 가 덮여 뷰포트 고정이 풀리고
       * 문서 흐름 하단으로 떨어져 스크롤해야만 보인다. */}
      <nav
        className={[
          "lg:hidden fixed bottom-0 inset-x-0 z-10",
          "bg-sf grid grid-cols-5",
          // iOS 노치 안전영역 고려 — 하단 패딩 = max(20px, safe-area + 12px)
          "px-2 pt-2.5 pb-[max(20px,calc(env(safe-area-inset-bottom)+12px))]",
          // 상단 그라디언트 1px 보더 — .nav::before 와 동일
          "before:content-[''] before:absolute before:left-[22px] before:right-[22px] before:top-0 before:h-px",
          "before:bg-[linear-gradient(90deg,transparent,var(--color-bd)_30%,var(--color-bd)_70%,transparent)]",
        ].join(" ")}
        aria-label="기본 탭"
      >
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => bottomNavItemClass(isActive)}
          >
            {/* 모바일 아이콘 24px */}
            <Icon size={24} aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
