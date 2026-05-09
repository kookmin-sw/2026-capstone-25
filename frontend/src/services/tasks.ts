// 저장된 작업 mock — 백엔드 /api/projects 구현 전까지 localStorage 기반

const STORAGE_KEY = "hanbaljjak.tasks.v1";

export type Task = {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  isSingle: boolean;
  done: boolean;
  createdAt: number;
};

export type NewTaskInput = Omit<Task, "id" | "createdAt" | "done">;

export function listTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch {
    return [];
  }
}

export function addTask(input: NewTaskInput): Task {
  const task: Task = {
    ...input,
    id: crypto.randomUUID(),
    done: false,
    createdAt: Date.now(),
  };
  const all = listTasks();
  all.push(task);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return task;
}

export function setTaskDone(id: string, done: boolean): void {
  const all = listTasks().map((t) => (t.id === id ? { ...t, done } : t));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
