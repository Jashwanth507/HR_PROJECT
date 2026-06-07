/**
 * JK Private Limited – Performance & Navigation Module
 * Smooth page transitions, font preloading, link prefetching
 */
(function () {
  'use strict';

  // ── 1. FONT PRELOAD ──────────────────────────────────────────────────────
  // Fonts are injected by this script (non-blocking) instead of CSS @import
  function loadFonts() {
    if (document.getElementById('jk-fonts')) return;
    const link = document.createElement('link');
    link.id = 'jk-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=Montserrat:wght@600;700;800;900&display=swap';
    // Insert asynchronously after page paints
    requestAnimationFrame(() => document.head.appendChild(link));
  }

  // ── 2. PAGE TRANSITION OVERLAY ───────────────────────────────────────────
  const PAGE_LINKS = ['index.html', 'login.html', 'register.html', 'test.html', 'dashboard.html', 'admin.html'];

  function createTransitionEl() {
    if (document.getElementById('page-transition')) return;
    const el = document.createElement('div');
    el.id = 'page-transition';
    document.body.prepend(el);
  }

  function navigateTo(url) {
    const el = document.getElementById('page-transition');
    if (!el) { window.location.href = url; return; }
    el.classList.remove('slide-out');
    el.classList.add('slide-in');
    setTimeout(() => { window.location.href = url; }, 120);
  }

  function onPageLoad() {
    const el = document.getElementById('page-transition');
    if (!el) return;
    // Briefly show the overlay coming from right, then slide it out
    el.style.transition = 'none';
    el.classList.remove('slide-in', 'slide-out');
    el.style.transform = 'translateX(100%)';
    // Force reflow
    el.offsetHeight; // eslint-disable-line no-unused-expressions
    el.style.transition = '';
    el.classList.add('slide-out');
    // Remove after animation
    setTimeout(() => {
      el.style.transform = '';
      el.classList.remove('slide-out');
    }, 140);
  }

  // ── 3. INTERCEPT ALL INTERNAL LINKS ──────────────────────────────────────
  function interceptLinks() {
    document.addEventListener('click', function (e) {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      // Only intercept same-origin relative HTML links
      if (!href || href.startsWith('#') || href.startsWith('http') ||
          href.startsWith('mailto') || href.startsWith('tel') ||
          a.target === '_blank') return;
      // Skip if modifier keys held
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      navigateTo(href);
    }, true);
  }

  // ── 4. PREFETCH NEIGHBORING PAGES ────────────────────────────────────────
  function prefetchPages() {
    const currentPage = location.pathname.split('/').pop() || 'index.html';
    const toPrefetch = PAGE_LINKS.filter(p => p !== currentPage).slice(0, 3);
    setTimeout(() => {
      toPrefetch.forEach(url => {
        if (document.querySelector(`link[href="${url}"][rel="prefetch"]`)) return;
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = 'document';
        document.head.appendChild(link);
      });
    }, 2000); // Defer prefetch so it doesn't compete with main page load
  }

  // ── 5. PRECONNECT TO GOOGLE FONTS ────────────────────────────────────────
  function addPreconnect() {
    const origins = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
    origins.forEach(origin => {
      if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      if (origin.includes('gstatic')) link.crossOrigin = 'anonymous';
      document.head.prepend(link);
    });
  }

  // ── 6. LAZY SCROLL ANIMATIONS ─────────────────────────────────────────────
  function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target); // Stop observing once visible
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll(
      '.project-card, .why-card, .process-step, .about-item, .contact-item, .scroll-hidden'
    ).forEach(el => io.observe(el));
  }

  // ── 7. NAVBAR SCROLL (passive for performance) ───────────────────────────
  function initNavbar() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          nav.classList.toggle('scrolled', window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ── 8. DEFER HEAVY ANIMATIONS ON LOW-END DEVICES ─────────────────────────
  function reduceMotionCheck() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--transition', 'none');
      document.querySelectorAll('.hero-orb').forEach(el => {
        el.style.animation = 'none';
      });
    }
  }

  // ── 9. SIMULATED EMAIL WIDGET ─────────────────────────────────────────────
  function initEmailWidget() {
    if (document.getElementById('emailWidgetTrigger')) return;
    
    // Create DOM structure
    const trigger = document.createElement('div');
    trigger.className = 'email-widget-trigger';
    trigger.id = 'emailWidgetTrigger';
    trigger.style.color = '#ffffff';
    trigger.innerHTML = '✉️<div class="email-widget-badge" id="emailWidgetBadge" style="display:none">0</div>';
    
    const panel = document.createElement('div');
    panel.className = 'email-widget-panel';
    panel.id = 'emailWidgetPanel';
    panel.innerHTML = `
      <div class="email-panel-header">
        <div class="email-panel-title">📧 Simulation Email Center</div>
        <button class="email-panel-close" id="emailWidgetClose">&times;</button>
      </div>
      <div class="email-panel-inbox" id="emailWidgetInbox"></div>
      <div class="email-detail-panel" id="emailDetailPanel">
        <div class="email-detail-header">
          <button class="email-back-btn" id="emailDetailBack">← Back</button>
          <div style="font-weight:700;font-size:0.85rem">Message View</div>
        </div>
        <div class="email-detail-content">
          <div class="email-detail-subject" id="emailDetailSubject"></div>
          <div class="email-detail-info" id="emailDetailInfo"></div>
          <div class="email-detail-body" id="emailDetailBody"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(trigger);
    document.body.appendChild(panel);
    
    const badge = document.getElementById('emailWidgetBadge');
    const inbox = document.getElementById('emailWidgetInbox');
    const detailPanel = document.getElementById('emailDetailPanel');
    
    function getActiveUserEmail() {
      if (typeof APP !== 'undefined') {
        const cand = APP.session.getCandidate();
        if (cand) return cand.email;
        const adm = APP.session.getAdmin();
        if (adm) return 'admin@jkpvtltd.com';
      }
      return null;
    }
    
    function updateBadge() {
      if (typeof APP === 'undefined' || !APP.emails) return;
      const activeEmail = getActiveUserEmail();
      let count = 0;
      if (activeEmail) {
        count = APP.emails.getUnreadCount(activeEmail);
      } else {
        count = APP.emails.getAll().filter(e => !e.read).length;
      }
      
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
    
    function renderInbox() {
      if (typeof APP === 'undefined' || !APP.emails) {
        inbox.innerHTML = '<div class="email-inbox-empty">App system not ready.</div>';
        return;
      }
      const activeEmail = getActiveUserEmail();
      let emails = APP.emails.getAll();
      if (activeEmail) {
        emails = emails.filter(e => e.to === activeEmail.toLowerCase());
      }
      
      if (emails.length === 0) {
        inbox.innerHTML = `
          <div class="email-inbox-empty">
            <div style="font-size:2.2rem;margin-bottom:10px">✉️</div>
            No notifications yet.<br>
            <span style="font-size:0.75rem;color:var(--text-light)">Register or take action to trigger system emails.</span>
          </div>`;
        return;
      }
      
      inbox.innerHTML = emails.map(e => {
        const isUnread = !e.read;
        const time = new Date(e.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const date = new Date(e.sentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        
        return `
          <div class="email-list-item ${isUnread ? 'unread' : ''}" data-id="${e.id}">
            <div class="email-item-meta">
              <span class="email-item-to">To: ${e.to}</span>
              <span>${date}, ${time}</span>
            </div>
            <div class="email-item-subject">${e.subject}</div>
            <div class="email-item-body-preview">${e.body.replace(/<[^>]*>/g, '').substring(0, 60)}...</div>
          </div>
        `;
      }).join('');
      
      inbox.querySelectorAll('.email-list-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.getAttribute('data-id');
          const email = APP.emails.getAll().find(e => e.id === id);
          if (email) {
            email.read = true;
            const allEmails = APP.emails.getAll().map(x => x.id === id ? email : x);
            APP.emails.save(allEmails);
            item.classList.remove('unread');
            updateBadge();
            
            document.getElementById('emailDetailSubject').textContent = email.subject;
            document.getElementById('emailDetailInfo').innerHTML = `
              <strong>From:</strong> JK Recruitment &lt;no-reply@jkpvtltd.com&gt;<br>
              <strong>To:</strong> ${email.to}<br>
              <strong>Date:</strong> ${new Date(email.sentAt).toLocaleString('en-IN')}
            `;
            document.getElementById('emailDetailBody').innerHTML = email.body;
            detailPanel.classList.add('active');
          }
        });
      });
    }
    
    trigger.addEventListener('click', () => {
      panel.classList.toggle('active');
      if (panel.classList.contains('active')) {
        renderInbox();
        const activeEmail = getActiveUserEmail();
        if (activeEmail && typeof APP !== 'undefined' && APP.emails) {
          APP.emails.markAllAsRead(activeEmail);
        } else if (typeof APP !== 'undefined' && APP.emails) {
          const allRead = APP.emails.getAll().map(x => ({ ...x, read: true }));
          APP.emails.save(allRead);
        }
        updateBadge();
      } else {
        detailPanel.classList.remove('active');
      }
    });
    
    document.getElementById('emailWidgetClose').addEventListener('click', () => {
      panel.classList.remove('active');
      detailPanel.classList.remove('active');
    });
    
    document.getElementById('emailDetailBack').addEventListener('click', () => {
      detailPanel.classList.remove('active');
      renderInbox();
    });
    
    window.addEventListener('jk_new_email', () => {
      updateBadge();
      if (panel.classList.contains('active')) {
        renderInbox();
      }
    });
    
    window.addEventListener('jk_emails_updated', () => {
      updateBadge();
      if (panel.classList.contains('active')) {
        renderInbox();
      }
    });
    
    setTimeout(updateBadge, 500);
  }

  // ── 10. CONNECTION SETTINGS WIDGET ──────────────────────────────────────────
  function initConnectionWidget() {
    if (document.getElementById('connWidgetTrigger')) return;

    // Inject CSS styles dynamically
    const style = document.createElement('style');
    style.innerHTML = `
      .conn-widget-trigger {
        position: fixed; bottom: 24px; left: 24px;
        width: 52px; height: 52px; border-radius: 50%;
        background: var(--surface2); border: 2px solid var(--border);
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; cursor: pointer; z-index: 1500;
        transition: var(--transition);
        box-shadow: var(--shadow-sm);
        user-select: none;
      }
      .conn-widget-trigger:hover {
        transform: scale(1.08) rotate(30deg);
        border-color: var(--sky);
      }
      .conn-panel {
        position: fixed; bottom: 86px; left: 24px;
        width: 320px; background: var(--surface);
        border: 1.5px solid var(--border); border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg); z-index: 1500;
        padding: 20px; display: none; flex-direction: column; gap: 12px;
        animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        text-align: left;
      }
      .conn-panel.active { display: flex; }
      .conn-status { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 0.85rem; }
      .conn-btn-row { display: flex; gap: 8px; margin-top: 6px; }
      .conn-help { font-size: 0.72rem; color: var(--text-muted); line-height: 1.4; border-top: 1px dashed var(--border); padding-top: 10px; margin-top: 4px; }
      @media (max-width: 420px) {
        .conn-panel {
          width: calc(100% - 32px) !important;
          left: 16px !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Create DOM structure
    const trigger = document.createElement('div');
    trigger.className = 'conn-widget-trigger';
    trigger.id = 'connWidgetTrigger';
    trigger.innerHTML = '⚙️';
    trigger.title = 'Connection Settings';

    const panel = document.createElement('div');
    panel.className = 'conn-panel';
    panel.id = 'connWidgetPanel';
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:8px; margin-bottom:4px;">
        <strong style="font-size:0.92rem;font-family:var(--font-heading);color:var(--text)">⚙️ Connection Settings</strong>
        <button id="connWidgetClose" style="background:transparent; border:none; font-size:1.4rem; cursor:pointer; color:var(--text-light);">&times;</button>
      </div>
      <div style="font-size:0.8rem;color:var(--text-body);display:flex;justify-content:space-between;align-items:center;">
        <span>Status: <span class="conn-status" id="connStatusText" style="color:#ef4444">🔴 Checking...</span></span>
        <span id="connSSLBadge" style="font-size:0.68rem;padding:2px 6px;border-radius:4px;background:rgba(16,185,129,0.15);color:#10b981;font-weight:700;">HTTPS</span>
      </div>
      <div id="connMixedWarning" style="display:none;font-size:0.7rem;padding:8px 10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:var(--radius-sm);color:#ef4444;line-height:1.35;">
        ⚠️ <strong>Mixed Content Block:</strong> Since this app is on HTTPS, your browser blocks HTTP local IPs. Please use an <strong>HTTPS Tunnel</strong> (like <code>ngrok</code>) for your backend.
      </div>
      <div style="display:flex; flex-direction:column; gap:4px;">
        <label style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-light)">Laptop Server URL</label>
        <input type="text" id="connBackendInput" class="form-control" style="padding:8px 12px; font-size:0.82rem;" placeholder="e.g. https://xxxx.ngrok-free.app" />
      </div>
      <div class="conn-btn-row" style="display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; gap:8px; width:100%;">
          <button id="connTestBtn" class="btn btn-secondary btn-sm" style="flex:1; padding:8px 10px; font-size:0.75rem;border-radius:var(--radius-sm)">Test Ping</button>
          <button id="connSaveBtn" class="btn btn-primary btn-sm" style="flex:1; padding:8px 10px; font-size:0.75rem;border-radius:var(--radius-sm)">Save & Connect</button>
        </div>
        <button id="connResetBtn" class="btn btn-secondary btn-sm" style="width:100%; padding:6px 10px; font-size:0.72rem; border-color:#ef4444; color:#ef4444; background:rgba(239,68,68,0.04); border-radius:var(--radius-sm);">Reset to Default Production Backend</button>
      </div>
      <div class="conn-help" style="max-height: 180px; overflow-y: auto;">
        <strong>Mobile Connection Guide:</strong>
        <div style="margin-top:5px; padding-left:6px; border-left:2px solid var(--sky);">
          <strong>Option A (Recommended for HTTPS)</strong><br>
          1. Install and run on your laptop:<br>
          <code style="background:var(--surface2);padding:2px 4px;font-size:0.65rem;border-radius:3px;display:inline-block;margin:2px 0;">ngrok http 3000</code><br>
          2. Copy the secure <code>https://...ngrok-free.app</code> URL.<br>
          3. Enter it above and save.
        </div>
        <div style="margin-top:6px; padding-left:6px; border-left:2px solid var(--text-muted); opacity: 0.7;">
          <strong>Option B (Local IP - HTTP only)</strong><br>
          1. Connect phone & laptop to same Wi-Fi.<br>
          2. Enter laptop IP (e.g. <code>http://192.168.X.X:3000</code>).<br>
          <em>*Will be blocked on Netlify due to browser HTTPS mixed content.</em>
        </div>
      </div>
    `;

    document.body.appendChild(trigger);
    document.body.appendChild(panel);

    const input = document.getElementById('connBackendInput');
    const statusText = document.getElementById('connStatusText');
    const testBtn = document.getElementById('connTestBtn');
    const saveBtn = document.getElementById('connSaveBtn');
    const warningEl = document.getElementById('connMixedWarning');
    const sslBadge = document.getElementById('connSSLBadge');

    // Set SSL badge status
    if (window.location.protocol === 'https:') {
      sslBadge.textContent = '🔒 HTTPS';
      sslBadge.style.color = '#10b981';
      sslBadge.style.background = 'rgba(16,185,129,0.15)';
    } else {
      sslBadge.textContent = '🔓 HTTP';
      sslBadge.style.color = '#f59e0b';
      sslBadge.style.background = 'rgba(245,158,11,0.15)';
    }

    function checkMixedContentWarning(url) {
      if (window.location.protocol === 'https:') {
        const trimmedUrl = url.trim().toLowerCase();
        const isHttp = trimmedUrl.startsWith('http://');
        const isLoopback = trimmedUrl.includes('localhost') || trimmedUrl.includes('127.0.0.1');
        
        if (isHttp && !isLoopback) {
          warningEl.style.display = 'block';
          return;
        }
      }
      warningEl.style.display = 'none';
    }

    // Populate current config
    const _hardcoded = 'https://hr-project-sqfw.onrender.com';
    const isFrontendHost = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('netlify.app');
    const defaultBackend = (window.location.protocol === 'file:')
      ? 'http://localhost:3000'
      : (isFrontendHost ? _hardcoded : window.location.origin);

    const currentBackend = localStorage.getItem('jk_backend_url') || defaultBackend;
    input.value = currentBackend;
    checkMixedContentWarning(currentBackend);

    input.addEventListener('input', (e) => {
      checkMixedContentWarning(e.target.value);
    });

    // Check status function
    function checkConnection(urlToCheck) {
      statusText.innerHTML = '🟡 Checking...';
      statusText.style.color = '#f59e0b';
      
      const cleanUrl = urlToCheck.replace(/\/$/, '');
      fetch(cleanUrl + '/api/db')
        .then(r => {
          if (r.ok) {
            statusText.innerHTML = '🟢 Connected';
            statusText.style.color = '#10b981';
            if (typeof APP !== 'undefined') APP.toast('Connection test successful!', 'success');
            return true;
          }
          throw new Error();
        })
        .catch(() => {
          statusText.innerHTML = '🔴 Disconnected';
          statusText.style.color = '#ef4444';
          if (typeof APP !== 'undefined') APP.toast('Connection failed. Verify server is running.', 'error');
          return false;
        });
    }

    // Toggle panel
    trigger.addEventListener('click', () => {
      panel.classList.toggle('active');
      if (panel.classList.contains('active')) {
        checkConnection(input.value.trim());
        checkMixedContentWarning(input.value.trim());
      }
    });

    document.getElementById('connWidgetClose').addEventListener('click', () => {
      panel.classList.remove('active');
    });

    // Test ping button
    testBtn.addEventListener('click', () => {
      const url = input.value.trim();
      if (!url) return typeof APP !== 'undefined' ? APP.toast('Please enter a URL', 'warning') : alert('Enter URL');
      checkConnection(url);
    });

    // Save and connect button
    saveBtn.addEventListener('click', () => {
      const url = input.value.trim();
      if (!url) return typeof APP !== 'undefined' ? APP.toast('Please enter a URL', 'warning') : alert('Enter URL');
      
      localStorage.setItem('jk_backend_url', url);
      if (typeof APP !== 'undefined') {
        APP.toast('Settings saved! Reloading page...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        window.location.reload();
      }
    });

    // Reset to default button
    document.getElementById('connResetBtn').addEventListener('click', () => {
      localStorage.removeItem('jk_backend_url');
      if (typeof APP !== 'undefined') {
        APP.toast('Reset to default backend. Reloading...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        window.location.reload();
      }
    });

    // Auto check status on load
    setTimeout(() => {
      const activeUrl = (typeof APP !== 'undefined') ? APP.API_BASE : (window.location.protocol === 'file:' ? 'http://localhost:3000' : '');
      fetch(activeUrl + '/api/db')
        .then(r => {
          if (r.ok) {
            statusText.innerHTML = '🟢 Connected';
            statusText.style.color = '#10b981';
          }
        })
        .catch(() => {
          statusText.innerHTML = '🔴 Disconnected';
          statusText.style.color = '#ef4444';
        });
    }, 1000);
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  addPreconnect();
  loadFonts();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    createTransitionEl();
    onPageLoad();
    interceptLinks();
    initScrollAnimations();
    initNavbar();
    prefetchPages();
    reduceMotionCheck();
    initEmailWidget();
    initConnectionWidget();
  }

})();
