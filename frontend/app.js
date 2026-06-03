// ===== JK Private Limited - Core App Logic =====
// Intercept fetch globally to bypass ngrok browser warning pages
const originalFetch = window.fetch;
window.fetch = function (resource, options = {}) {
  let headers = options.headers || {};
  if (headers instanceof Headers) {
    headers.set('ngrok-skip-browser-warning', 'true');
  } else if (Array.isArray(headers)) {
    headers.push(['ngrok-skip-browser-warning', 'true']);
  } else {
    headers = { ...headers, 'ngrok-skip-browser-warning': 'true' };
  }
  options.headers = headers;
  return originalFetch(resource, options);
};

// Capture backend URL from query parameter if provided (e.g. ?backend=http://192.168.1.15:3000)
const urlParams = new URLSearchParams(window.location.search);
const backendParam = urlParams.get('backend');
if (backendParam) {
  localStorage.setItem('jk_backend_url', backendParam);
  // Clean URL query parameters from browser address bar
  const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
}

const _saved = localStorage.getItem('jk_backend_url');
const _hardcoded = 'https://hr-project-sqfw.onrender.com';
const API_BASE = (location.protocol === 'file:')
  ? (_saved || 'http://localhost:3000')
  : (_saved || _hardcoded);



console.log('JK Placements Engine API Base:', API_BASE || '(same origin)');

