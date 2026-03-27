/* ═══════════════════════════════════════
   ElevateMe — Shared JavaScript v2
   Supabase-powered progress tracking
   Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY below
═══════════════════════════════════════ */

const SUPABASE_URL = 'https://jlfbmawoyiwzvzklngxr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZmJtYXdveWl3enZ6a2xuZ3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDI0OTMsImV4cCI6MjA4OTUxODQ5M30.JuMbxTyAhujTB4RqPiKbn5d4pxqK67EO_CTBj1xwt9o';
const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const IS_ADMIN = new URLSearchParams(location.search).get('admin') === 'true';
if (IS_ADMIN) document.body.classList.add('is-admin');

let currentUser = null;
let completed   = {};
let videos      = JSON.parse(localStorage.getItem('em_videos') || '{}');

// ── AUTH GUARD — redirects to login if not signed in ──
async function initAuth() {
    const { data: { session } } = await _sb.auth.getSession();
    if (!session) { window.location.href = '../login.html'; return false; }
    currentUser = session.user;
    await _sb.from('profiles').upsert({
        id: currentUser.id, email: currentUser.email,
        last_login: new Date().toISOString()
    }, { onConflict: 'id' });
    await loadProgress();
    return true;
}

async function loadProgress() {
    if (!currentUser) return;
    const { data } = await _sb.from('progress').select('module_id').eq('user_id', currentUser.id);
    completed = {};
    if (data) data.forEach(r => { completed[r.module_id] = true; });
}

