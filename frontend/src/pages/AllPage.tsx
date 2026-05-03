import { useEffect, useMemo, useState } from "react";
import ProjectCard from "../components/all/ProjectCard";
import SingleCard from "../components/all/SingleCard";
import { deleteProject, listProjects, type ProjectSummary } from "../services/projects";

// 전체 탭 목록 모드.
// DB 프로젝트를 마감일별로 묶고, 빈 상태/로딩/에러 상태를 함께 관리한다.
type ProjectGroup = {
  key: string;
  label: string;
  dday: string;
  urgencyClass: string;
  projects: ProjectSummary[];
};

function getDday(due: string | null) {
  if (!due) return { label: "마감 X", dday: "마감 X", urgencyClass: "bg-tx text-white" };

  const today = new Date();
  const dueDate = new Date(`${due}T00:00:00`);
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.ceil((dueDate.getTime() - todayDate.getTime()) / 86_400_000);

  const dday = diff === 0 ? "D-Day" : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
  const urgencyClass =
    diff < 0 || diff <= 1 ? "bg-red-600 text-white" : diff <= 7 ? "bg-ac text-white" : "bg-tx text-white";

  return { label: due, dday, urgencyClass };
}

function groupProjects(projects: ProjectSummary[]) {
  const sorted = [...projects].sort((a, b) => {
    const ad = a.due ?? "9999-12-31";
    const bd = b.due ?? "9999-12-31";
    if (ad !== bd) return ad < bd ? -1 : 1;
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

  const groups = useMemo(() => groupProjects(projects), [projects]);
  const ongoing = projects.filter((project) => project.progress < 100).length;
  const completed = projects.length - ongoing;

  async function handleDelete(id: string) {
    const ok = window.confirm("이 프로젝트를 삭제할까요?");
    if (!ok) return;

    await deleteProject(id);
    setProjects((current) => current.filter((project) => project.id !== id));
  }

  if (status === "loading") {
    return (
      <div className="px-4 lg:px-8 py-16 max-w-[720px] mx-auto w-full text-center">
        <div className="text-sm font-bold text-mu">프로젝트를 불러오고 있어요</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="px-4 lg:px-8 py-16 max-w-[720px] mx-auto w-full text-center">
        <div className="text-lg font-black text-tx">목록을 불러오지 못했어요</div>
        <p className="mt-2 text-sm text-mu">{error}</p>
        <button
          type="button"
          onClick={() => void loadProjects()}
          className="mt-5 rounded-full bg-tx text-white px-4 py-2 text-sm font-black"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="px-4 lg:px-8 py-16 max-w-[720px] mx-auto w-full text-center">
        <div className="text-5xl mb-4">📋</div>
        <div className="text-lg font-bold text-tx mb-2">아직 할 일이 없어요</div>
        <div className="text-sm text-mu">홈에서 첫 번째 할 일을 만들어보세요</div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-8 py-6 max-w-[960px] 2xl:max-w-[1200px] mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-xl font-black text-tx mb-2">나의 할 일</h1>
        <div className="flex gap-4 text-xs text-mu">
          <span>
            진행중 <span className="font-black text-tx2">{ongoing}</span>
          </span>
          <span>
            완료 <span className="font-black text-tx2">{completed}</span>
          </span>
        </div>
      </div>

      <div className="space-y-7">
        {groups.map((group) => (
          <section key={group.key}>
            <div className="mb-3 flex items-center gap-2">
              <span className={["rounded-full px-2.5 py-1 text-[11px] font-black", group.urgencyClass].join(" ")}>
                {group.dday}
              </span>
              <span className="text-xs font-bold text-mu">{group.label}</span>
            </div>
            <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
              {group.projects.map((project) =>
                project.isSingle ? (
                  <SingleCard key={project.id} project={project} onDelete={handleDelete} />
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