const APP = {
  VERSION: '1.0.0',
  PASS_PERCENTAGE: 70,
  TEST_DURATION: 30 * 60, // 30 minutes in seconds
  TOTAL_QUESTIONS: 30,
  ADMIN_CREDENTIALS: { username: 'admin@jkpvtltd.com', password: 'JKAdmin@2025' },
  API_BASE, // Expose globally

  // ===== STORAGE =====
  storage: {
    get: (key) => { try { return JSON.parse(localStorage.getItem('jk_' + key)); } catch { return null; } },
    set: (key, value) => localStorage.setItem('jk_' + key, JSON.stringify(value)),
    remove: (key) => localStorage.removeItem('jk_' + key),
    clear: () => { Object.keys(localStorage).filter(k => k.startsWith('jk_')).forEach(k => localStorage.removeItem(k)); }
  },

  // ===== SESSION =====
  session: {
    setCandidate: (data) => APP.storage.set('session_candidate', data),
    getCandidate: () => APP.storage.get('session_candidate'),
    clearCandidate: () => APP.storage.remove('session_candidate'),
    setAdmin: (data) => APP.storage.set('session_admin', data),
    getAdmin: () => APP.storage.get('session_admin'),
    clearAdmin: () => APP.storage.remove('session_admin'),
  },

  // ===== SYNC TO SERVER =====
  sync: async () => {
    try {
      const res = await fetch(API_BASE + '/api/db');
      if (res.ok) {
        let data = await res.json();

        // --- Smart Sync Unsynced Items First ---
        let hasUnsynced = false;

        // 1. Unsynced Results & Responses
        const localResults = APP.storage.get('results') || [];
        const serverResults = data.results || [];
        const unsyncedResults = localResults.filter(lr => !serverResults.some(sr => sr.candidateId === lr.candidateId));
        if (unsyncedResults.length > 0) {
          hasUnsynced = true;
          for (const result of unsyncedResults) {
            const responsesSheet = (APP.storage.get('responses') || []).find(r => r.candidateId === result.candidateId) || {
              candidateId: result.candidateId,
              answers: [],
              submittedAt: result.submittedAt
            };
            try {
              await fetch(API_BASE + '/api/test/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ result, responsesSheet })
              });
            } catch (e) {
              console.error('Failed to sync offline result for ' + result.candidateId, e);
            }
          }
        }

        // 2. Unsynced Interviews
        const localInterviews = APP.storage.get('interviews') || [];
        const serverInterviews = data.interviews || [];
        const unsyncedInterviews = localInterviews.filter(li => !serverInterviews.some(si => si.id === li.id));
        if (unsyncedInterviews.length > 0) {
          hasUnsynced = true;
          for (const interview of unsyncedInterviews) {
            try {
              await fetch(API_BASE + '/api/interviews/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interview)
              });
            } catch (e) {
              console.error('Failed to sync offline interview ' + interview.id, e);
            }
          }
        }

        // 3. Unsynced Emails
        const localEmails = APP.storage.get('emails') || [];
        const serverEmails = data.emails || [];
        const unsyncedEmails = localEmails.filter(le => !serverEmails.some(se => se.id === le.id));
        if (unsyncedEmails.length > 0) {
          hasUnsynced = true;
          for (const email of unsyncedEmails) {
            try {
              await fetch(API_BASE + '/api/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(email)
              });
            } catch (e) {
              console.error('Failed to sync offline email ' + email.id, e);
            }
          }
        }

        // Re-fetch latest unified db state if we uploaded local files
        if (hasUnsynced) {
          const resRefetched = await fetch(API_BASE + '/api/db');
          if (resRefetched.ok) {
            data = await resRefetched.json();
          }
        }

        // Sync local storage cache
        APP.storage.set('candidates', data.candidates);
        APP.storage.set('results', data.results);
        APP.storage.set('interviews', data.interviews);
        APP.storage.set('questions', data.questions);
        APP.storage.set('responses', data.responses);
        APP.storage.set('emails', data.emails);
        APP.storage.set('admin_users', data.admin_users);

        // Update local session info and check if session is still valid in database
        const currentCandidate = APP.session.getCandidate();
        if (currentCandidate) {
          const freshCand = data.candidates.find(c => c.id === currentCandidate.id);
          if (freshCand) {
            APP.session.setCandidate(freshCand);
          } else {
            // The candidate has been deleted from the database! Clear session and reload.
            APP.session.clearCandidate();
            APP.toast('Session expired or candidate record deleted by administrator.', 'warning', 5000);
            setTimeout(() => {
              window.location.href = 'register.html';
            }, 2500);
            return false;
          }
        }

        // Dispatch update event
        window.dispatchEvent(new CustomEvent('jk_db_updated'));
        return true;
      }
    } catch (err) {
      console.error('Database background sync failed:', err);
    }
    return false;
  },

  // ===== CANDIDATES =====
  candidates: {
    getAll: () => APP.storage.get('candidates') || [],
    save: (list) => APP.storage.set('candidates', list),
    findByEmail: (email) => APP.candidates.getAll().find(c => c.email === email.toLowerCase()),
    findById: (id) => APP.candidates.getAll().find(c => c.id === id),
    add: (candidate) => {
      const list = APP.candidates.getAll();
      if (!list.find(c => c.id === candidate.id)) {
        list.push(candidate);
        APP.candidates.save(list);
      }
    },
    update: (id, data) => {
      const list = APP.candidates.getAll().map(c => c.id === id ? { ...c, ...data } : c);
      APP.candidates.save(list);

      // Background Sync
      fetch(API_BASE + '/api/candidates/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      }).then(r => {
        if (r.ok) APP.sync();
      }).catch(err => console.error('Failed to sync candidate update:', err));
    },
    generateId: () => 'JK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase()
  },

  // ===== RESULTS =====
  results: {
    getAll: () => APP.storage.get('results') || [],
    save: (list) => APP.storage.set('results', list),
    findByCandidateId: (id) => APP.results.getAll().find(r => r.candidateId === id),
    add: (result) => {
      const list = APP.results.getAll();
      const idx = list.findIndex(r => r.candidateId === result.candidateId);
      if (idx >= 0) list[idx] = result; else list.push(result);
      APP.results.save(list);

      // Find responses sheet for this candidate to upload together
      const responsesSheet = APP.responses.findByCandidateId(result.candidateId) || {
        candidateId: result.candidateId,
        answers: [],
        submittedAt: result.submittedAt
      };

      // Background Sync
      fetch(API_BASE + '/api/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, responsesSheet })
      }).then(r => {
        if (r.ok) APP.sync();
      }).catch(err => console.error('Failed to sync test submit:', err));
    }
  },

  // ===== INTERVIEWS =====
  interviews: {
    getAll: () => APP.storage.get('interviews') || [],
    save: (list) => APP.storage.set('interviews', list),
    findByCandidateId: (id) => APP.interviews.getAll().find(i => i.candidateId === id),
    add: (interview) => {
      const list = APP.interviews.getAll();
      const idx = list.findIndex(i => i.candidateId === interview.candidateId);
      if (idx >= 0) list[idx] = interview; else list.push(interview);
      APP.interviews.save(list);

      // Background Sync
      fetch(API_BASE + '/api/interviews/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interview)
      }).then(r => {
        if (r.ok) APP.sync();
      }).catch(err => console.error('Failed to sync interview booking:', err));
    },
    remove: (id) => {
      const list = APP.interviews.getAll().filter(i => i.id !== id);
      APP.interviews.save(list);

      // Background Sync
      fetch(API_BASE + `/api/admin/interviews/${id}`, {
        method: 'DELETE'
      }).then(r => {
        if (r.ok) APP.sync();
      }).catch(err => console.error('Failed to sync interview cancellation:', err));
    },
    generateId: () => 'INT-' + Date.now().toString(36).toUpperCase()
  },

  // ===== QUESTIONS =====
  questions: {
    getAll: () => APP.storage.get('questions') || [],
    save: (list) => APP.storage.set('questions', list),
    findById: (id) => APP.questions.getAll().find(q => q.id === parseInt(id)),
    add: (q) => {
      const list = APP.questions.getAll();
      q.id = list.length ? Math.max(...list.map(x => x.id)) + 1 : 1;
      list.push(q);
      APP.questions.save(list);

      // Background Sync
      fetch(API_BASE + '/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(q)
      }).then(r => {
        if (r.ok) APP.sync();
      }).catch(err => console.error('Failed to sync question creation:', err));

      return q;
    },
    update: (id, data) => {
      const list = APP.questions.getAll().map(q => q.id === parseInt(id) ? { ...q, ...data } : q);
      APP.questions.save(list);

      // Background Sync
      fetch(API_BASE + '/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(id), ...data })
      }).then(r => {
        if (r.ok) APP.sync();
      }).catch(err => console.error('Failed to sync question update:', err));
    },
    delete: (id) => {
      const list = APP.questions.getAll().filter(q => q.id !== parseInt(id));
      APP.questions.save(list);

      // Background Sync
      fetch(API_BASE + `/api/admin/questions/${id}`, {
        method: 'DELETE'
      }).then(r => {
        if (r.ok) APP.sync();
      }).catch(err => console.error('Failed to sync question deletion:', err));
    }
  },

  // ===== CANDIDATE RESPONSES =====
  responses: {
    getAll: () => APP.storage.get('responses') || [],
    save: (list) => APP.storage.set('responses', list),
    findByCandidateId: (id) => APP.responses.getAll().find(r => r.candidateId === id),
    add: (responseObj) => {
      const list = APP.responses.getAll();
      const idx = list.findIndex(r => r.candidateId === responseObj.candidateId);
      if (idx >= 0) list[idx] = responseObj; else list.push(responseObj);
      APP.responses.save(list);
    }
  },

  // ===== ADMIN USERS =====
  adminUsers: {
    getAll: () => APP.storage.get('admin_users') || [],
    save: (list) => APP.storage.set('admin_users', list),
    authenticate: (username, password) => {
      return APP.adminUsers.getAll().find(u => u.username === username.toLowerCase() && u.password === password);
    },
    add: (user) => {
      const list = APP.adminUsers.getAll();
      if (!list.find(u => u.username === user.username.toLowerCase())) {
        list.push(user);
        APP.adminUsers.save(list);
      }
    }
  },

  // ===== EMAILS (Notifications) =====
  emails: {
    getAll: () => APP.storage.get('emails') || [],
    save: (list) => APP.storage.set('emails', list),
    send: (to, subject, body) => {
      const list = APP.emails.getAll();
      const newEmail = {
        id: 'EM-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 3).toUpperCase(),
        to: to.toLowerCase(),
        subject,
        body,
        sentAt: new Date().toISOString(),
        read: false
      };
      list.unshift(newEmail);
      APP.emails.save(list);

      // Background Sync
      fetch(API_BASE + '/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmail)
      }).then(r => {
        if (r.ok) APP.sync();
      }).catch(err => console.error('Failed to sync email log:', err));

      // Dispatch custom event to notify client of new emails
      window.dispatchEvent(new CustomEvent('jk_new_email', { detail: newEmail }));
      return newEmail;
    },
    markAllAsRead: (email) => {
      const list = APP.emails.getAll().map(e => e.to === email.toLowerCase() ? { ...e, read: true } : e);
      APP.emails.save(list);

      // Background Sync
      fetch(API_BASE + '/api/emails/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: email })
      }).then(r => {
        if (r.ok) APP.sync();
      }).catch(err => console.error('Failed to sync email read status:', err));

      window.dispatchEvent(new CustomEvent('jk_emails_updated'));
    },
    getUnreadCount: (email) => {
      return APP.emails.getAll().filter(e => e.to === email.toLowerCase() && !e.read).length;
    }
  },

  // ===== EVALUATION =====
  evaluate: (questions, answers) => {
    let correct = 0, wrong = 0, skipped = 0;
    questions.forEach((q, i) => {
      const ans = answers[i];
      if (ans === null || ans === undefined) { skipped++; }
      else if (ans === q.answer) { correct++; }
      else { wrong++; }
    });
    const total = questions.length;
    const score = Math.round((correct / total) * 100);
    const qualified = score >= APP.PASS_PERCENTAGE;
    return { correct, wrong, skipped, total, score, qualified, percentage: score };
  },

  // ===== UTILS =====
  utils: {
    formatDate: (date) => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    formatTime: (date) => new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    formatDuration: (seconds) => {
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    },
    validateEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    validatePhone: (phone) => /^[6-9]\d{9}$/.test(phone.replace(/\s/g, '')),
    sanitize: (str) => str ? str.replace(/[<>]/g, '') : '',
    debounce: (fn, delay) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); }; }
  },

  // ===== TOAST =====
  toast: (message, type = 'info', duration = 3500) => {
    const container = document.getElementById('toast-container') || (() => {
      const el = document.createElement('div'); el.id = 'toast-container';
      document.body.appendChild(el); return el;
    })();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}`;
    toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'toastIn 0.3s ease reverse'; setTimeout(() => toast.remove(), 300); }, duration);
  },

  // ===== THEME =====
  theme: {
    init: () => {
      const saved = localStorage.getItem('jk_theme') || 'dark';
      APP.theme.set(saved);
    },
    toggle: () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      APP.theme.set(current === 'dark' ? 'light' : 'dark');
    },
    set: (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('jk_theme', theme);
      const btn = document.querySelector('.theme-toggle');
      if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  },

  // ===== NAVIGATION GUARD =====
  guard: {
    requireCandidate: () => {
      const s = APP.session.getCandidate();
      if (!s) { window.location.href = 'register.html'; return false; }
      return s;
    },
    requireAdmin: () => {
      const s = APP.session.getAdmin();
      if (!s) { window.location.href = 'admin.html'; return false; }
      return s;
    },
    redirectIfLoggedIn: () => {
      const s = APP.session.getCandidate();
      if (s) { window.location.href = 'dashboard.html'; return true; }
      return false;
    }
  },

  // ===== ANALYTICS =====
  analytics: () => {
    const candidates = APP.candidates.getAll();
    const results = APP.results.getAll();
    const interviews = APP.interviews.getAll();
    const qualified = results.filter(r => r.qualified);
    const avgScore = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
    return {
      total: candidates.length,
      tested: results.length,
      qualified: qualified.length,
      rejected: results.filter(r => !r.qualified).length,
      interviews: interviews.length,
      avgScore,
      passRate: results.length ? Math.round((qualified.length / results.length) * 100) : 0
    };
  },

  // ===== EXPORT =====
  export: {
    toCSV: (data, filename) => {
      if (!data.length) return APP.toast('No data to export', 'warning');
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(r => Object.values(r).map(v => `"${v}"`).join(','));
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename + '.csv';
      a.click(); URL.revokeObjectURL(url);
      APP.toast('Export successful!', 'success');
    },
    toPDF: (candidateId) => {
      const candidate = APP.candidates.findById(candidateId);
      const result = APP.results.findByCandidateId(candidateId);
      const interview = APP.interviews.findByCandidateId(candidateId);
      if (!candidate || !result) return APP.toast('No report data available', 'error');

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
<!DOCTYPE html><html><head><title>JK Private Limited - Score Report</title>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; color: #0f172a; }
  .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #1a56db; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { width: 60px; height: 60px; background: #1a56db; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: 800; }
  h1 { color: #1a56db; margin: 0; font-size: 1.4rem; }
  h2 { color: #0f172a; margin: 0; font-size: 1rem; font-weight: 400; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 1rem; font-weight: 700; color: #1a56db; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
  .row { display: flex; gap: 20px; margin-bottom: 8px; }
  .label { width: 160px; color: #475569; font-size: 0.9rem; }
  .value { font-weight: 600; font-size: 0.9rem; }
  .score-box { background: ${result.qualified ? '#dcfce7' : '#fee2e2'}; border: 2px solid ${result.qualified ? '#10b981' : '#ef4444'}; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
  .score-big { font-size: 3rem; font-weight: 800; color: ${result.qualified ? '#059669' : '#dc2626'}; }
  .status { font-size: 1.2rem; font-weight: 700; color: ${result.qualified ? '#059669' : '#dc2626'}; }
  .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 0.8rem; color: #94a3b8; }
</style></head><body>
<div class="header">
  <div class="logo">JK</div>
  <div><h1>JK Private Limited</h1><h2>Recruitment Score Report</h2></div>
</div>
<div class="section">
  <div class="section-title">Candidate Information</div>
  <div class="row"><span class="label">Candidate ID:</span><span class="value">${candidate.id}</span></div>
  <div class="row"><span class="label">Full Name:</span><span class="value">${candidate.fullName}</span></div>
  <div class="row"><span class="label">Email:</span><span class="value">${candidate.email}</span></div>
  <div class="row"><span class="label">College:</span><span class="value">${candidate.college}</span></div>
  <div class="row"><span class="label">Department:</span><span class="value">${candidate.department}</span></div>
  <div class="row"><span class="label">CGPA:</span><span class="value">${candidate.cgpa}</span></div>
</div>
<div class="score-box">
  <div class="score-big">${result.score}%</div>
  <div class="status">${result.qualified ? '✅ QUALIFIED' : '❌ NOT QUALIFIED'}</div>
  <p style="color:#475569;margin-top:8px">Correct: ${result.correct} | Wrong: ${result.wrong} | Skipped: ${result.skipped} | Total: ${result.total}</p>
</div>
${interview ? `
<div class="section">
  <div class="section-title">Interview Details</div>
  <div class="row"><span class="label">Interview ID:</span><span class="value">${interview.id}</span></div>
  <div class="row"><span class="label">Date:</span><span class="value">${interview.date}</span></div>
  <div class="row"><span class="label">Time:</span><span class="value">${interview.slot}</span></div>
  <div class="row"><span class="label">Mode:</span><span class="value">${interview.mode}</span></div>
