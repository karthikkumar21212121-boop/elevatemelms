/* ═══════════════════════════════════════
   ElevateMe — Shared JavaScript
   All week pages load this file
═══════════════════════════════════════ */

// ── ADMIN MODE ──
// Students: yourdomain.com/week1
// Admin:    yourdomain.com/week1?admin=true
const IS_ADMIN = new URLSearchParams(location.search).get('admin') === 'true';
if (IS_ADMIN) document.body.classList.add('is-admin');

// ── STORAGE KEYS ──
const STORAGE = {
    completed: 'em_completed',
    videos:    'em_videos',
};

let completed = JSON.parse(localStorage.getItem(STORAGE.completed) || '{}');
let videos    = JSON.parse(localStorage.getItem(STORAGE.videos)    || '{}');

function saveState() {
    localStorage.setItem(STORAGE.completed, JSON.stringify(completed));
    localStorage.setItem(STORAGE.videos,    JSON.stringify(videos));
}

// ── TOAST ──
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// ── MARK MODULE COMPLETE (auto) ──
function markModuleComplete(id) {
    if (completed[id]) return;
    completed[id] = true;
    document.querySelectorAll(`input[type="checkbox"][data-module="${id}"]`)
        .forEach(cb => { cb.checked = true; });
    const bar = document.getElementById(`ctbar-${id}`);
    if (bar) bar.classList.add('done');
    const sideBtn = document.querySelector(`.sidebar-module-btn[data-module="${id}"]`);
    if (sideBtn) sideBtn.classList.add('done');
    saveState();
    updateProgress();
    showToast('✓ Module completed!');
}

// ── TOGGLE MODULE (manual checkbox) ──
window.toggleModule = function(cb) {
    const id = cb.dataset.module;
    completed[id] = cb.checked;
    if (!cb.checked) delete completed[id];
    const bar = document.getElementById(`ctbar-${id}`);
    if (bar) bar.classList.toggle('done', cb.checked);
    const sideBtn = document.querySelector(`.sidebar-module-btn[data-module="${id}"]`);
    if (sideBtn) sideBtn.classList.toggle('done', cb.checked);
    saveState();
    updateProgress();
    showToast(cb.checked ? '✓ Module marked complete!' : 'Module unmarked');
};

// ── VIDEO EMBED ──
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
    let wrap  = document.getElementById(`vwrap-${moduleId}`);
    const thumb = document.querySelector(`.video-thumb[data-module="${moduleId}"]`);

    // Create wrap on the fly if admin adds video to a no-video module
    if (!wrap && !thumb) {
        const urlRow = document.getElementById(`vid-input-${moduleId}`)?.closest('.lesson-video-url-row');
        if (urlRow) {
            wrap = document.createElement('div');
            wrap.className = 'lesson-video-wrap';
            wrap.id = `vwrap-${moduleId}`;
            urlRow.parentNode.insertBefore(wrap, urlRow);
        }
    }

    const target = wrap || thumb;
    if (!target) return;

    const embed   = toEmbedUrl(url);
    const isYT    = embed.includes('youtube.com/embed');
    const isVimeo = embed.includes('player.vimeo');

    if (isYT) {
        target.innerHTML = `<iframe id="yt-${moduleId}" src="${embed}&origin=${encodeURIComponent(location.origin)}" allowfullscreen allow="autoplay"></iframe>`;
    } else if (isVimeo) {
        target.innerHTML = `<iframe id="vm-${moduleId}" src="${embed}" allowfullscreen></iframe>`;
    } else if (embed.includes('drive.google.com')) {
        target.innerHTML = `<iframe src="${embed}" allowfullscreen></iframe>`;
    } else {
        // Native video — autoplay + muted works
        const vid = document.createElement('video');
        vid.src = url; vid.controls = true; vid.muted = true; vid.autoplay = true;
        vid.style.cssText = 'width:100%;height:100%;border-radius:8px;';
        vid.addEventListener('ended', () => markModuleComplete(moduleId));
        target.innerHTML = ''; target.appendChild(vid);
    }

    const inp = document.getElementById(`vid-input-${moduleId}`);
    if (inp) inp.value = url;
}

// Auto-complete on YouTube / Vimeo video end via postMessage
window.addEventListener('message', function(e) {
    try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data && data.event === 'onStateChange' && data.info === 0) {
            document.querySelectorAll('iframe[id^="yt-"]').forEach(iframe => {
                if (iframe.contentWindow === e.source)
                    markModuleComplete(iframe.id.replace('yt-', ''));
            });
        }
        if (data && data.event === 'finish') {
            document.querySelectorAll('iframe[id^="vm-"]').forEach(iframe => {
                if (iframe.contentWindow === e.source)
                    markModuleComplete(iframe.id.replace('vm-', ''));
            });
        }
    } catch(_) {}
});

window.saveVideo = function(id) {
    const inp = document.getElementById(`vid-input-${id}`);
    if (!inp) return;
    const url = inp.value.trim();
    if (!url) { showToast('Please paste a URL first'); return; }
    videos[id] = url; saveState();
    applyVideo(id, url);
    showToast('Video saved!');
};

