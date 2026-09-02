import React from 'react';

const DISMISS_KEY = 'focus_install_prompt_dismissed_at';
const DISMISS_COOLDOWN_DAYS = 14;

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallPrompt() {
  const [visible, setVisible] = React.useState(false);
  const [platform, setPlatform] = React.useState(null); // 'android' | 'ios'
  const deferredPromptRef = React.useRef(null);

  React.useEffect(() => {
    if (isStandalone()) return; // already installed, never nag

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
        if (daysSince < DISMISS_COOLDOWN_DAYS) return;
      }

      if (isIOS()) {
        // iOS has no beforeinstallprompt event — show manual instructions instead.
        setPlatform('ios');
        setVisible(true);
        return;
      }

      // Android/desktop Chrome: wait for the real install-eligibility event.
      function handleBeforeInstallPrompt(e) {
        e.preventDefault();
        deferredPromptRef.current = e;
        setPlatform('android');
        setVisible(true);
      }
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.__focusRemoveInstallListener = () =>
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    })();

    return () => {
      window.__focusRemoveInstallListener?.();
    };
  }, []);

  async function dismiss() {
    setVisible(false);
    try {
      await window.storage.set(DISMISS_KEY, new Date().toISOString());
    } catch {
      // non-fatal
    }
  }

  async function handleInstall() {
    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) return;
    promptEvent.prompt();
    try {
      await promptEvent.userChoice;
    } finally {
      deferredPromptRef.current = null;
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="install-banner" role="dialog" aria-label="Install Focus">
      <button className="install-banner-close" onClick={dismiss} aria-label="Dismiss">
        ×
      </button>
      <div className="install-banner-row">
        <img src="/icons/icon-192.png" alt="" className="install-banner-icon" />
        <div className="install-banner-text">
          <div className="install-banner-title">Install Focus</div>
          <div className="install-banner-subtitle">
            {platform === 'ios'
              ? 'Tap the Share icon, then "Add to Home Screen"'
              : 'Add to your home screen for full-screen, offline access'}
          </div>
        </div>
      </div>
      <div className="install-banner-actions">
        <button className="install-banner-btn ghost" onClick={dismiss}>
          Not Now
        </button>
        {platform === 'android' && (
          <button className="install-banner-btn primary" onClick={handleInstall}>
            Install
          </button>
        )}
      </div>
    </div>
  );
}
