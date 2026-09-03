// src/App.jsx
import React, { useState, useEffect } from 'react';

export default function App() {
  // Load initial state from localStorage or defaults
  const [goal, setGoal] = useState(() => {
    const saved = localStorage.getItem('focus_goal');
    return saved ? JSON.parse(saved) : { title: 'Reach 55kg', startProgress: 58, currentProgress: 56.5, target: 55 };
  });

  const [actions, setActions] = useState(() => {
    const saved = localStorage.getItem('focus_actions');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Drink 3L of water daily', completed: false },
      { id: 2, text: '15 min core workout', completed: true },
      { id: 3, text: 'Track all meals', completed: false }
    ];
  });

  const [newActionText, setNewActionText] = useState('');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(goal);

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('focus_goal', JSON.stringify(goal));
  }, [goal]);

  useEffect(() => {
    localStorage.setItem('focus_actions', JSON.stringify(actions));
  }, [actions]);

  // Calculations for Step 4 (Progress Tracking)
  const totalActions = actions.length;
  const completedToday = actions.filter(a => a.completed).length;
  const completionRate = totalActions > 0 ? Math.round((completedToday / totalActions) * 100) : 0;

  // Weight progress calc (assuming lower is target, or general scale)
  const totalDistance = Math.abs(goal.target - goal.startProgress);
  const currentCovered = Math.abs(goal.currentProgress - goal.startProgress);
  const progressPercent = totalDistance === 0 ? 100 : Math.min(100, Math.max(0, Math.round((currentCovered / totalDistance) * 100)));

  const toggleAction = (id) => {
    setActions(actions.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  const addAction = (e) => {
    e.preventDefault();
    if (!newActionText.trim()) return;
    setActions([...actions, { id: Date.now(), text: newActionText.trim(), completed: false }]);
    setNewActionText('');
  };

  const deleteAction = (id) => {
    setActions(actions.filter(a => a.id !== id));
  };

  const saveGoalChanges = (e) => {
    e.preventDefault();
    setGoal(tempGoal);
    setIsEditingGoal(false);
  };

  return (
    <div className="app-container" style={styles.container}>
      {/* Header / Brand */}
      <header style={styles.header}>
        <h1 style={styles.brandTitle}>Focus</h1>
        <span style={styles.badge}>Action-Based Goal Tracker</span>
      </header>

      {/* STEP 1 & STEP 4: Goal Title, Baseline, and Current Progress Tracker */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <span style={styles.stepLabel}>STEP 1 & 4 — GOAL & PROGRESS</span>
            <h2 style={styles.goalHeading}>{goal.title}</h2>
          </div>
          <button onClick={() => { setTempGoal(goal); setIsEditingGoal(!isEditingGoal); }} style={styles.textButton}>
            {isEditingGoal ? 'Cancel' : 'Edit Goal'}
          </button>
        </div>

        {isEditingGoal ? (
          <form onSubmit={saveGoalChanges} style={styles.editForm}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Goal Title</label>
              <input 
                type="text" 
                value={tempGoal.title} 
                onChange={(e) => setTempGoal({...tempGoal, title: e.target.value})} 
                style={styles.input}
              />
            </div>
            <div style={styles.rowInputs}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Start Progress</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={tempGoal.startProgress} 
                  onChange={(e) => setTempGoal({...tempGoal, startProgress: parseFloat(e.target.value)})} 
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Current Progress</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={tempGoal.currentProgress} 
                  onChange={(e) => setTempGoal({...tempGoal, currentProgress: parseFloat(e.target.value)})} 
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Target Value</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={tempGoal.target} 
                  onChange={(e) => setTempGoal({...tempGoal, target: parseFloat(e.target.value)})} 
                  style={styles.input}
                />
              </div>
            </div>
            <button type="submit" style={styles.primaryButton}>Save Goal Settings</button>
          </form>
        ) : (
          <div style={styles.progressSection}>
            <div style={styles.progressStatsRow}>
              <div>
                <span style={styles.statSub}>Start: <strong>{goal.startProgress}</strong></span>
              </div>
              <div>
                <span style={styles.statMain}>Current: <strong>{goal.currentProgress}</strong></span>
              </div>
              <div>
                <span style={styles.statSub}>Target: <strong>{goal.target}</strong></span>
              </div>
            </div>
            
            {/* Visual Progress Bar */}
            <div style={styles.progressBarWrapper}>
              <div style={{ ...styles.progressBarFill, width: `${progressPercent}%` }}></div>
            </div>
            <div style={styles.progressFooter}>
              <span>{progressPercent}% towards target achieved</span>
              <span>{Math.abs(goal.target - goal.currentProgress).toFixed(1)} left to go</span>
            </div>
          </div>
        )}
      </section>

      {/* Stats Overview Panel */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statCardTitle}>Daily Actions</span>
          <span style={styles.statCardValue}>{completedToday} / {totalActions}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statCardTitle}>Today's Score</span>
          <span style={styles.statCardValue}>{completionRate}%</span>
        </div>
      </div>

      {/* STEP 2 & 3: Create Actions & Daily Checkboxes */}
      <section style={styles.card}>
        <span style={styles.stepLabel}>STEP 2 & 3 — ACTIONS & DAILY CHECKLIST</span>
        <h3 style={styles.subHeading}>Daily Action Checklist</h3>

        {/* Action Input Form */}
        <form onSubmit={addAction} style={styles.addActionForm}>
          <input 
            type="text" 
            placeholder="Add a new daily action..." 
            value={newActionText}
            onChange={(e) => setNewActionText(e.target.value)}
            style={styles.input}
          />
          <button type="submit" style={styles.addButton}>Add</button>
        </form>

        {/* Action Items List */}
        <div style={styles.actionList}>
          {actions.length === 0 ? (
            <p style={styles.emptyText}>No actions created yet. Add one above to start tracking!</p>
          ) : (
            actions.map((action) => (
              <div key={action.id} style={styles.actionItem}>
                <label style={styles.checkboxLabel}>
                  <input 
                    type="checkbox" 
                    checked={action.completed} 
                    onChange={() => toggleAction(action.id)}
                    style={styles.checkbox}
                  />
                  <span style={{ ...styles.actionText, textDecoration: action.completed ? 'line-through' : 'none', opacity: action.completed ? 0.6 : 1 }}>
                    {action.text}
                  </span>
                </label>
                <button onClick={() => deleteAction(action.id)} style={styles.deleteButton}>×</button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// Clean aesthetic stylesheet matching your dashboard theme
const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1a1a1a',
    backgroundColor: '#F7F5F0',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  brandTitle: {
    fontFamily: 'Fraunces, serif',
    fontSize: '28px',
    margin: 0,
  },
  badge: {
    fontSize: '11px',
    fontFamily: '"JetBrains Mono", monospace',
    background: '#E5E3DC',
    padding: '4px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    border: '1px solid #E5E3DC',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  stepLabel: {
    fontSize: '10px',
    fontFamily: '"JetBrains Mono", monospace',
    color: '#666',
    letterSpacing: '0.05em',
    display: 'block',
    marginBottom: '4px',
  },
  goalHeading: {
    fontFamily: 'Fraunces, serif',
    fontSize: '22px',
    margin: 0,
  },
  textButton: {
    background: 'none',
    border: 'none',
    color: '#0066CC',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  progressSection: {
    marginTop: '12px',
  },
  progressStatsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
    fontSize: '14px',
    fontFamily: '"JetBrains Mono", monospace',
  },
  statMain: {
    color: '#000',
    fontSize: '15px',
  },
  statSub: {
    color: '#666',
  },
  progressBarWrapper: {
    width: '100%',
    height: '10px',
    backgroundColor: '#E5E3DC',
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#111111',
    borderRadius: '5px',
    transition: 'width 0.3s ease',
  },
  progressFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px',
  },
  statCard: {
    background: '#FFFFFF',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #E5E3DC',
    display: 'flex',
    flexDirection: 'column',
  },
  statCardTitle: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '4px',
    fontFamily: '"JetBrains Mono", monospace',
  },
  statCardValue: {
    fontSize: '20px',
    fontWeight: '700',
    fontFamily: 'Fraunces, serif',
  },
  subHeading: {
    fontFamily: 'Fraunces, serif',
    fontSize: '18px',
    margin: '0 0 12px 0',
  },
  addActionForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #CCC',
    fontSize: '14px',
    outline: 'none',
  },
  addButton: {
    padding: '0 16px',
    backgroundColor: '#111111',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  actionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  actionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#FAFAF8',
    borderRadius: '8px',
    border: '1px solid #EFECE6',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    flex: 1,
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  actionText: {
    fontSize: '14px',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  emptyText: {
    fontSize: '13px',
    color: '#888',
    textAlign: 'center',
    margin: '12px 0',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '10px',
  },
  rowInputs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    fontFamily: '"JetBrains Mono", monospace',
    color: '#555',
  },
  primaryButton: {
    padding: '10px',
    backgroundColor: '#111111',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '4px',
  }
};