window.clearVideo = function(id) {
    delete videos[id]; saveState();
    const wrap  = document.getElementById(`vwrap-${id}`);
    const thumb = document.querySelector(`.video-thumb[data-module="${id}"]`);
    const target = wrap || thumb;
    if (target) {
        if (wrap) target.innerHTML = `<div class="lesson-video-placeholder"><i class="fas fa-play-circle"></i><span>Video lesson coming soon</span></div>`;
        else      target.innerHTML = '<i class="fas fa-play fa-2x"></i>';
    }
    const inp = document.getElementById(`vid-input-${id}`);
    if (inp) inp.value = '';
    showToast('Video removed');
};

// Apply preset Google Drive video (no localStorage)
function applyGDrivePreset(moduleId, originalUrl) {
    const m = originalUrl.match(/\/file\/d\/([^/]+)/);
    const embedUrl = m ? `https://drive.google.com/file/d/${m[1]}/preview` : originalUrl;
    const wrap = document.getElementById(`vwrap-${moduleId}`);
    if (!wrap) return;
    wrap.innerHTML = `<iframe src="${embedUrl}" allowfullscreen allow="autoplay"></iframe>`;
    const inp = document.getElementById(`vid-input-${moduleId}`);
    if (inp) inp.value = originalUrl;
}

// ── SIDEBAR MODULE NAVIGATION ──
const activeModule = {};

window.navigateModule = function(weekNum, dir) {
    const modules = window.WEEK_MODULES || [];
    if (!modules.length) return;
    const cur  = activeModule[weekNum] || 0;
    if (dir > 0) markModuleComplete(modules[cur].id);
    const next = Math.max(0, Math.min(modules.length - 1, cur + dir));
    showModule(weekNum, next);
};

