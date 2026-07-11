"use client";

import { useState, useTransition } from "react";
import {
  addPhase,
  deletePhase,
  renamePhase,
  reorderPhases,
  setPhaseStatus,
} from "@/app/actions/phases";
import { addTask, cycleTaskStatus, deleteTask } from "@/app/actions/tasks";
import { useToast } from "@/components/toast";
import { SuggestPhases } from "@/components/suggest-phases";
import type { Phase, Task } from "@/lib/types";

const PHASE_STATUS_LABEL: Record<Phase["status"], string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
};

export function PhasesPanel({
  projectId,
  initialPhases,
  initialTasks,
  readOnly = false,
}: {
  projectId: string;
  initialPhases: Phase[];
  initialTasks: Task[];
  readOnly?: boolean;
}) {
  const [phases, setPhases] = useState<Phase[]>(initialPhases);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newPhaseTitle, setNewPhaseTitle] = useState("");
  const [, startTransition] = useTransition();
  const toast = useToast();

  const unphasedTasks = tasks.filter(
    (t) => !t.phase_id || !phases.some((p) => p.id === t.phase_id),
  );

  function handleAddPhase() {
    const title = newPhaseTitle.trim();
    if (!title) return;
    setNewPhaseTitle("");
    startTransition(async () => {
      const result = await addPhase(projectId, title);
      if (!result.ok) {
        toast(result.error, "error");
        setNewPhaseTitle(title);
        return;
      }
      setPhases((list) => [...list, result.phase]);
    });
  }

  function move(phaseId: string, dir: -1 | 1) {
    const idx = phases.findIndex((p) => p.id === phaseId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= phases.length) return;
    const next = [...phases];
    [next[idx], next[target]] = [next[target], next[idx]];
    setPhases(next);
    startTransition(async () => {
      const result = await reorderPhases(
        projectId,
        next.map((p) => p.id),
      );
      if (!result.ok) toast(result.error, "error");
    });
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-faint">
        Phases
      </h2>

      {phases.length === 0 && (
        <p className="mb-3 rounded-xl border border-dashed border-line bg-card px-4 py-6 text-center text-sm text-faint">
          {readOnly
            ? "No phases."
            : "Add your first phase to give this project a shape."}
        </p>
      )}

      <ul className="space-y-3">
        {phases.map((phase, i) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            index={i}
            count={phases.length}
            readOnly={readOnly}
            tasks={tasks.filter((t) => t.phase_id === phase.id)}
            projectId={projectId}
            onMove={move}
            onRename={(title) =>
              setPhases((list) =>
                list.map((p) => (p.id === phase.id ? { ...p, title } : p)),
              )
            }
            onStatus={(status) =>
              setPhases((list) =>
                list.map((p) => (p.id === phase.id ? { ...p, status } : p)),
              )
            }
            onDelete={() => {
              setPhases((list) => list.filter((p) => p.id !== phase.id));
              setTasks((list) =>
                list.map((t) =>
                  t.phase_id === phase.id ? { ...t, phase_id: null } : t,
                ),
              );
            }}
            onTaskAdd={(task) => setTasks((list) => [...list, task])}
            onTaskStatus={(taskId, status) =>
              setTasks((list) =>
                list.map((t) => (t.id === taskId ? { ...t, status } : t)),
              )
            }
            onTaskDelete={(taskId) =>
              setTasks((list) => list.filter((t) => t.id !== taskId))
            }
          />
        ))}
      </ul>

      {unphasedTasks.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-card p-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-faint">
            Unassigned tasks
          </p>
          <ul className="space-y-1">
            {unphasedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                readOnly={readOnly}
                onStatus={(status) =>
                  setTasks((list) =>
                    list.map((t) => (t.id === task.id ? { ...t, status } : t)),
                  )
                }
                onDelete={() =>
                  setTasks((list) => list.filter((t) => t.id !== task.id))
                }
              />
            ))}
          </ul>
        </div>
      )}

      {!readOnly && (
        <div className="mt-3 flex gap-2">
          <input
            value={newPhaseTitle}
            onChange={(e) => setNewPhaseTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddPhase()}
            placeholder="New phase title…"
            className="min-h-11 flex-1 rounded-xl border border-line bg-card px-3.5 py-2 text-[15px] outline-none focus:border-moss"
          />
          <button
            onClick={handleAddPhase}
            disabled={!newPhaseTitle.trim()}
            className="min-h-11 rounded-xl border border-moss/30 px-4 text-sm font-medium text-moss transition-colors hover:bg-moss-soft disabled:opacity-40"
          >
            Add phase
          </button>
          <SuggestPhases
            projectId={projectId}
            onApplied={(newPhases, newTasks) => {
              setPhases((list) => [...list, ...newPhases]);
              setTasks((list) => [...list, ...newTasks]);
            }}
          />
        </div>
      )}
    </section>
  );
}

