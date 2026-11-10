(function () {
    'use strict';
    var DOCK_ID = 'klu-helper-dock';
    var STYLE_ID = 'klu-helper-css';
    var FLAG = 'klbd_pending';

    function injectCss() {
        if (document.getElementById(STYLE_ID)) return;
        var el = document.createElement('style');
        el.id = STYLE_ID;
        el.textContent = [
            '#' + DOCK_ID + '{position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;align-items:flex-end;font-family:Segoe UI,Arial,sans-serif}',
            '#' + DOCK_ID + ' .klh-title{background:#b31b1b;color:#fff;font-weight:700;padding:2px 10px;border-radius:10px;font-size:11px;letter-spacing:.5px;box-shadow:0 2px 8px rgba(0,0,0,.3)}',
            '#' + DOCK_ID + ' .klh-btn{background:#b31b1b;color:#fff;border:none;border-radius:22px;padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.35);display:flex;align-items:center;gap:8px;transition:transform .12s}',
            '#' + DOCK_ID + ' .klh-btn:hover{transform:translateY(-1px);background:#c83434}',
            '#' + DOCK_ID + ' .klh-btn:active{transform:scale(.97)}',
            '#' + DOCK_ID + ' .klh-btn[disabled]{opacity:.55;cursor:wait}',
            '#' + DOCK_ID + ' .klh-status{background:#fff;color:#333;border:1px solid #ddd;border-radius:8px;padding:6px 10px;font-size:12px;max-width:320px;box-shadow:0 2px 8px rgba(0,0,0,.18);display:none}',
            '#' + DOCK_ID + ' .klh-status.show{display:block}',
            '#' + DOCK_ID + ' a.klh-link{color:#b31b1b;font-size:12px;background:#fff;padding:6px 10px;border-radius:8px;text-decoration:none;border:1px solid #ddd;box-shadow:0 2px 6px rgba(0,0,0,.15);display:inline-block}',
            '#' + DOCK_ID + ' a.klh-link:hover{background:#fdf1f1}',
            '.klh-dl{background:transparent;color:#6cb2ff;border:none;border-radius:12px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer;margin-right:4px}',
            '.klh-dl:hover{color:#9ccbff}',
            '.klh-dl:disabled{opacity:.5;cursor:wait}',
            '.klh-rv{background:#117a3a;color:#fff;border:none;border-radius:12px;padding:4px 10px;font-size:11px;font-weight:700;cursor:pointer;margin-right:4px;box-shadow:0 2px 6px rgba(0,0,0,.3)}',
            '.klh-rv:hover{background:#138c42}'
        ].join('\n');
        document.head.appendChild(el);
    }

    function base64Decode(b64) {
        try {
            var bin = atob(b64);
            var bytes = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) { return ''; }
    }

    function pickFileName(rawId) {
        var decoded = base64Decode(rawId) || rawId;
        var subj = (decoded.match(/\/([0-9][A-Z0-9]{5,8})\//) || [])[1] || 'booklet';
        var pdf = (decoded.match(/([^\/\\]+\.pdf)/i) || [])[1] || 'script.pdf';
        return subj + '_' + pdf;
    }

    function pullDownloadUrl() {
        var m = document.documentElement.outerHTML.match(/var\s+url\s*=\s*"([^"]+)"/);
        return m ? m[1] : null;
    }

    function absOf(url) {
        return url.indexOf('http') === 0 ? url : location.origin + (url.charAt(0) === '/' ? '' : '/') + url;
    }

    function buildDock(onClick) {
        if (document.getElementById(DOCK_ID)) return document.getElementById(DOCK_ID);
        var dock = document.createElement('div');
        dock.id = DOCK_ID;
        var title = document.createElement('div');
        title.className = 'klh-title';
        title.textContent = 'KLU HELPER';
        var status = document.createElement('div');
        status.className = 'klh-status';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'klh-btn';
        btn.textContent = 'Download Booklet PDF';
        if (onClick) btn.onclick = onClick;
        dock.appendChild(title);
        dock.appendChild(status);
        dock.appendChild(btn);
        document.body.appendChild(dock);
        return dock;
    }

    function showStatus(dock, msg, ms) {
        var s = dock.querySelector('.klh-status');
        s.textContent = msg;
        s.classList.add('show');
        setTimeout(function () { s.classList.remove('show'); }, ms || 5000);
    }

    function downloadPdf(abs, name, statusEl) {
        fetch(abs, { credentials: 'include' })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.blob();
            })
            .then(function (blob) {
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = name;
                document.body.appendChild(a);
                a.click();
                setTimeout(function () { URL.revokeObjectURL(a.href); if (a.parentNode) a.parentNode.removeChild(a); }, 2000);
                if (statusEl) statusEl.textContent = 'Saved to Downloads: ' + name;
                return true;
            })
            .catch(function () {
                if (statusEl) statusEl.textContent = 'Download failed. Try "Open PDF in new tab" then Ctrl+S.';
                return false;
            });
    }

    function isBookletPage() {
        return /view_my_booklet|download_script_frompath/.test(location.search);
    }

    function isListPage() {
        return /view_my_answer_scripts/.test(location.search);
    }

    function currentBookletInfo() {
        var url = pullDownloadUrl();
        if (!url) return null;
        var id = (url.match(/[&?]id=([^&]+)/) || [])[1] || '';
        return { abs: absOf(url), name: pickFileName(id) };
    }

    function setupBookletPage() {
        var info = currentBookletInfo();
        if (!info) return;
        var dock = buildDock(function () {
            var btn = dock.querySelector('.klh-btn');
            btn.disabled = true;
            showStatus(dock, 'Downloading...', 15000);
            downloadPdf(info.abs, info.name, dock.querySelector('.klh-status')).then(function () { btn.disabled = false; });
        });
        var lnk = document.createElement('a');
        lnk.className = 'klh-link';
        lnk.textContent = 'Open PDF in new tab';
        lnk.href = info.abs;
        lnk.target = '_blank';
        dock.appendChild(lnk);
        try { localStorage.removeItem('klbd_queue'); } catch (e) {}
        if (localStorage.getItem(FLAG) === '1') {
            localStorage.removeItem(FLAG);
            var btn = dock.querySelector('.klh-btn');
            btn.disabled = true;
            showStatus(dock, 'Auto-downloading...', 15000);
            downloadPdf(info.abs, info.name, dock.querySelector('.klh-status')).then(function () { btn.disabled = false; });
        }
    }

    function addRowButtons() {
        var bookletLinks = document.querySelectorAll('a[href*="view_my_booklet"]');
        var added = 0;
        for (var i = 0; i < bookletLinks.length; i++) {
            var a = bookletLinks[i];
            var row = a.parentElement ? a.parentElement.parentElement : null;
            if (!row) continue;
            if (row.querySelector('.klh-dl')) continue;
            var ownHref = a.getAttribute('href');
            if (!ownHref) continue;

            var tb = document.createElement('button');
            tb.type = 'button';
            tb.className = 'klh-dl';
            tb.textContent = 'Download';
            (function (href) {
                tb.onclick = function () {
                    tb.disabled = true;
                    localStorage.setItem(FLAG, '1');
                    window.location.href = href;
                };
            })(ownHref);
            a.parentNode.insertBefore(tb, a);
            added++;
        }
        return added;
    }

    function init() {
        injectCss();
        try { localStorage.removeItem('klbd_queue'); } catch (e) {}
        if (isBookletPage()) {
            setupBookletPage();
        } else if (isListPage()) {
            addRowButtons();
        }
    }

    init();
    var tries = 0;
    var timer = setInterval(function () {
        if (tries >= 25) { clearInterval(timer); return; }
        if (isBookletPage()) {
            var dock = document.getElementById(DOCK_ID);
            if (dock && dock.querySelector('.klh-btn')) clearInterval(timer);
        } else if (isListPage()) {
            if (addRowButtons() === 0) clearInterval(timer);
        } else {
            clearInterval(timer);
        }
        tries++;
    }, 2000);
})();