async function saveModuleProgress(moduleId, isComplete) {
    if (!currentUser) return;
    if (isComplete) {
        await _sb.from('progress').upsert({
            user_id: currentUser.id, module_id: moduleId,
            completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,module_id' });
    } else {
        await _sb.from('progress').delete().eq('user_id', currentUser.id).eq('module_id', moduleId);
    }
    await syncWeekProgress();
}

async function syncWeekProgress() {
    if (!currentUser || !window.WEEK_MODULES || !window.WEEK_NUM) return;
    const total = window.WEEK_MODULES.length;
    const done  = window.WEEK_MODULES.filter(m => completed[m.id]).length;
    const pct   = total ? Math.round(done / total * 100) : 0;
    const update = { id: currentUser.id };
    update[`week${window.WEEK_NUM}_progress`] = pct;
    await _sb.from('profiles').upsert(update, { onConflict: 'id' });
    localStorage.setItem(`em_week${window.WEEK_NUM}_progress`, pct);
}

// ── TOAST ──
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// ── COMPLETE / TOGGLE ──
function markModuleComplete(id) {
    if (completed[id]) return;
    completed[id] = true;
    document.querySelectorAll(`input[type="checkbox"][data-module="${id}"]`).forEach(cb => { cb.checked = true; });
    const bar = document.getElementById(`ctbar-${id}`);
    if (bar) bar.classList.add('done');
    const sideBtn = document.querySelector(`.sidebar-module-btn[data-module="${id}"]`);
    if (sideBtn) sideBtn.classList.add('done');
    saveModuleProgress(id, true);
    updateProgress();
    showToast('✓ Module completed!');
}

window.toggleModule = function(cb) {
    const id = cb.dataset.module;
    completed[id] = cb.checked;
    if (!cb.checked) delete completed[id];
    const bar = document.getElementById(`ctbar-${id}`);
    if (bar) bar.classList.toggle('done', cb.checked);
    const sideBtn = document.querySelector(`.sidebar-module-btn[data-module="${id}"]`);
    if (sideBtn) sideBtn.classList.toggle('done', cb.checked);
    saveModuleProgress(id, cb.checked);
    updateProgress();
    showToast(cb.checked ? '✓ Module marked complete!' : 'Module unmarked');
};

// ── VIDEO ──
function toEmbedUrl(url) {
    let m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0&enablejsapi=1`;
    m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return `https://player.vimeo.com/video/${m[1]}?api=1`;
    m = url.match(/\/file\/d\/([^/]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    return url;
}

function applyVideo(moduleId, url) {
    let wrap = document.getElementById(`vwrap-${moduleId}`);
    if (!wrap) { const urlRow = document.getElementById(`vid-input-${moduleId}`)?.closest('.lesson-video-url-row'); if (urlRow) { wrap = document.createElement('div'); wrap.className = 'lesson-video-wrap'; wrap.id = `vwrap-${moduleId}`; urlRow.parentNode.insertBefore(wrap, urlRow); } }
    if (!wrap) return;
    const embed = toEmbedUrl(url);
    if (embed.includes('youtube.com/embed')) {
        wrap.innerHTML = `<iframe id="yt-${moduleId}" src="${embed}&origin=${encodeURIComponent(location.origin)}" allowfullscreen allow="autoplay"></iframe>`;
    } else if (embed.includes('player.vimeo')) {
        wrap.innerHTML = `<iframe id="vm-${moduleId}" src="${embed}" allowfullscreen></iframe>`;
    } else if (embed.includes('drive.google.com')) {
        wrap.innerHTML = `<iframe src="${embed}" allowfullscreen></iframe>`;
    } else {
        const vid = document.createElement('video'); vid.src = url; vid.controls = true; vid.muted = true; vid.autoplay = true; vid.style.cssText = 'width:100%;height:100%;';
        vid.addEventListener('ended', () => markModuleComplete(moduleId));
        wrap.innerHTML = ''; wrap.appendChild(vid);
    }
    const inp = document.getElementById(`vid-input-${moduleId}`);
    if (inp) inp.value = url;
}

window.addEventListener('message', function(e) {
    try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && data.event === 'onStateChange' && data.info === 0) {
            document.querySelectorAll('iframe[id^="yt-"]').forEach(iframe => { if (iframe.contentWindow === e.source) markModuleComplete(iframe.id.replace('yt-', '')); });
        }
        if (data && data.event === 'finish') {
            document.querySelectorAll('iframe[id^="vm-"]').forEach(iframe => { if (iframe.contentWindow === e.source) markModuleComplete(iframe.id.replace('vm-', '')); });
        }
    } catch(_) {}
});

window.saveVideo = function(id) {
    const inp = document.getElementById(`vid-input-${id}`); if (!inp) return;
    const url = inp.value.trim(); if (!url) { showToast('Please paste a URL first'); return; }
    videos[id] = url; localStorage.setItem('em_videos', JSON.stringify(videos));
    applyVideo(id, url); showToast('Video saved!');
};

window.clearVideo = function(id) {
    delete videos[id]; localStorage.setItem('em_videos', JSON.stringify(videos));
    const wrap = document.getElementById(`vwrap-${id}`);
    if (wrap) wrap.innerHTML = `<div class="lesson-video-placeholder"><i class="fas fa-play-circle"></i><span>Video lesson coming soon</span></div>`;
    const inp = document.getElementById(`vid-input-${id}`); if (inp) inp.value = '';
    showToast('Video removed');
};

function applyGDrivePreset(moduleId, originalUrl) {
    const m = originalUrl.match(/\/file\/d\/([^/]+)/);
    const embedUrl = m ? `https://drive.google.com/file/d/${m[1]}/preview` : originalUrl;
    const wrap = document.getElementById(`vwrap-${moduleId}`); if (!wrap) return;
    wrap.innerHTML = `<iframe src="${embedUrl}" allowfullscreen allow="autoplay"></iframe>`;
    const inp = document.getElementById(`vid-input-${moduleId}`); if (inp) inp.value = originalUrl;
}

// ── NAVIGATION ──
const activeModule = {};

window.navigateModule = function(weekNum, dir) {
    const modules = window.WEEK_MODULES || []; if (!modules.length) return;
    const cur = activeModule[weekNum] || 0;
    if (dir > 0) markModuleComplete(modules[cur].id);
    showModule(weekNum, Math.max(0, Math.min(modules.length - 1, cur + dir)));
};

window.showModule = function(weekNum, idx) {
    const modules = window.WEEK_MODULES || []; if (!modules.length) return;
    activeModule[weekNum] = idx;
    document.querySelectorAll('.sidebar-module-btn').forEach(btn => btn.classList.toggle('active', +btn.dataset.idx === idx));
    document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`panel-${modules[idx].id}`);
    if (panel) { panel.classList.add('active'); panel.querySelectorAll('.step-dot').forEach((dot, di) => { dot.classList.remove('done','active'); if (di < idx) dot.classList.add('done'); else if (di === idx) dot.classList.add('active'); }); }
    const contentEl = document.querySelector('.week-content'); if (contentEl) contentEl.scrollTop = 0;
    const prevBtn = document.getElementById(`w${weekNum}-prev`); if (prevBtn) prevBtn.disabled = idx === 0;
    const nextBtn = document.getElementById(`w${weekNum}-next`); if (nextBtn) nextBtn.disabled = idx === modules.length - 1;
};

// ── PROGRESS UI ──
function updateProgress() {
    const modules = window.WEEK_MODULES || [];
    const total = modules.length, done = modules.filter(m => completed[m.id]).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    document.querySelectorAll('.week-fill').forEach(el => { el.style.width = pct + '%'; });
    document.querySelectorAll('.week-pct').forEach(el  => { el.textContent = pct + '%'; });
    modules.forEach(m => {
        const btn = document.querySelector(`.sidebar-module-btn[data-module="${m.id}"]`); if (btn) btn.classList.toggle('done', !!completed[m.id]);
        const cb  = document.querySelector(`input[type="checkbox"][data-module="${m.id}"]`); if (cb) cb.checked = !!completed[m.id];
        const bar = document.getElementById(`ctbar-${m.id}`); if (bar) bar.classList.toggle('done', !!completed[m.id]);
    });
}

function restoreVideos() {
    (window.WEEK_MODULES || []).forEach(m => {
        if (videos[m.id]) applyVideo(m.id, videos[m.id]);
        else if (m.videoUrl) applyGDrivePreset(m.id, m.videoUrl);
    });
}

// ── LOGO ──
document.querySelectorAll('.logo-area').forEach(el => {
    el.innerHTML = '<img src="https://elevateme.pro/wp-content/themes/elevateme/assets/images/logo.svg" alt="ElevateMe" style="height:32px;width:auto;display:block;">';
});

// ── SIGN OUT ──
window.signOut = async function() {
    await _sb.auth.signOut();
    window.location.href = '../login.html';
};

// ── BUILD PAGE ──
function buildWeekPage(weekNum, modules) {
    window.WEEK_NUM = weekNum; window.WEEK_MODULES = modules;
    const sidebar = document.getElementById('weekSidebar');
    const content = document.getElementById('weekContent');
    if (!sidebar || !content) return;
    sidebar.innerHTML = ''; content.innerHTML = '';

    modules.forEach((mod, idx) => {
        const btn = document.createElement('button');
        btn.className = 'sidebar-module-btn'; btn.dataset.module = mod.id; btn.dataset.idx = idx;
        btn.innerHTML = `<span class="sm-check"><i class="fas fa-check"></i></span><span class="sm-text"><span class="sm-title">${mod.title}${mod.optional ? ' <small style="opacity:.6;font-weight:400;">(opt)</small>' : ''}</span><span class="sm-subtitle">${mod.subtitle || ''}</span></span>`;
        btn.addEventListener('click', () => showModule(weekNum, idx));
        sidebar.appendChild(btn);

        const dotsHTML = modules.map((_, di) => `<span class="step-dot ${di < idx ? 'done' : di === idx ? 'active' : ''}"></span>`).join('');
        const tkHTML = (mod.takeaways || []).map(t => `<li><span class="tk-bullet"><i class="fas fa-check" style="font-size:0.55rem;"></i></span>${t}</li>`).join('');
        const resHTML = (mod.resources || []).map(r => { const href = r.url && r.url !== '#' ? r.url : '#'; return `<a href="${href}" ${href !== '#' ? 'target="_blank"' : ''} class="resource-item"><i class="fas ${r.icon}"></i>${r.label}<span class="res-tag">${r.tag}</span></a>`; }).join('');
        const showVideo = !!(mod.videoUrl || mod.hasVideo);
        const isLast = idx === modules.length - 1;

        const panel = document.createElement('div');
        panel.className = 'module-panel'; panel.id = `panel-${mod.id}`;
        panel.innerHTML = `
            <div class="lesson-step-indicator">
                <span class="step-pill">Lesson ${idx+1} of ${modules.length}</span>
                <span style="color:#b2bec3;">·</span><span>${mod.subtitle || ''}</span>
                ${mod.optional ? '<span style="background:#e1ede8;padding:0.15rem 0.6rem;border-radius:20px;font-size:0.68rem;color:#7f8c8d;">Optional</span>' : ''}
                <div class="step-dots" style="margin-left:auto;">${dotsHTML}</div>
            </div>
            ${showVideo ? `<div class="lesson-video-wrap" id="vwrap-${mod.id}"><div class="lesson-video-placeholder"><i class="fas fa-play-circle"></i><span>Video lesson coming soon</span></div></div>` : ''}
            <div class="lesson-video-url-row">
                <input class="video-url-input" id="vid-input-${mod.id}" placeholder="Paste YouTube, Vimeo or Google Drive URL…" style="flex:1;"/>
                <button class="btn-save-url" onclick="saveVideo('${mod.id}')"><i class="fas fa-save"></i> Save</button>
                <button class="btn-clear-url" onclick="clearVideo('${mod.id}')" title="Remove"><i class="fas fa-times"></i></button>
            </div>
            <div class="lesson-notes-card"><div class="notes-header"><i class="fas fa-book-open"></i> Lesson Notes</div>${mod.notes || ''}</div>
            ${tkHTML ? `<div class="takeaways-card"><div class="tk-header"><i class="fas fa-star"></i> Key Takeaways</div><ul class="takeaways-list">${tkHTML}</ul></div>` : ''}
            ${mod.action ? `<div class="action-card"><div class="action-icon"><i class="fas fa-bolt"></i></div><div class="action-text"><div class="action-label">Your Action Item</div><p>${mod.action}</p></div></div>` : ''}
            ${resHTML ? `<div class="resources-card"><div class="res-header"><i class="fas fa-paperclip"></i> Resources &amp; Downloads</div><div class="resources-list">${resHTML}</div></div>` : ''}
            <div class="complete-toggle-bar ${completed[mod.id] ? 'done' : ''}" id="ctbar-${mod.id}">
                <label class="complete-toggle">
                    <input type="checkbox" data-module="${mod.id}" onchange="toggleModule(this)" ${completed[mod.id] ? 'checked' : ''}>
                    <span class="check-box"><i class="fas fa-check"></i></span>
                    <span class="toggle-label">Mark as complete</span>
                </label>
                <div class="done-msg"><i class="fas fa-check-circle"></i> Completed!</div>
                ${isLast ? `<button class="next-module-btn" style="background:var(--brand-accent);" onclick="markModuleComplete('${mod.id}');window.location.href='../';">Finish Week <i class="fas fa-flag-checkered"></i></button>` : `<button class="next-module-btn" onclick="navigateModule(${weekNum},1)">Next Lesson <i class="fas fa-arrow-right"></i></button>`}
            </div>`;
        content.appendChild(panel);
    });

    initAuth().then(ok => { if (!ok) return; showModule(weekNum, 0); restoreVideos(); updateProgress(); });
}