</div>` : ''}
<div class="footer">
  <p>Report generated on ${new Date().toLocaleString('en-IN')} | JK Private Limited Recruitment Portal v1.0</p>
  <p>This is a computer-generated document. For queries, contact hr@jkpvtltd.com</p>
</div>
</body></html>`);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  },

  // ===== ANTI-CHEAT =====
  antiCheat: {
    violations: 0,
    maxViolations: 3,
    init: (onViolation) => {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) APP.antiCheat.flag('Tab switch detected', onViolation);
      });
      document.addEventListener('contextmenu', e => e.preventDefault());
      document.addEventListener('copy', e => e.preventDefault());
      document.addEventListener('keydown', e => {
        if ((e.ctrlKey && ['c', 'v', 'u', 's', 'a', 'p'].includes(e.key.toLowerCase())) || e.key === 'F12')
          e.preventDefault();
      });
    },
    flag: (reason, callback) => {
      APP.antiCheat.violations++;
      APP.toast(`⚠️ Warning (${APP.antiCheat.violations}/${APP.antiCheat.maxViolations}): ${reason}`, 'warning', 4000);

      // Update result record state synchronously if available
      const currentCand = APP.session.getCandidate();
      if (currentCand) {
        const result = APP.results.findByCandidateId(currentCand.id);
        if (result) {
          result.violations = APP.antiCheat.violations;
          APP.results.add(result);
        }
      }

      if (APP.antiCheat.violations >= APP.antiCheat.maxViolations) callback?.('max_violations');
    }
  },

  // ===== DATABASE INITIALIZER =====
  db: {
    init: () => {
      // Trigger background sync to pull latest database records from the SQLite server
      APP.sync();
      APP.theme.init();
    }
  }
};

// Initialize theme and database synchronization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  APP.db.init();

  // Navbar scroll effect
  const nav = document.querySelector('.navbar');
  if (nav) {
    window.addEventListener('scroll', () => { nav.classList.toggle('scrolled', window.scrollY > 20); });
  }

  // Hamburger menu toggle
  const ham = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  if (ham && navLinks) {
    ham.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  // Create toast container if missing
  if (!document.getElementById('toast-container')) {
    const el = document.createElement('div');
    el.id = 'toast-container';
    document.body.appendChild(el);
  }
});
