import React from 'react';

const DISMISS_KEY = 'focus_backup_reminder_dismissed_at';
const DISMISS_COOLDOWN_DAYS = 3;

export default function BackupReminder({ hasData, needsBackup, onBackupNow }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!hasData || !needsBackup) {
      setVisible(false);
      return;
    }

    (async () => {
      let dismissedAt = null;
      try {
        const res = await window.storage.get(DISMISS_KEY);
        dismissedAt = res?.value || null;
      } catch {
        dismissedAt = null;
      }
      if (dismissedAt) {
        const daysSince = (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < DISMISS_COOLDOWN_DAYS) {
          setVisible(false);
          return;
        }
      }
      setVisible(true);
    })();
  }, [hasData, needsBackup]);

  async function dismiss() {
    setVisible(false);
    try {
      await window.storage.set(DISMISS_KEY, new Date().toISOString());
    } catch {
      // non-fatal
    }
  }

  function handleBackupNow() {
    onBackupNow();
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="backup-banner" role="dialog" aria-label="Back up your data">
      <button className="backup-banner-close" onClick={dismiss} aria-label="Dismiss">
        ×
      </button>
      <div className="backup-banner-row">
        <div className="backup-banner-icon">↓</div>
        <div className="backup-banner-text">
          <div className="backup-banner-title">Back Up Your Data</div>
          <div className="backup-banner-subtitle">
            It's been a while since your last export. Your data only lives on this device.
          </div>
        </div>
      </div>
      <div className="backup-banner-actions">
        <button className="backup-banner-btn ghost" onClick={dismiss}>
          Later
        </button>
        <button className="backup-banner-btn primary" onClick={handleBackupNow}>
          Back Up Now
        </button>
      </div>
    </div>
  );
}
