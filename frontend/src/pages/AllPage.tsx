import { useEffect, useMemo, useState } from "react";
import ProjectCard from "../components/all/ProjectCard";
import SingleCard from "../components/all/SingleCard";
import { deleteProject, listProjects, toggleStep, type ProjectSummary } from "../services/projects";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";

type ProjectGroup = {
  key: string;
  label: string;
  dday: string;
  urgencyClass: string;
  projects: ProjectSummary[];
};

function getDday(due: string | null) {
  if (!due) return { label: "마감 없음", dday: "마감 없음", urgencyClass: "bg-fa text-mu" };

  const today = new Date();
  const dueDate = new Date(`${due}T00:00:00`);
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.ceil((dueDate.getTime() - todayDate.getTime()) / 86_400_000);

  const dday = diff === 0 ? "D-Day" : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
  const urgencyClass =
    diff <= 0 ? "bg-red-300 text-red-900"
    : diff <= 7 ? "bg-orange-200 text-orange-900"
    : "bg-fa text-tx2 border border-bd";

  return { label: due, dday, urgencyClass };
}

function groupProjects(projects: ProjectSummary[]) {
  const sorted = [...projects].sort((a, b) => {
    const ad = a.due ?? "9999-12-31";
    const bd = b.due ?? "9999-12-31";
    if (ad !== bd) return ad < bd ? -1 : 1;
    if (a.isSingle !== b.isSingle) return a.isSingle ? 1 : -1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const groups = new Map<string, ProjectGroup>();

  for (const project of sorted) {
    const key = project.due ?? "no-due";
    const meta = getDday(project.due);
    const group = groups.get(key) ?? {
      key,
      label: meta.label,
      dday: meta.dday,
      urgencyClass: meta.urgencyClass,
      projects: [],
    };
    group.projects.push(project);
    groups.set(key, group);
  }

  return [...groups.values()];
}

export default function AllPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"ongoing" | "completed">("ongoing");

  async function loadProjects() {
    setStatus("loading");
    setError("");
    try {
      setProjects(await listProjects());
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "목록을 불러오지 못했어요.");
      setStatus("error");
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  const ongoingProjects = useMemo(() => projects.filter((p) => p.progress < 100), [projects]);
  const completedProjects = useMemo(() => projects.filter((p) => p.progress >= 100), [projects]);
  const groups = useMemo(() => groupProjects(tab === "ongoing" ? ongoingProjects : completedProjects), [tab, ongoingProjects, completedProjects]);
  const ongoing = ongoingProjects.length;
  const completed = completedProjects.length;

  async function handleToggle(stepId: string, done: boolean) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.firstStepId !== stepId) return p;
        const doneCount = done ? 1 : 0;
        return { ...p, doneCount, progress: done ? 100 : 0, nextStep: done ? null : { id: stepId, title: p.title, estimatedMinutes: null } };
      }),
    );
    try {
      await toggleStep(stepId, done);
    } catch {
      void loadProjects();
    }
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("이 프로젝트를 삭제할까요?");
    if (!ok) return;
    await deleteProject(id);
    setProjects((current) => current.filter((project) => project.id !== id));
  }

  if (status === "loading") {
    return <LoadingState title="프로젝트를 불러오고 있어요" className="max-w-[720px]" />;
  }

  if (status === "error") {
    return (
      <div className="px-4 lg:px-8 py-16 max-w-[720px] mx-auto w-full text-center">
        <div className="text-lg font-black text-tx">목록을 불러오지 못했어요</div>
        <p className="mt-2 text-sm text-mu">{error}</p>
        <button type="button" onClick={() => void loadProjects()} className="mt-5 rounded-full bg-tx text-white px-4 py-2 text-sm font-black">
          다시 시도
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="px-4 lg:px-8 max-w-[720px] mx-auto w-full">
        <EmptyState emoji="📋" title="아직 할 일이 없어요" subtitle="홈에서 첫 번째 할 일을 만들어보세요" />
      </div>
    );
  }

  return (
    <div className="px-[18px] py-6 pb-24">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-tx tracking-[-0.3px] mb-3">나의 할 일</h1>
        <div className="inline-flex bg-fa rounded-[10px] p-[3px] gap-[3px]">
          {(["ongoing", "completed"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                "px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-all",
                tab === t ? "bg-sf text-tx shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-mu",
              ].join(" ")}
            >
              {t === "ongoing" ? "진행중" : "완료"} <span className={tab === t ? "text-ac-d" : "text-mu2"}>{t === "ongoing" ? ongoing : completed}</span>
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && (
        <EmptyState
          emoji={tab === "ongoing" ? "📋" : "🎉"}
          title={tab === "ongoing" ? "진행 중인 할 일이 없어요" : "아직 완료한 할 일이 없어요"}
        />
      )}
      <div className="space-y-7">
        {groups.map((group) => (
          <section key={group.key}>
            <div className="mb-3 flex items-center gap-2">
              <span className={["rounded-full px-2.5 py-1 text-[11px] font-black", group.urgencyClass].join(" ")}>
                {group.dday}
              </span>
              {group.key !== "no-due" && (
                <span className="text-xs font-bold text-mu">{group.label}</span>
              )}
            </div>
            <div className="grid gap-[14px] xl:grid-cols-2 2xl:grid-cols-3 items-start">
              {group.projects.map((project) =>
                project.isSingle ? (
                  <SingleCard key={project.id} project={project} onDelete={handleDelete} onToggle={handleToggle} />
                ) : (
                  <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
                ),
              )}
            </div>
          </section>
        ))}
      </div>

    </div>
  );
}
