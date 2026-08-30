import React, { createContext, useContext, useState } from 'react';
import { BUDGET_CAPTURED, PROJECTS, type Deliverable, type Project, type Task } from '../mockData/s08';

type Ctx = {
  projects: Project[];
  addProject: (p: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  addTask: (projectId: string, t: Task) => void;
  updateTask: (projectId: string, taskId: string, patch: Partial<Task>) => void;
  addDeliverable: (projectId: string, dv: Deliverable) => void;
  updateDeliverable: (projectId: string, dId: string, patch: Partial<Deliverable>) => void;
  addTeamMember: (projectId: string, personId: string, projectRole: string) => void;

  /** WF-S08-01 / Step 2 — unresolved: approval at initiation, or registration only */
  approvalAtInitiation: boolean;
  setApprovalAtInitiation: (v: boolean) => void;

  /** §S8.4 — whether budget is captured at all, per country */
  budgetCaptured: (country: string) => boolean;

  /** simulated C2 Actions Inbox items raised by task assignment */
  inbox: { taskId: string; assigneeId: string; description: string; project: string; raised: string }[];
};

const C = createContext<Ctx | null>(null);
export const useS08 = () => {
  const c = useContext(C);
  if (!c) throw new Error('S08Provider missing');
  return c;
};

/** Items that block completion — each one named on the screen. */
export const outstandingForCompletion = (p: Project) => {
  const out: string[] = [];
  p.deliverables.filter((d) => d.status !== 'Complete').forEach((d) => out.push(`Deliverable: ${d.description}`));
  p.tasks.filter((t) => t.status !== 'Complete').forEach((t) => out.push(`Task: ${t.description}`));
  return out;
};

export function S08Provider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => JSON.parse(JSON.stringify(PROJECTS)));
  const [approvalAtInitiation, setApprovalAtInitiation] = useState(false);
  const [inbox, setInbox] = useState<Ctx['inbox']>([]);

  const patchProject = (id: string, patch: Partial<Project>) =>
    setProjects((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const value: Ctx = {
    projects,
    addProject: (p) => setProjects((prev) => [p, ...prev]),
    updateProject: patchProject,
    addTask: (projectId, t) => {
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, tasks: [...p.tasks, t] } : p)));
      const proj = projects.find((p) => p.id === projectId);
      setInbox((prev) => [
        { taskId: t.id, assigneeId: t.assigneeId, description: t.description, project: proj?.name ?? projectId, raised: '19-Aug-2026' },
        ...prev,
      ]);
    },
    updateTask: (projectId, taskId, patch) =>
      setProjects((prev) => prev.map((p) => (p.id === projectId
        ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)) }
        : p))),
    addDeliverable: (projectId, dv) =>
      setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, deliverables: [...p.deliverables, dv] } : p))),
    updateDeliverable: (projectId, dId, patch) =>
      setProjects((prev) => prev.map((p) => (p.id === projectId
        ? { ...p, deliverables: p.deliverables.map((d) => (d.id === dId ? { ...d, ...patch } : d)) }
        : p))),
    addTeamMember: (projectId, personId, projectRole) =>
      setProjects((prev) => prev.map((p) => (p.id === projectId
        ? { ...p, team: p.team.some((m) => m.personId === personId) ? p.team : [...p.team, { personId, projectRole }] }
        : p))),
    approvalAtInitiation,
    setApprovalAtInitiation,
    budgetCaptured: (country) => BUDGET_CAPTURED[country] ?? false,
    inbox,
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}
