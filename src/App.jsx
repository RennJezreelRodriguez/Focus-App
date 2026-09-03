import React from 'react';
import InstallPrompt from './InstallPrompt.jsx';
import BackupReminder from './BackupReminder.jsx';

// ==========================================================================
// 1. Helpers & Timezone-Safe Date Storage Setup (Patched Version)
// ==========================================================================
if (!window.storage) {
  window.storage = {
    async get(key) {
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
    },
    async set(key, value) {
      localStorage.setItem(key, value);
    }
  };
}

const CATEGORIES = ["Growth", "Health", "Finance", "Craft", "Other"];
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function uid() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  if (window.crypto && window.crypto.getRandomValues) {
    return 'id_' + Array.from(window.crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
  }
  return "id_" + Math.random().toString(36).slice(2, 10);
}

// Fixed: Date Key using UTC components to prevent local shifting/midnight DST anomalies
function formatDateKey(dateObj) {
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayKey() {
  return formatDateKey(new Date());
}

function isActionScheduledForDay(action, dayIndex) {
  if (!action.scheduleType || action.scheduleType === "daily") return true;
  return Array.isArray(action.days) && action.days.includes(dayIndex);
}

function formatScheduleLabel(action) {
  if (!action.scheduleType || action.scheduleType === "daily") return "Daily";
  if (!action.days || action.days.length === 0) return "No days";
  if (action.days.length === 7) return "Daily";
  return action.days.map(i => DAYS_OF_WEEK[i]).join(", ");
}

// Fixed: Included a strict iteration counter to completely prevent browser freezes
function calculateStreak(goal) {
  const today = new Date();
  let streak = 0;
  let checkDate = new Date(today);
  let daysChecked = 0;

  while (daysChecked < 365) {
    daysChecked++;
    const key = formatDateKey(checkDate);
    const dayIndex = checkDate.getDay();
    const scheduledActions = goal.actions.filter(a => isActionScheduledForDay(a, dayIndex));

    if (scheduledActions.length === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    const dayHistory = goal.history[key] || {};
    const allDone = scheduledActions.every(a => (dayHistory[a.id] || 0) >= a.target);

    if (allDone) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      if (key === getTodayKey()) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return streak;
}

function isStreakLitToday(goal) {
  const todayKey = getTodayKey();
  const todayDayIndex = new Date().getDay();
  const scheduled = goal.actions.filter(a => isActionScheduledForDay(a, todayDayIndex));

  if (scheduled.length === 0) return true;

  const dayHistory = goal.history[todayKey] || {};
  return scheduled.every(a => (dayHistory[a.id] || 0) >= a.target);
}

function calculateWeeklyRate(goal) {
  const now = new Date();
  let totalScheduled = 0;
  let totalCompleted = 0;

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() - i);
    const key = formatDateKey(checkDate);
    const dayIndex = checkDate.getDay();

    const scheduled = goal.actions.filter(a => isActionScheduledForDay(a, dayIndex));
    const dayHistory = goal.history[key] || {};

    scheduled.forEach(a => {
      totalScheduled++;
      if ((dayHistory[a.id] || 0) >= a.target) {
        totalCompleted++;
      }
    });
  }

  if (totalScheduled === 0) return 100;
  return Math.round((totalCompleted / totalScheduled) * 100);
}

function SymbolButton({ symbol, label, onClick, hasBadge }) {
  return (
    <div className="icon-btn-wrapper" data-tooltip={label}>
      <button className="icon-btn" onClick={onClick} type="button">
        {symbol}
        {hasBadge && <span className="dot-badge" />}
      </button>
    </div>
  );
}

function StreakDisplay({ count, isLit }) {
  return (
    <span className={`streak-badge ${isLit ? "lit" : "unlit"}`} title={isLit ? "Streak maintained for today!" : "Complete today's actions to light up streak"}>
      🔥 {count}d
    </span>
  );
}

function GoalProgressBar({ completed, total }) {
  if (total === 0) {
    return (
      <div className="goal-progress-inline">
        <div className="goal-progress-track">
          <div className="goal-progress-fill" style={{ width: "0%" }} />
        </div>
        <span className="goal-progress-label">Nothing scheduled today</span>
      </div>
    );
  }

  const pct = Math.round((completed / total) * 100);

  return (
    <div className="goal-progress-inline">
      <div className="goal-progress-track">
        <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="goal-progress-label">{completed}/{total} today ({pct}%)</span>
    </div>
  );
}

// ==========================================================================
// 2. Modals (Goal Settings, Action Modal, Keyboard Help)
// ==========================================================================
function GoalModal({ initialGoal, onSave, onArchive, onDelete, onClose }) {
  const isEdit = !!initialGoal;
  const [title, setTitle] = React.useState(initialGoal?.title || "");
  const [category, setCategory] = React.useState(initialGoal?.category || CATEGORIES[0]);

  function submit() {
    if (!title.trim()) return;
    onSave({
      id: initialGoal?.id || uid(),
      title: title.trim(),
      category,
      archived: initialGoal?.archived || false,
      actions: initialGoal?.actions || [],
      history: initialGoal?.history || {},
      notes: initialGoal?.notes || {},
    });
  }

  function handleArchiveToggle() {
    onArchive(initialGoal.id, !initialGoal.archived);
  }

  function handleDelete() {
    if (confirm(`Are you sure you want to delete "${initialGoal.title}" and all history permanently?`)) {
      onDelete(initialGoal.id);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{isEdit ? "Workspace Settings" : "New Goal Workspace"}</div>
        <label className="field">
          <span>Goal Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Master System Design" autoFocus />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <div className="modal-actions">
          {isEdit && (
            <>
              <button className="btn ghost" onClick={handleArchiveToggle}>
                {initialGoal.archived ? "Unarchive" : "Archive"}
              </button>
              <button className="btn ghost danger" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
          <div className="spacer" />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit}>
            {isEdit ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionModal({ initialAction, onSave, onDelete, onClose }) {
  const isEdit = !!initialAction;
  const [name, setName] = React.useState(initialAction?.name || "");
  const [type, setType] = React.useState(initialAction?.type || "checkbox");
  const [target, setTarget] = React.useState(initialAction?.target ?? 1);
  const [step, setStep] = React.useState(initialAction?.step ?? 1);
  const [unit, setUnit] = React.useState(initialAction?.unit || "");
  const [scheduleType, setScheduleType] = React.useState(initialAction?.scheduleType || "daily");
  const [selectedDays, setSelectedDays] = React.useState(initialAction?.days || [0,1,2,3,4,5,6]);

  function toggleDay(dayIndex) {
    if (selectedDays.includes(dayIndex)) {
      if (selectedDays.length === 1) return;
      setSelectedDays(selectedDays.filter(d => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort());
    }
  }

  function submit() {
    if (!name.trim()) return;
    onSave({
      id: initialAction?.id || uid(),
      name: name.trim(),
      type,
      target: type === "checkbox" ? 1 : Number(target) || 1,
      step: type === "checkbox" ? 1 : Number(step) || 1,
      unit: type === "checkbox" ? "" : unit.trim(),
      scheduleType,
      days: scheduleType === "daily" ? [0,1,2,3,4,5,6] : selectedDays,
    });
  }

  function handleDelete() {
    if (confirm(`Delete action "${initialAction.name}"?`)) {
      onDelete(initialAction.id);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{isEdit ? "Edit Action" : "Add Action"}</div>
        <label className="field">
          <span>Action Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read 20 pages" autoFocus />
        </label>

        <label className="field">
          <span>Frequency / Schedule</span>
          <select value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
            <option value="daily">Everyday</option>
            <option value="specific">Specific Days</option>
          </select>
        </label>

        {scheduleType === "specific" && (
          <div className="field">
            <span>Active Days</span>
            <div className="days-pill-selector">
              {DAYS_OF_WEEK.map((day, idx) => (
                <div
                  key={day}
                  className={`day-pill ${selectedDays.includes(idx) ? "active" : ""}`}
                  onClick={() => toggleDay(idx)}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="field">
          <span>Action Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="checkbox">Simple Checkbox</option>
            <option value="counter">Step Counter</option>
          </select>
        </label>

        {type === "counter" && (
          <div className="field-row">
            <label className="field">
              <span>Target</span>
              <input type="number" min="1" value={target} onChange={(e) => setTarget(e.target.value)} />
            </label>
            <label className="field">
              <span>Step</span>
              <input type="number" min="1" value={step} onChange={(e) => setStep(e.target.value)} />
            </label>
            <label className="field">
              <span>Unit</span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="mins, pages" />
            </label>
          </div>
        )}

        <div className="modal-actions">
          {isEdit && (
            <button className="btn ghost danger" onClick={handleDelete}>
              Delete
            </button>
          )}
          <div className="spacer" />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit}>
            {isEdit ? "Save" : "Add Action"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Keyboard Shortcuts</div>
        <div className="shortcut-list">
          <div className="shortcut-row">
            <span>Toggle checklist actions</span>
            <span><kbd>1</kbd> - <kbd>9</kbd></span>
          </div>
          <div className="shortcut-row">
            <span>Navigate weeks</span>
            <span><kbd>←</kbd> <kbd>→</kbd></span>
          </div>
          <div className="shortcut-row">
            <span>Close modals / drawer</span>
            <span><kbd>Esc</kbd></span>
          </div>
        </div>
        <div className="modal-actions">
          <div className="spacer" />
          <button className="btn primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// 3. Goal Workspace Component
// ==========================================================================
function GoalWorkspace({ goal, onBack, onUpdateGoal, onDeleteGoal, onArchiveGoal }) {
  const [actionModalOpen, setActionModalOpen] = React.useState(false);
  const [goalModalOpen, setGoalModalOpen] = React.useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = React.useState(false);
  const [editingAction, setEditingAction] = React.useState(null);
  const [selectedDayKey, setSelectedDayKey] = React.useState(null);
  const [weekOffset, setWeekOffset] = React.useState(0);

  const today = getTodayKey();
  const todayDayIndex = new Date().getDay();
  const todayProgress = goal.history[today] || {};

  const todayActions = React.useMemo(() => {
    return goal.actions.filter(a => isActionScheduledForDay(a, todayDayIndex));
  }, [goal.actions, todayDayIndex]);

  const streak = React.useMemo(() => calculateStreak(goal), [goal]);
  const isLit = React.useMemo(() => isStreakLitToday(goal), [goal, todayProgress]);
  const weeklyRate = React.useMemo(() => calculateWeeklyRate(goal), [goal]);

  const todayCompletedCount = React.useMemo(() => {
    return todayActions.filter(a => (todayProgress[a.id] || 0) >= a.target).length;
  }, [todayActions, todayProgress]);

  // Fixed: Included goal and onUpdateGoal dependencies to eliminate stale closure bugs
  React.useEffect(() => {
    function handleKeyDown(e) {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
      
      if (e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key, 10) - 1;
        if (todayActions[index]) {
          const action = todayActions[index];
          if (action.type === "checkbox") {
            toggleCheckbox(action.id);
          } else {
            incrementCounter(action, action.step);
          }
        }
      } else if (e.key === "ArrowLeft") {
        setWeekOffset(w => w - 1);
      } else if (e.key === "ArrowRight") {
        setWeekOffset(w => Math.min(0, w + 1));
      } else if (e.key === "Escape") {
        setSelectedDayKey(null);
        setActionModalOpen(false);
        setGoalModalOpen(false);
        setShortcutsModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [todayActions, todayProgress, goal, onUpdateGoal]);

  function saveAction(action) {
    const exists = goal.actions.some(a => a.id === action.id);
    const updatedActions = exists
      ? goal.actions.map(a => a.id === action.id ? action : a)
      : [...goal.actions, action];

    onUpdateGoal({ ...goal, actions: updatedActions });
    setActionModalOpen(false);
    setEditingAction(null);
  }

  function deleteAction(actionId) {
    const updatedActions = goal.actions.filter(a => a.id !== actionId);
    onUpdateGoal({ ...goal, actions: updatedActions });
    setActionModalOpen(false);
    setEditingAction(null);
  }

  function toggleCheckbox(actionId) {
    const current = todayProgress[actionId] || 0;
    const next = current > 0 ? 0 : 1;
    updateProgress(actionId, next);
  }

  function incrementCounter(action, step) {
    const current = todayProgress[action.id] || 0;
    const next = Math.min(action.target, current + step);
    updateProgress(action.id, next);
  }

  function decrementCounter(action, step) {
    const current = todayProgress[action.id] || 0;
    const next = Math.max(0, current - step);
    updateProgress(action.id, next);
  }

  function updateProgress(actionId, val) {
    const newHistory = {
      ...goal.history,
      [today]: {
        ...(goal.history[today] || {}),
        [actionId]: val
      }
    };
    onUpdateGoal({ ...goal, history: newHistory });
  }

  function updateDayNote(dayKey, noteText) {
    const newNotes = { ...(goal.notes || {}), [dayKey]: noteText };
    onUpdateGoal({ ...goal, notes: newNotes });
  }

  const weekDays = React.useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - currentDayOfWeek + (weekOffset * 7));

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(sunday);
      dayDate.setDate(sunday.getDate() + i);
      const key = formatDateKey(dayDate);
      const dayData = goal.history[key] || {};
      const dayNote = goal.notes?.[key] || "";
      
      const isFuture = key > today;
      const scheduledActions = goal.actions.filter(a => isActionScheduledForDay(a, i));

      let completedCount = 0;
      const details = scheduledActions.map(a => {
        const val = dayData[a.id] || 0;
        const isDone = val >= a.target;
        if (isDone) completedCount++;
        return { ...a, val, isDone };
      });

      const total = scheduledActions.length;
      let status = "empty";
      if (isFuture) {
        status = "future";
      } else if (total > 0 && completedCount === total) {
        status = "full";
      } else if (completedCount > 0) {
        status = "partial";
      }

      return {
        label: DAYS_OF_WEEK[i],
        dateStr: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        key,
        status,
        isFuture,
        completedCount,
        total,
        details,
        note: dayNote
      };
    });
  }, [goal.history, goal.notes, goal.actions, today, weekOffset]);

  const selectedDay = weekDays.find(d => d.key === selectedDayKey);

  return (
    <div className="workspace">
      <div>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="workspace-header">
          <div>
            <div className="card-category">{goal.category}</div>
            <h2 className="card-title" style={{ fontSize: 24 }}>{goal.title}</h2>
            <GoalProgressBar completed={todayCompletedCount} total={todayActions.length} />
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <SymbolButton symbol="⌨" label="Keyboard Shortcuts" onClick={() => setShortcutsModalOpen(true)} />
            <SymbolButton symbol="⚙" label="Workspace Settings" onClick={() => setGoalModalOpen(true)} />
          </div>
        </div>
      </div>

      <div className="workspace-stats-bar">
        <div className="stat-pill">
          <span className="label">Streak Status</span>
          <span className="value">
            <StreakDisplay count={streak} isLit={isLit} />
          </span>
        </div>
        <div className="stat-pill">
          <span className="label">7-Day Score</span>
          <span className="value">{weeklyRate}%</span>
        </div>
        <div className="stat-pill">
          <span className="label">Actions</span>
          <span className="value">{goal.actions.length} total</span>
        </div>
      </div>

      <div className="action-section">
        <div className="section-title">
          <span>Today ({DAYS_OF_WEEK[todayDayIndex]})</span>
          <SymbolButton symbol="+" label="Add Action" onClick={() => { setEditingAction(null); setActionModalOpen(true); }} />
        </div>

        {todayActions.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--graphite)", textAlign: "center", padding: "20px 0" }}>
            {goal.actions.length === 0 
              ? "No actions configured yet." 
              : "No actions scheduled for today."}
          </div>
        ) : (
          <div className="action-list">
            {todayActions.map((a, idx) => {
              const val = todayProgress[a.id] || 0;
              const isDone = val >= a.target;

              return (
                <div key={a.id} className="action-item">
                  <div className="action-left">
                    {idx < 9 && <span className="key-badge">{idx + 1}</span>}
                    {a.type === "checkbox" ? (
                      <button className={"checkbox-btn" + (isDone ? " done" : "")} onClick={() => toggleCheckbox(a.id)}>
                        {isDone ? "✓" : ""}
                      </button>
                    ) : (
                      <span className="checkbox-btn done" style={{ background: isDone ? "var(--ink)" : "var(--line)" }}>
                        {isDone ? "✓" : ""}
                      </span>
                    )}
                    <div>
                      <span className={"action-label" + (isDone ? " done" : "")}>{a.name}</span>
                      <span className="action-schedule-tag">{formatScheduleLabel(a)}</span>
                    </div>
                  </div>

                  <div className="action-right">
                    {a.type === "counter" && (
                      <div className="action-counter">
                        <button className="btn small ghost" onClick={() => decrementCounter(a, a.step)}> - </button>
                        <span style={{ fontSize: 12, color: "var(--graphite)" }}>
                          {val} / {a.target} {a.unit}
                        </span>
                        <button className="btn small ghost" onClick={() => incrementCounter(a, a.step)}> +{a.step} </button>
                      </div>
                    )}
                    <SymbolButton symbol="✎" label="Edit Action" onClick={() => { setEditingAction(a); setActionModalOpen(true); }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="history-section">
        <div className="history-nav">
          <div className="section-title" style={{ margin: 0 }}>Weekly Grid</div>
          <div style={{ display: "flex", gap: "2px" }}>
            <SymbolButton symbol="←" label="Previous Week" onClick={() => setWeekOffset(w => w - 1)} />
            {weekOffset !== 0 && (
              <SymbolButton symbol="•" label="Return to Today" onClick={() => setWeekOffset(0)} />
            )}
            <SymbolButton symbol="→" label="Next Week" onClick={() => setWeekOffset(w => Math.min(0, w + 1))} />
          </div>
        </div>

        <div className="history-row">
          <span className="history-label">
            {weekOffset === 0 ? "This Week" : weekOffset === -1 ? "Last Week" : `${Math.abs(weekOffset)} Wks Ago`}
          </span>
          <div className="days-grid">
            {weekDays.map((d) => (
              <button 
                key={d.key} 
                type="button"
                className={`day-box ${d.status} ${selectedDayKey === d.key ? "selected" : ""} ${d.note ? "has-note" : ""}`}
                onClick={() => !d.isFuture && setSelectedDayKey(prev => prev === d.key ? null : d.key)}
                aria-label={`${d.label} ${d.dateStr}: ${d.completedCount} of ${d.total} actions completed`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {selectedDay && !selectedDay.isFuture && (
          <div className="day-drawer">
            <div className="drawer-header">
              <span>{selectedDay.label} ({selectedDay.dateStr}) Scheduled Actions</span>
              <span>{selectedDay.completedCount} / {selectedDay.total} Completed</span>
            </div>

            {selectedDay.details.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--graphite)" }}>
                No actions scheduled for this day.
              </div>
            ) : (
              selectedDay.details.map(item => (
                <div key={item.id} className="drawer-item">
                  <span style={{ opacity: item.isDone ? 1 : 0.7 }}>
                    {item.name}
                  </span>
                  <span className={`drawer-status ${item.isDone ? "done" : "missed"}`}>
                    {item.isDone ? "✓ Done" : "— Missed"}
                    {item.type === "counter" && ` (${item.val}/${item.target} ${item.unit})`}
                  </span>
                </div>
              ))
            )}

            <input 
              className="note-input"
              type="text"
              placeholder="Add optional note for this day..."
              value={selectedDay.note}
              onChange={(e) => updateDayNote(selectedDay.key, e.target.value)}
            />
          </div>
        )}
      </div>

      {actionModalOpen && (
        <ActionModal 
          initialAction={editingAction} 
          onSave={saveAction} 
          onDelete={deleteAction}
          onClose={() => { setActionModalOpen(false); setEditingAction(null); }} 
        />
      )}

      {goalModalOpen && (
        <GoalModal
          initialGoal={goal}
          onSave={(updated) => { onUpdateGoal(updated); setGoalModalOpen(false); }}
          onArchive={(id, state) => { onArchiveGoal(id, state); setGoalModalOpen(false); onBack(); }}
          onDelete={(id) => { onDeleteGoal(id); setGoalModalOpen(false); onBack(); }}
          onClose={() => setGoalModalOpen(false)}
        />
      )}

      {shortcutsModalOpen && <ShortcutsModal onClose={() => setShortcutsModalOpen(false)} />}
    </div>
  );
}

// ==========================================================================
// 4. Main App Container View Switcher
// ==========================================================================
function FocusGoalTracker() {
  const [goals, setGoals] = React.useState(null);
  const [activeGoalId, setActiveGoalId] = React.useState(null);
  const [goalModal, setGoalModal] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);
  const [lastBackup, setLastBackup] = React.useState(null);
  const fileInputRef = React.useRef(null);

  // Fixed: Added safe JSON parsing try-catch block to prevent silent total state wipes on data corruption
  React.useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("action_goals_data");
        if (res && res.value) {
          try {
            const parsed = JSON.parse(res.value);
            setGoals(Array.isArray(parsed) ? parsed : []);
          } catch (parseError) {
            console.error("Corrupted local storage payload detected:", parseError);
            alert("Warning: Local goal data appears corrupted. Initializing fresh workspace state.");
            setGoals([]);
          }
        } else {
          setGoals([]);
        }
        const backupMeta = await window.storage.get("action_goals_backup_date");
        if (backupMeta) setLastBackup(backupMeta.value);
      } catch {
        setGoals([]);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (goals === null) return;
    (async () => {
      try {
        await window.storage.set("action_goals_data", JSON.stringify(goals));
      } catch (storageError) {
        console.error("Storage write failed (Quota Exceeded?):", storageError);
        alert("Error: Storage limit reached. Please export your backup and clear space.");
      }
    })();
  }, [goals]);

  function saveGoal(newGoal) {
    setGoals(prev => [...prev, newGoal]);
    setGoalModal(false);
  }

  function updateGoal(updated) {
    setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
  }

  function toggleArchiveGoal(id, archiveState) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, archived: archiveState } : g));
  }

  function deleteGoal(id) {
    setGoals(prev => prev.filter(g => g.id !== id));
  }

  function exportBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(goals, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `focus_tracker_backup_${getTodayKey()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    const todayStr = getTodayKey();
    setLastBackup(todayStr);
    window.storage.set("action_goals_backup_date", todayStr);
  }

  function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        const isValid = Array.isArray(imported) && imported.every(g => 
          typeof g.id === 'string' && 
          typeof g.title === 'string' && 
          Array.isArray(g.actions)
        );

        if (isValid) {
          setGoals(imported);
          alert("Backup successfully restored!");
        } else {
          alert("Invalid backup file format.");
        }
      } catch {
        alert("Failed to parse backup file.");
      }
    };
    reader.readAsText(file);
  }

  const activeGoals = goals?.filter(g => !g.archived) || [];
  const archivedGoals = goals?.filter(g => g.archived) || [];

  const needsBackupNotice = React.useMemo(() => {
    if (!lastBackup) return true;
    const daysSince = (new Date() - new Date(lastBackup)) / (1000 * 60 * 60 * 24);
    return daysSince > 14;
  }, [lastBackup]);

  const hasMeaningfulData = React.useMemo(() => {
    if (!goals || goals.length === 0) return false;
    return goals.some(g => g.actions.length > 0 || Object.keys(g.history || {}).length > 0);
  }, [goals]);

  const activeGoal = goals?.find(g => g.id === activeGoalId);

  return (
    <div className="app">
      <InstallPrompt />
      <BackupReminder
        hasData={hasMeaningfulData}
        needsBackup={needsBackupNotice}
        onBackupNow={exportBackup}
      />
      <div className="header">
        <h1>Focus</h1>
        <div className="header-right">
          <SymbolButton 
            symbol="↓" 
            label="Backup JSON Data" 
            onClick={exportBackup} 
            hasBadge={needsBackupNotice}
          />
          <SymbolButton 
            symbol="↑" 
            label="Restore Data File" 
            onClick={() => fileInputRef.current?.click()} 
          />
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={importBackup} />
        </div>
      </div>

      {goals === null ? (
        <div style={{ color: "var(--graphite)", fontSize: 13 }}>Loading workspace…</div>
      ) : activeGoal ? (
        <GoalWorkspace 
          goal={activeGoal} 
          onBack={() => setActiveGoalId(null)} 
          onUpdateGoal={updateGoal} 
          onArchiveGoal={toggleArchiveGoal}
          onDeleteGoal={deleteGoal}
        />
      ) : (
        <>
          <div className="grid">
            {activeGoals.map(g => {
              const streak = calculateStreak(g);
              const isLit = isStreakLitToday(g);
              const weeklyRate = calculateWeeklyRate(g);
              return (
                <div key={g.id} className="card" onClick={() => setActiveGoalId(g.id)}>
                  <div className="card-category">{g.category}</div>
                  <h3 className="card-title">{g.title}</h3>
                  <div className="card-stats">
                    <span>{weeklyRate}% 7d score</span>
                    <StreakDisplay count={streak} isLit={isLit} />
                  </div>
                </div>
              );
            })}

            <button className="card add-slot" onClick={() => setGoalModal(true)}>
              <div style={{ fontSize: 22, marginBottom: 2 }}>+</div>
              <div style={{ fontSize: 12 }}>New Goal</div>
            </button>
          </div>

          {archivedGoals.length > 0 && (
            <div className="archive-section">
              <button className="archive-toggle" onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? "↓ Hide Archived Workspaces" : `→ Show Archived Workspaces (${archivedGoals.length})`}
              </button>

              {showArchived && (
                <div className="grid" style={{ marginTop: 16 }}>
                  {archivedGoals.map(g => (
                    <div key={g.id} className="card" style={{ opacity: 0.6 }} onClick={() => setActiveGoalId(g.id)}>
                      <div className="card-category">{g.category} (Archived)</div>
                      <h3 className="card-title">{g.title}</h3>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {goalModal && <GoalModal onSave={saveGoal} onClose={() => setGoalModal(false)} />}
    </div>
  );
}

export default FocusGoalTracker;