function PhaseCard({
  phase,
  index,
  count,
  tasks,
  projectId,
  readOnly = false,
  onMove,
  onRename,
  onStatus,
  onDelete,
  onTaskAdd,
  onTaskStatus,
  onTaskDelete,
}: {
  phase: Phase;
  index: number;
  count: number;
  tasks: Task[];
  projectId: string;
  readOnly?: boolean;
  onMove: (phaseId: string, dir: -1 | 1) => void;
  onRename: (title: string) => void;
  onStatus: (status: Phase["status"]) => void;
  onDelete: () => void;
  onTaskAdd: (task: Task) => void;
  onTaskStatus: (taskId: string, status: Task["status"]) => void;
  onTaskDelete: (taskId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(phase.title);
  const [newTask, setNewTask] = useState("");
  const [, startTransition] = useTransition();
  const toast = useToast();

  const done = tasks.filter((t) => t.status === "done").length;

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === phase.title) {
      setTitle(phase.title);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await renamePhase(phase.id, trimmed);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      onRename(trimmed);
      setEditing(false);
    });
  }

  function handleAddTask() {
    const t = newTask.trim();
    if (!t) return;
    setNewTask("");
    startTransition(async () => {
      const result = await addTask(projectId, phase.id, t);
      if (!result.ok) {
        toast(result.error, "error");
        setNewTask(t);
        return;
      }
      onTaskAdd(result.task);
    });
  }

  return (
    <li className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="font-display text-sm font-semibold text-faint">
          {index + 1}
        </span>
        {readOnly ? (
          <span className="min-w-0 flex-1 truncate font-display text-[15px] font-semibold">
            {phase.title}
          </span>
        ) : editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && saveTitle()}
            className="min-w-0 flex-1 rounded-md border border-moss bg-card px-2 py-1 text-[15px] outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 truncate text-left font-display text-[15px] font-semibold"
            title="Rename phase"
          >
            {phase.title}
          </button>
        )}
        {readOnly ? (
          <span className="rounded-md border border-line bg-paper px-1.5 py-1 font-mono text-[10px] uppercase tracking-wider text-faint">
            {PHASE_STATUS_LABEL[phase.status]}
          </span>
        ) : (
        <select
          value={phase.status}
          aria-label="Phase status"
          onChange={(e) => {
            const status = e.target.value as Phase["status"];
            startTransition(async () => {
              const result = await setPhaseStatus(phase.id, status);
              if (!result.ok) toast(result.error, "error");
              else onStatus(status);
            });
          }}
          className="rounded-md border border-line bg-paper px-1.5 py-1 font-mono text-[10px] uppercase tracking-wider outline-none"
        >
          {(Object.keys(PHASE_STATUS_LABEL) as Phase["status"][]).map((s) => (
            <option key={s} value={s}>
              {PHASE_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        )}
        {!readOnly && (
        <div className="flex shrink-0">
          <IconButton
            label="Move phase up"
            disabled={index === 0}
            onClick={() => onMove(phase.id, -1)}
          >
            ↑
          </IconButton>
          <IconButton
            label="Move phase down"
            disabled={index === count - 1}
            onClick={() => onMove(phase.id, 1)}
          >
            ↓
          </IconButton>
          <IconButton
            label="Delete phase"
            onClick={() => {
              if (!confirm(`Delete phase "${phase.title}"? Its tasks move to Unassigned.`))
                return;
              startTransition(async () => {
                const result = await deletePhase(phase.id);
                if (!result.ok) toast(result.error, "error");
                else onDelete();
              });
            }}
          >
            ✕
          </IconButton>
        </div>
        )}
      </div>

      {tasks.length > 0 && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-faint/80">
          {done}/{tasks.length} tasks done
        </p>
      )}

      <ul className="mt-2 space-y-1">
        {tasks.length === 0 && (
          <li className="px-1 py-1 text-sm text-faint/70 italic">
            No tasks yet
          </li>
        )}
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            readOnly={readOnly}
            onStatus={(status) => onTaskStatus(task.id, status)}
            onDelete={() => onTaskDelete(task.id)}
          />
        ))}
      </ul>

      {!readOnly && (
      <div className="mt-2 flex gap-2">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          placeholder="Add a task…"
          className="min-h-10 flex-1 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm outline-none focus:border-moss"
        />
        <button
          onClick={handleAddTask}
          disabled={!newTask.trim()}
          className="min-h-10 rounded-lg px-3 text-sm text-moss hover:bg-moss-soft disabled:opacity-40"
        >
          Add
        </button>
      </div>
      )}
    </li>
  );
}

function TaskRow({
  task,
  readOnly = false,
  onStatus,
  onDelete,
}: {
  task: Task;
  readOnly?: boolean;
  onStatus: (status: Task["status"]) => void;
  onDelete: () => void;
}) {
  const [, startTransition] = useTransition();
  const toast = useToast();

  const marker = `flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors ${
    task.status === "done"
      ? "border-moss bg-moss text-white"
      : task.status === "doing"
        ? "border-gold bg-gold-soft text-gold"
        : "border-line bg-card text-transparent"
  }`;
  const glyph =
    task.status === "done" ? "✓" : task.status === "doing" ? "›" : "·";

  return (
    <li className="group flex min-h-11 items-center gap-2.5 rounded-lg px-1 hover:bg-paper">
      {readOnly ? (
        <span aria-label={`Task status: ${task.status}`} className={marker}>
          {glyph}
        </span>
      ) : (
      <button
        aria-label={`Task status: ${task.status}. Tap to advance.`}
        onClick={() =>
          startTransition(async () => {
            const result = await cycleTaskStatus(task.id, task.status);
            if (!result.ok) toast(result.error, "error");
            else if (result.status) onStatus(result.status);
          })
        }
        className={marker}
      >
        {glyph}
      </button>
      )}
      <span
        className={`min-w-0 flex-1 truncate text-[15px] ${
          task.status === "done" ? "text-faint line-through" : ""
        }`}
      >
        {task.title}
      </span>
      {task.status === "doing" && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-gold">
          doing
        </span>
      )}
      {!readOnly && (
        <button
          aria-label="Delete task"
          onClick={() =>
            startTransition(async () => {
              const result = await deleteTask(task.id);
              if (!result.ok) toast(result.error, "error");
              else onDelete();
            })
          }
          className="px-1.5 py-1 text-faint/50 opacity-0 transition-opacity hover:text-clay group-hover:opacity-100"
        >
          ✕
        </button>
      )}
    </li>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md text-sm text-faint transition-colors hover:bg-paper hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}
