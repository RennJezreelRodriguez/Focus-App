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

function calculateValueProgress(goal) {
  const start = goal.startValue ?? 0;
  const target = goal.targetValue ?? 0;
  const current = goal.currentValue ?? start;

  if (target === start) return { pct: 100, direction: "flat" };

  const direction = target > start ? "up" : "down";
  const raw = direction === "up"
    ? ((current - start) / (target - start)) * 100
    : ((start - current) / (start - target)) * 100;

  return { pct: Math.max(0, Math.min(100, Math.round(raw))), direction };
}

function formatNum(n) {
  if (n === undefined || n === null || Number.isNaN(n)) return 0;
  if (Number.isInteger(n)) return n;
  return Math.round(n * 100) / 100;
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

function ValueProgressBar({ goal }) {
  const { pct } = React.useMemo(
    () => calculateValueProgress(goal),
    [goal.currentValue, goal.startValue, goal.targetValue]
  );

  return (
    <div className="goal-progress-inline">
      <div className="goal-progress-track">
        <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="goal-progress-label">
        {formatNum(goal.currentValue)}{goal.unit} / {formatNum(goal.targetValue)}{goal.unit} ({pct}%)
      </span>
    </div>
  );
}

function ValueLogModal({ goal, onSubmit, onClose }) {
  const [mode, setMode] = React.useState("change"); // "change" | "total"
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");

  function submit() {
    const num = Number(amount);
    if (Number.isNaN(num) || amount.trim() === "") return;

    const resultingValue = mode === "change" ? goal.currentValue + num : num;
    const delta = mode === "change" ? num : num - goal.currentValue;

    onSubmit({ delta, resultingValue, note: note.trim() });
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">Log a Progress Update</div>

        <div className="value-log-tabs">
          <button
            type="button"
            className={`value-log-tab ${mode === "change" ? "active" : ""}`}
            onClick={() => setMode("change")}
          >
            +/- Change
          </button>
          <button
            type="button"
            className={`value-log-tab ${mode === "total" ? "active" : ""}`}
            onClick={() => setMode("total")}
          >
            New Total
          </button>
        </div>

        <label className="field">
          <span>
            {mode === "change"
              ? `Amount${goal.unit ? ` (${goal.unit})` : ""} — use a minus sign for a decrease`
              : `New Total${goal.unit ? ` (${goal.unit})` : ""}`}
          </span>
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={mode === "change" ? "e.g. 1 or -0.5" : `Current: ${formatNum(goal.currentValue)}`}
            autoFocus
          />
        </label>

        <label className="field">
          <span>Note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Weekly weigh-in" />
        </label>

        <div className="modal-actions">
          <div className="spacer" />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ValueHistoryList({ goal, onDeleteEntry }) {
  const entries = [...(goal.valueLog || [])].reverse();

  if (entries.length === 0) {
    return (
      <div style={{ fontSize: 13, color: "var(--graphite)", textAlign: "center", padding: "20px 0" }}>
        No progress updates logged yet.
      </div>
    );
  }

  return (
    <div className="value-history-list">
      {entries.map(entry => (
        <div key={entry.id} className="value-history-item">
          <div className="value-history-main">
            <span className={`value-history-delta ${entry.delta >= 0 ? "positive" : "negative"}`}>
              {entry.delta >= 0 ? "+" : ""}{formatNum(entry.delta)}{goal.unit}
            </span>
            <span className="value-history-date">
              {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="value-history-sub">
            <span>→ {formatNum(entry.resultingValue)}{goal.unit}</span>
            {entry.note && <span className="value-history-note">{entry.note}</span>}
          </div>
          <button
            className="value-history-delete"
            onClick={() => onDeleteEntry(entry.id)}
            aria-label="Delete entry"
            title="Delete entry"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// ==========================================================================
// 2. Modals (Goal Settings & Action Modal)
// ==========================================================================
function GoalModal({ initialGoal, onSave, onArchive, onDelete, onClose }) {
  const isEdit = !!initialGoal;
  const [title, setTitle] = React.useState(initialGoal?.title || "");
  const [category, setCategory] = React.useState(initialGoal?.category || CATEGORIES[0]);
  const [unit, setUnit] = React.useState(initialGoal?.unit || "");
  const [startValue, setStartValue] = React.useState(initialGoal?.startValue ?? 0);
  const [targetValue, setTargetValue] = React.useState(initialGoal?.targetValue ?? 100);

  function submit() {
    if (!title.trim()) return;

    const start = Number(startValue) || 0;
    onSave({
      id: initialGoal?.id || uid(),
      title: title.trim(),
      category,
      archived: initialGoal?.archived || false,
      unit: unit.trim(),
      startValue: start,
      targetValue: Number(targetValue) || 0,
      currentValue: initialGoal?.currentValue ?? start,
      valueLog: initialGoal?.valueLog || [],
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
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reach 55kg" autoFocus />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div className="field-row">
          <label className="field">
            <span>Starting Progress</span>
            <input type="number" step="any" value={startValue} onChange={(e) => setStartValue(e.target.value)} />
          </label>
          <label className="field">
            <span>Target Goal</span>
            <input type="number" step="any" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Unit</span>
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, $, lbs (optional)" />
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
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gym workout 30 mins" autoFocus />
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
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="mins, reps" />
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

// ==========================================================================
// 3. Goal Workspace Component
// ==========================================================================
function GoalWorkspace({ goal, onBack, onUpdateGoal, onDeleteGoal, onArchiveGoal }) {
  const [actionModalOpen, setActionModalOpen] = React.useState(false);
  const [goalModalOpen, setGoalModalOpen] = React.useState(false);
  const [valueLogModalOpen, setValueLogModalOpen] = React.useState(false);
  const [editingAction, setEditingAction] = React.useState(null);

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

  function logValueUpdate({ delta, resultingValue, note }) {
    const entry = { id: uid(), date: new Date().toISOString(), delta, resultingValue, note };
    const newLog = [...(goal.valueLog || []), entry];
    onUpdateGoal({ ...goal, currentValue: resultingValue, valueLog: newLog });
    setValueLogModalOpen(false);
  }

  function deleteValueLogEntry(entryId) {
    const newLog = (goal.valueLog || []).filter(e => e.id !== entryId);
    const recomputedValue = (goal.startValue ?? 0) + newLog.reduce((sum, e) => sum + e.delta, 0);
    onUpdateGoal({ ...goal, currentValue: recomputedValue, valueLog: newLog });
  }

  return (
    <div className="workspace">
      <div>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="workspace-header">
          <div>
            <div className="card-category">{goal.category}</div>
            <h2 className="card-title" style={{ fontSize: 24 }}>{goal.title}</h2>
            <ValueProgressBar goal={goal} />
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <SymbolButton symbol="⚙" label="Workspace Settings" onClick={() => setGoalModalOpen(true)} />
          </div>
        </div>
      </div>

      <div className="workspace-stats-bar">
        <div className="stat-pill">
          <span className="label">Current Progress</span>
          <span className="value">{formatNum(goal.currentValue)}{goal.unit}</span>
        </div>
        <div className="stat-pill">
          <span className="label">Target Goal</span>
          <span className="value">{formatNum(goal.targetValue)}{goal.unit}</span>
        </div>
        <div className="stat-pill">
          <span className="label">Started At</span>
          <span className="value">{formatNum(goal.startValue)}{goal.unit}</span>
        </div>
      </div>

      {/* Progress Updates Section */}
      <div className="action-section">
        <div className="section-title">
          <span>Progress Updates</span>
          <SymbolButton symbol="+" label="Update Progress" onClick={() => setValueLogModalOpen(true)} />
        </div>
        <ValueHistoryList goal={goal} onDeleteEntry={deleteValueLogEntry} />
      </div>

      {/* Actions Section */}
      <div className="action-section">
        <div className="section-title">
          <span>Goal Actions ({goal.actions.length})</span>
          <SymbolButton symbol="+" label="Add Action" onClick={() => { setEditingAction(null); setActionModalOpen(true); }} />
        </div>

        {goal.actions.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--graphite)", textAlign: "center", padding: "20px 0" }}>
            No actions configured yet. Add actions to help you reach this goal.
          </div>
        ) : (
          <div className="action-list">
            {goal.actions.map((a) => (
              <div key={a.id} className="action-item">
                <div className="action-left">
                  <div>
                    <span className="action-label">{a.name}</span>
                    <span className="action-schedule-tag">{formatScheduleLabel(a)}</span>
                  </div>
                </div>
                <div className="action-right">
                  <SymbolButton symbol="✎" label="Edit Action" onClick={() => { setEditingAction(a); setActionModalOpen(true); }} />
                  <SymbolButton symbol="×" label="Delete Action" onClick={() => deleteAction(a.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {valueLogModalOpen && (
        <ValueLogModal
          goal={goal}
          onSubmit={logValueUpdate}
          onClose={() => setValueLogModalOpen(false)}
        />
      )}

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
    dlAnchor.setAttribute("download", `focus_tracker_backup_${formatDateKey(new Date())}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    const todayStr = formatDateKey(new Date());
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
          typeof g.title === 'string'
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
    return goals.some(g => (g.valueLog && g.valueLog.length > 0) || (g.actions && g.actions.length > 0));
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
              return (
                <div key={g.id} className="card" onClick={() => setActiveGoalId(g.id)}>
                  <div className="card-category">{g.category}</div>
                  <h3 className="card-title">{g.title}</h3>
                  <div style={{ marginTop: "auto" }}>
                    <ValueProgressBar goal={g} />
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