window.showModule = function(weekNum, idx) {
    const modules = window.WEEK_MODULES || [];
    if (!modules.length) return;
    activeModule[weekNum] = idx;

    document.querySelectorAll('.sidebar-module-btn').forEach(btn =>
        btn.classList.toggle('active', +btn.dataset.idx === idx));

    document.querySelectorAll('.module-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`panel-${modules[idx].id}`);
    if (panel) {
        panel.classList.add('active');
        panel.querySelectorAll('.step-dot').forEach((dot, di) => {
            dot.classList.remove('done','active');
            if (di < idx)      dot.classList.add('done');
            else if (di === idx) dot.classList.add('active');
        });
    }

    const contentEl = document.querySelector('.week-content');
    if (contentEl) contentEl.scrollTop = 0;

    const prevBtn = document.getElementById(`w${weekNum}-prev`);
    const nextBtn = document.getElementById(`w${weekNum}-next`);
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === modules.length - 1;
};

// ── PROGRESS UPDATE ──
function updateProgress() {
    const modules = window.WEEK_MODULES || [];
    const weekNum = window.WEEK_NUM || 1;
    const total = modules.length;
    const done  = modules.filter(m => completed[m.id]).length;
    const pct   = total ? Math.round(done / total * 100) : 0;

    // Sidebar progress bar
    document.querySelectorAll('.week-fill').forEach(el => { el.style.width = pct + '%'; });
    document.querySelectorAll('.week-pct').forEach(el  => { el.textContent = pct + '%'; });

    // Sidebar done states
    modules.forEach(m => {
        const btn = document.querySelector(`.sidebar-module-btn[data-module="${m.id}"]`);
        if (btn) btn.classList.toggle('done', !!completed[m.id]);
        const cb = document.querySelector(`input[type="checkbox"][data-module="${m.id}"]`);
        if (cb) cb.checked = !!completed[m.id];
        const bar = document.getElementById(`ctbar-${m.id}`);
        if (bar) bar.classList.toggle('done', !!completed[m.id]);
    });

    // Update dashboard card progress via localStorage broadcast
    localStorage.setItem(`em_week${weekNum}_progress`, pct);
}

// ── RESTORE SAVED VIDEOS ──
function restoreVideos() {
    const modules = window.WEEK_MODULES || [];
    modules.forEach(m => {
        if (videos[m.id]) {
            applyVideo(m.id, videos[m.id]);
        } else if (m.videoUrl) {
            applyGDrivePreset(m.id, m.videoUrl);
        }
    });
}

// ── INLINE LOGO SVG ──

// Inject logo into .logo-area elements
document.querySelectorAll('.logo-area').forEach(el => {
    el.innerHTML = `<span style="font-size:1.3rem;font-weight:800;letter-spacing:-0.02em;color:var(--brand-dark);">Elevate<span style="color:var(--brand-accent);">Me</span></span>`;
});

// ── BUILD SIDEBAR + PANELS ──
function buildWeekPage(weekNum, modules) {
    window.WEEK_NUM     = weekNum;
    window.WEEK_MODULES = modules;

    const sidebar = document.getElementById('weekSidebar');
    const content = document.getElementById('weekContent');
    if (!sidebar || !content) return;

    sidebar.innerHTML = '';
    content.innerHTML = '';

    modules.forEach((mod, idx) => {
        // Sidebar button
        const btn = document.createElement('button');
        btn.className = 'sidebar-module-btn';
        btn.dataset.module = mod.id;
        btn.dataset.idx    = idx;
        btn.innerHTML = `
            <span class="sm-check"><i class="fas fa-check"></i></span>
            <span class="sm-text">
                <span class="sm-title">${mod.title}${mod.optional ? ' <small style="opacity:.6;font-weight:400;">(opt)</small>' : ''}</span>
                <span class="sm-subtitle">${mod.subtitle || ''}</span>
            </span>`;
        btn.addEventListener('click', () => showModule(weekNum, idx));
        sidebar.appendChild(btn);

        // Step dots
        const dotsHTML = modules.map((_, di) =>
            `<span class="step-dot ${di < idx ? 'done' : di === idx ? 'active' : ''}"></span>`
        ).join('');

        // Takeaways
        const tkHTML = (mod.takeaways || []).map(t =>
            `<li><span class="tk-bullet"><i class="fas fa-check" style="font-size:0.55rem;"></i></span>${t}</li>`
        ).join('');

        // Resources
        const resHTML = (mod.resources || []).map(r => {
            const href   = r.url && r.url !== '#' ? r.url : '#';
            const target = href !== '#' ? 'target="_blank"' : '';
            return `<a href="${href}" ${target} class="resource-item"><i class="fas ${r.icon}"></i>${r.label}<span class="res-tag">${r.tag}</span></a>`;
        }).join('');

        const showVideo = !!(mod.videoUrl || mod.hasVideo);
        const isLast    = idx === modules.length - 1;

        const panel = document.createElement('div');
        panel.className = 'module-panel';
        panel.id = `panel-${mod.id}`;
        panel.innerHTML = `
            <div class="lesson-step-indicator">
                <span class="step-pill">Lesson ${idx+1} of ${modules.length}</span>
                <span style="color:#b2bec3;">·</span>
                <span>${mod.subtitle || ''}</span>
                ${mod.optional ? '<span style="background:#e1ede8;padding:0.15rem 0.6rem;border-radius:20px;font-size:0.68rem;color:#7f8c8d;">Optional</span>' : ''}
                <div class="step-dots" style="margin-left:auto;">${dotsHTML}</div>
            </div>

            ${showVideo ? `<div class="lesson-video-wrap" id="vwrap-${mod.id}">
                <div class="lesson-video-placeholder">
                    <i class="fas fa-play-circle"></i>
                    <span>Video lesson coming soon</span>
                </div>
            </div>` : ''}

            <div class="lesson-video-url-row">
                <input class="video-url-input" id="vid-input-${mod.id}" placeholder="Paste YouTube, Vimeo or Google Drive URL…" style="flex:1;"/>
                <button class="btn-save-url" onclick="saveVideo('${mod.id}')"><i class="fas fa-save"></i> Save</button>
                <button class="btn-clear-url" onclick="clearVideo('${mod.id}')" title="Remove"><i class="fas fa-times"></i></button>
            </div>

            <div class="lesson-notes-card">
                <div class="notes-header"><i class="fas fa-book-open"></i> Lesson Notes</div>
                ${mod.notes || ''}
            </div>

            ${tkHTML ? `<div class="takeaways-card">
                <div class="tk-header"><i class="fas fa-star"></i> Key Takeaways</div>
                <ul class="takeaways-list">${tkHTML}</ul>
            </div>` : ''}

            ${mod.action ? `<div class="action-card">
                <div class="action-icon"><i class="fas fa-bolt"></i></div>
                <div class="action-text">
                    <div class="action-label">Your Action Item</div>
                    <p>${mod.action}</p>
                </div>
            </div>` : ''}

            ${resHTML ? `<div class="resources-card">
                <div class="res-header"><i class="fas fa-paperclip"></i> Resources &amp; Downloads</div>
                <div class="resources-list">${resHTML}</div>
            </div>` : ''}

            <div class="complete-toggle-bar ${completed[mod.id] ? 'done' : ''}" id="ctbar-${mod.id}">
                <label class="complete-toggle">
                    <input type="checkbox" data-module="${mod.id}" onchange="toggleModule(this)" ${completed[mod.id] ? 'checked' : ''}>
                    <span class="check-box"><i class="fas fa-check"></i></span>
                    <span class="toggle-label">Mark as complete</span>
                </label>
                <div class="done-msg"><i class="fas fa-check-circle"></i> Completed!</div>
                ${isLast
                    ? `<button class="next-module-btn" style="background:var(--brand-accent);" onclick="markModuleComplete('${mod.id}');window.location.href='../';">Finish Week <i class="fas fa-flag-checkered"></i></button>`
                    : `<button class="next-module-btn" onclick="navigateModule(${weekNum},1)">Next Lesson <i class="fas fa-arrow-right"></i></button>`}
            </div>`;

        content.appendChild(panel);
    });

    showModule(weekNum, 0);
    restoreVideos();
    updateProgress();
}
