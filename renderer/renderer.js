(() => {
  const api = window.snapExpand;

  let shortcuts = [];
  let settings = null;
  let editingId = null;
  let sortValue = 'dateAdded-desc';
  let searchTerm = '';

  // ---------- Elements ----------
  const navItems = document.querySelectorAll('.nav-item');
  const views = {
    shortcuts: document.getElementById('view-shortcuts'),
    settings: document.getElementById('view-settings')
  };

  const shortcutList = document.getElementById('shortcutList');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');

  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const shortcutForm = document.getElementById('shortcutForm');
  const triggerInput = document.getElementById('triggerInput');
  const expansionInput = document.getElementById('expansionInput');
  const formError = document.getElementById('formError');

  const masterEnableToggle = document.getElementById('masterEnableToggle');
  const statusLine = document.getElementById('statusLine');

  const modeGlobal = document.getElementById('modeGlobal');
  const modeBrowsers = document.getElementById('modeBrowsers');
  const browserChecks = document.getElementById('browserChecks');
  const browserChrome = document.getElementById('browserChrome');
  const browserEdge = document.getElementById('browserEdge');
  const launchAtLoginToggle = document.getElementById('launchAtLoginToggle');

  const toast = document.getElementById('toast');
  let toastTimer = null;

  // ---------- Navigation ----------
  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      navItems.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      Object.entries(views).forEach(([key, el]) => {
        el.hidden = key !== btn.dataset.view;
      });
    });
  });

  // ---------- Toast ----------
  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  // ---------- Rendering ----------
  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getSorted(list) {
    const [field, dir] = sortValue.split('-');
    const sorted = [...list].sort((a, b) => {
      let cmp;
      if (field === 'name') {
        cmp = a.trigger.localeCompare(b.trigger, undefined, { sensitivity: 'base' });
      } else {
        cmp = new Date(a[field]) - new Date(b[field]);
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }

  function getFiltered(list) {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (s) => s.trigger.toLowerCase().includes(term) || s.expansion.toLowerCase().includes(term)
    );
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderList() {
    const filtered = getFiltered(shortcuts);
    const sorted = getSorted(filtered);

    shortcutList.innerHTML = '';

    if (shortcuts.length === 0) {
      emptyState.hidden = false;
      shortcutList.hidden = true;
      return;
    }

    emptyState.hidden = true;
    shortcutList.hidden = false;

    if (sorted.length === 0) {
      shortcutList.innerHTML = `<div class="empty-state"><p>No shortcuts match "${escapeHtml(searchTerm)}".</p></div>`;
      return;
    }

    for (const s of sorted) {
      const row = document.createElement('div');
      row.className = 'shortcut-row';
      row.innerHTML = `
        <div class="shortcut-trigger">${escapeHtml(s.trigger)}</div>
        <div class="shortcut-expansion" title="${escapeHtml(s.expansion)}">${escapeHtml(s.expansion)}</div>
        <div class="shortcut-date">${formatDate(s.dateAdded)}</div>
        <div class="shortcut-actions">
          <button class="btn icon-btn" data-action="edit" data-id="${s.id}" title="Edit">&#9998;</button>
          <button class="btn icon-btn danger" data-action="delete" data-id="${s.id}" title="Delete">&#10005;</button>
        </div>
      `;
      shortcutList.appendChild(row);
    }
  }

  shortcutList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const shortcut = shortcuts.find((s) => s.id === id);
    if (!shortcut) return;

    if (btn.dataset.action === 'edit') {
      openModal(shortcut);
    } else if (btn.dataset.action === 'delete') {
      await api.deleteShortcut(id);
      showToast(`Deleted "${shortcut.trigger}"`);
      await refreshShortcuts();
    }
  });

  // ---------- Modal ----------
  function openModal(shortcut) {
    editingId = shortcut ? shortcut.id : null;
    modalTitle.textContent = shortcut ? 'Edit shortcut' : 'Add shortcut';
    triggerInput.value = shortcut ? shortcut.trigger : '';
    expansionInput.value = shortcut ? shortcut.expansion : '';
    formError.hidden = true;
    modalOverlay.hidden = false;
    setTimeout(() => triggerInput.focus(), 0);
  }

  function closeModal() {
    modalOverlay.hidden = true;
    shortcutForm.reset();
    editingId = null;
  }

  document.getElementById('openAddModal').addEventListener('click', () => openModal(null));
  document.getElementById('emptyAddBtn').addEventListener('click', () => openModal(null));
  document.getElementById('cancelModal').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  shortcutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = { trigger: triggerInput.value.trim(), expansion: expansionInput.value };
    try {
      if (editingId) {
        await api.updateShortcut(editingId, payload);
        showToast('Shortcut updated');
      } else {
        await api.addShortcut(payload);
        showToast('Shortcut added');
      }
      closeModal();
      await refreshShortcuts();
    } catch (err) {
      formError.textContent = err.message || 'Something went wrong.';
      formError.hidden = false;
    }
  });

  // ---------- Search / sort ----------
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderList();
  });
  sortSelect.addEventListener('change', (e) => {
    sortValue = e.target.value;
    renderList();
  });

  // ---------- Settings ----------
  function renderSettings() {
    if (!settings) return;
    masterEnableToggle.checked = settings.enabled;
    statusLine.textContent = settings.enabled ? 'Running — expansion active' : 'Paused';

    modeGlobal.checked = settings.mode === 'global';
    modeBrowsers.checked = settings.mode === 'browsers';
    browserChecks.style.opacity = settings.mode === 'browsers' ? '1' : '0.45';
    browserChecks.style.pointerEvents = settings.mode === 'browsers' ? 'auto' : 'none';

    browserChrome.checked = !!settings.browsers.chrome;
    browserEdge.checked = !!settings.browsers.edge;

    launchAtLoginToggle.checked = !!settings.launchAtLogin;
  }

  masterEnableToggle.addEventListener('change', async (e) => {
    settings = await api.updateSettings({ enabled: e.target.checked });
    renderSettings();
  });

  [modeGlobal, modeBrowsers].forEach((radio) => {
    radio.addEventListener('change', async () => {
      settings = await api.updateSettings({ mode: modeGlobal.checked ? 'global' : 'browsers' });
      renderSettings();
    });
  });

  [browserChrome, browserEdge].forEach((cb) => {
    cb.addEventListener('change', async () => {
      settings = await api.updateSettings({
        browsers: { chrome: browserChrome.checked, edge: browserEdge.checked }
      });
      renderSettings();
    });
  });

  launchAtLoginToggle.addEventListener('change', async (e) => {
    settings = await api.updateSettings({ launchAtLogin: e.target.checked });
    renderSettings();
  });

  // ---------- Data refresh ----------
  async function refreshShortcuts() {
    shortcuts = await api.listShortcuts();
    renderList();
  }

  async function refreshSettings() {
    settings = await api.getSettings();
    renderSettings();
  }

  api.onShortcutsChanged((data) => { shortcuts = data; renderList(); });
  api.onSettingsChanged((data) => { settings = data; renderSettings(); });
  api.onExpansionFired((shortcut) => showToast(`Expanded "${shortcut.trigger}"`));

  // ---------- Init ----------
  (async function init() {
    await Promise.all([refreshShortcuts(), refreshSettings()]);
  })();
})();
