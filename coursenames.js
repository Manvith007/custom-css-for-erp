(function () {
    'use strict';

    var STORE = 'klu_course_names';
    var ATT_PAGE = /searchgetinput/i.test(location.search);
    var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, INPUT: 1, TEXTAREA: 1, SELECT: 1, OPTION: 1 };
    var CODE_RE = /^\s*(\d{2}[A-Za-z]{2,}[A-Za-z0-9]*(?:\s*[-/]\s*[A-Za-z0-9]+)?)\s*$/;
    var AMBIGUOUS_CODE_RE = /^\s*([A-Za-z]{2,}\d{2,}[A-Za-z0-9]*(?:\s*[-/]\s*[A-Za-z0-9]+)?)\s*$/;

    var map = {};
    var keys = [];
    var pattern = null;
    var ready = false;

    function norm(s) {
        return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function mainCode(raw) {
        if (!raw) return '';
        var m = String(raw).trim().match(/^[A-Za-z0-9]+/);
        return m ? m[0] : '';
    }

    function cleanName(raw) {
        return String(raw || '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^[\s\-–—:;,|]+|[\s\-–—:;,|]+$/g, '')
            .trim();
    }

    function looksLikeName(txt) {
        if (!txt) return false;
        var t = cleanName(txt);
        if (t.length < 3 || t.length > 160) return false;
        if (!/[A-Za-z]{2}/.test(t)) return false;
        if (/^(room|roomno|section|sec|sem|semester|year|date|time|slot|seat|s-?\d+)\b/i.test(t)) return false;
        if (/^[A-Z]\d{2,4}$/.test(t)) return false;
        if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(t)) return false;
        if (/^\d+$/.test(t)) return false;
        return true;
    }

    function looksLikeCode(txt) {
        if (!txt) return false;
        return CODE_RE.test(txt) || AMBIGUOUS_CODE_RE.test(txt);
    }

    function addPair(codeRaw, nameRaw) {
        var code = mainCode(codeRaw);
        var name = cleanName(nameRaw);
        if (!code || !name) return false;
        var lead = name.match(/^([A-Za-z0-9]{4,})\s*[-–—:(]\s*(.+)$/);
        if (lead && looksLikeCode(lead[1])) name = cleanName(lead[2]);
        if (!looksLikeName(name)) return false;
        if (!map[code] || name.length > map[code].length) {
            map[code] = name;
            return true;
        }
        return false;
    }

    function parsePair(txt) {
        if (!txt) return false;
        var raw = cleanName(txt);
        if (raw.length < 4) return false;
        var m = raw.match(/^([A-Za-z0-9]+)\s*[-–—:]\s*(.+)$/);
        if (!m) m = raw.match(/^([A-Za-z0-9]+)\s*\((.+)\)\s*$/);
        if (!m) return false;
        if (!looksLikeCode(m[1])) return false;
        var tail = m[2];
        if (/roomno|room\s|s-?\d+\b/i.test(tail)) return false;
        return addPair(m[1], tail);
    }

    function headerKind(txt) {
        var n = norm(txt);
        if (!n) return '';
        if (n === 'code' || n === 'ccode' || n === 'subcode') return 'code';
        if (n === 'name' || n === 'title' || n === 'desc' || n === 'description' ||
            n === 'coursedesc' || n === 'coursename' || n === 'coursetitle' ||
            n === 'subjectname' || n === 'subjectdesc' || n === 'subjecttitle') return 'name';
        if (n.indexOf('course') > -1 && n.indexOf('code') > -1) return 'code';
        if (n.indexOf('subject') > -1 && n.indexOf('code') > -1) return 'code';
        if (n.indexOf('course') > -1 &&
            (n.indexOf('name') > -1 || n.indexOf('desc') > -1 || n.indexOf('title') > -1)) return 'name';
        if (n.indexOf('subject') > -1 &&
            (n.indexOf('name') > -1 || n.indexOf('desc') > -1 || n.indexOf('title') > -1)) return 'name';
        return '';
    }

    function headerRow(t) {
        var tr = t.querySelector('thead tr:last-child');
        if (tr) return tr;
        var trs = t.querySelectorAll('tr');
        for (var i = 0; i < trs.length; i++) {
            if (trs[i].querySelector('th')) return trs[i];
        }
        return null;
    }

    function dataRows(t, header) {
        var body = t.querySelector('tbody');
        if (body) return body.querySelectorAll('tr');
        var rows = [];
        var trs = t.querySelectorAll('tr');
        for (var i = 0; i < trs.length; i++) {
            if (trs[i] !== header && trs[i].querySelector('td')) rows.push(trs[i]);
        }
        return rows;
    }

    function harvestTable(t) {
        var changed = false;
        var hr = headerRow(t);
        if (!hr) return false;
        var hcells = hr.querySelectorAll('th,td');
        var codeIdx = -1, nameIdx = -1;
        for (var h = 0; h < hcells.length; h++) {
            var kind = headerKind(hcells[h].textContent);
            if (kind === 'code' && codeIdx === -1) codeIdx = h;
            if (kind === 'name' && nameIdx === -1) nameIdx = h;
        }

        var rows = dataRows(t, hr);
        var r, cells;
        if (codeIdx !== -1 && nameIdx !== -1 && codeIdx !== nameIdx) {
            for (r = 0; r < rows.length; r++) {
                cells = rows[r].querySelectorAll('td');
                if (!cells[codeIdx]) continue;
                if (addPair(cells[codeIdx].textContent, cells[nameIdx] ? cells[nameIdx].textContent : '')) {
                    changed = true;
                }
            }
            return changed;
        }

        for (r = 0; r < rows.length; r++) {
            cells = rows[r].querySelectorAll('td');
            if (cells.length < 2) continue;
            var ci = -1, bestIdx = -1, best = '';
            for (var c = 0; c < cells.length; c++) {
                var txt = (cells[c].textContent || '').trim();
                if (ci === -1 && looksLikeCode(txt)) {
                    ci = c;
                } else if (looksLikeName(txt) && txt.length > best.length) {
                    best = txt;
                    bestIdx = c;
                }
            }
            if (ci !== -1 && bestIdx !== -1 && addPair(cells[ci].textContent, cells[bestIdx].textContent)) {
                changed = true;
            }
            for (var k = 0; k < cells.length; k++) {
                if (parsePair(cells[k].textContent)) changed = true;
            }
        }
        return changed;
    }

    function harvest(doc) {
        doc = doc || document;
        var changed = false;
        var tables = doc.querySelectorAll('table');
        for (var t = 0; t < tables.length; t++) {
            if (harvestTable(tables[t])) changed = true;
        }
        if (changed) {
            buildPattern();
            save();
        }
        return changed;
    }

    function esc(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function buildPattern() {
        keys = Object.keys(map).filter(function (k) { return k && map[k]; })
            .sort(function (a, b) { return b.length - a.length; });
        pattern = keys.length
            ? new RegExp('(^|[^A-Za-z0-9])(' + keys.map(esc).join('|') + ')(?![A-Za-z0-9])', 'g')
            : null;
    }

    function save() {
        var data = {};
        data[STORE] = map;
        try { chrome.storage.local.set(data); } catch (e) { /* no-op */ }
        try { localStorage.setItem(STORE, JSON.stringify(map)); } catch (e) { /* no-op */ }
    }

    function replaceText(node) {
        if (!pattern) return;
        var v = node.nodeValue;
        if (!v || v.length < 4 || !/[0-9]/.test(v)) return;
        pattern.lastIndex = 0;
        if (!pattern.test(v)) return;
        pattern.lastIndex = 0;
        var out = v.replace(pattern, function (all, pre, code) { return pre + map[code]; });
        if (out !== v) node.nodeValue = out;
    }

    function replaceAll(root) {
        if (!pattern || !root) return;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (n) {
                var p = n.parentNode;
                if (!p || SKIP[p.nodeName] || p.isContentEditable) return NodeFilter.FILTER_REJECT;
                if (p.nodeName === 'CODE') return NodeFilter.FILTER_REJECT;
                if (p.id && p.id.indexOf('klu-') === 0) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }, false);
        var n;
        while ((n = walker.nextNode())) replaceText(n);
    }

    function updateHeaders(root) {
        if (!root) return;
        var ths = root.querySelectorAll('th, thead td');
        for (var i = 0; i < ths.length; i++) {
            var th = ths[i];
            var txt = (th.textContent || '').trim();
            if (/^course\s*code$/i.test(txt)) {
                th.textContent = 'Course Name';
            }
        }
    }

    function scan() {
        harvest(document);
        if (!ATT_PAGE && document.body) {
            replaceAll(document.body);
            updateHeaders(document.body);
        }
    }

    function bind() {
        var timer = null;
        var mo = new MutationObserver(function (muts) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () {
                harvest(document);
                if (!ATT_PAGE && document.body) {
                    for (var i = 0; i < muts.length; i++) {
                        var added = muts[i].addedNodes;
                        for (var j = 0; j < added.length; j++) {
                            if (added[j].nodeType === 1) {
                                replaceAll(added[j]);
                                updateHeaders(added[j]);
                            }
                        }
                    }
                }
            }, 800);
        });
        mo.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('pageshow', function (e) {
            if (e.persisted) scan();
        });
    }

    function start() {
        if (ready) return;
        ready = true;
        buildPattern();
        scan();
        bind();
    }

    function load() {
        var fallback = function () {
            try {
                map = JSON.parse(localStorage.getItem(STORE) || '{}') || {};
            } catch (e) { map = {}; }
            start();
        };
        try {
            chrome.storage.local.get({ klu_course_names: {} }, function (data) {
                map = (data && data.klu_course_names) || {};
                start();
            });
        } catch (e) {
            fallback();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load, { once: true });
    } else {
        load();
    }
})();
