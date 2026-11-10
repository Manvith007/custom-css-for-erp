(function () {
    'use strict';
    var ATT_PAGE = /searchgetinput/.test(location.search);
    if (!ATT_PAGE) return;

    var W = { 'L': 1, 'T': 1, 'P': 0.5, 'S': 0.25 };

    function parseGrid() {
        var tables = document.querySelectorAll('#printTable table, table.table-striped');
        var res = { rows: [], courses: [] };
        for (var ti = 0; ti < tables.length; ti++) {
            var t = tables[ti];
            var head = t.querySelector('thead');
            if (!head) continue;
            var ths = head.querySelectorAll('th');
            var idx = { code: -1, desc: -1, ltps: -1, conducted: -1, attended: -1, pct: -1, tcbr: -1 };
            for (var h = 0; h < ths.length; h++) {
                var txt = (ths[h].textContent || '').trim().toLowerCase();
                if (txt.indexOf('coursecode') === 0 && idx.code === -1) idx.code = h;
                if (txt.indexOf('coursedesc') === 0 && idx.desc === -1) idx.desc = h;
                if (txt.indexOf('ltps') === 0 && idx.ltps === -1) idx.ltps = h;
                if (txt.indexOf('conducted') > -1 && idx.conducted === -1) idx.conducted = h;
                if (txt.indexOf('attended') > -1 && idx.attended === -1) idx.attended = h;
                if (txt.indexOf('percentage') > -1 && idx.pct === -1) idx.pct = h;
                if (txt.indexOf('tcbr') > -1 && idx.tcbr === -1) idx.tcbr = h;
            }
            if (idx.code === -1 || idx.conducted === -1 || idx.attended === -1) continue;
            var rows = t.querySelectorAll('tbody tr');
            for (var r = 0; r < rows.length; r++) {
                var cells = rows[r].querySelectorAll('td');
                if (cells.length <= idx.attended) continue;
                var code = (cells[idx.code].textContent || '').trim();
                var desc = (cells[idx.desc] ? cells[idx.desc].textContent : '').trim();
                var ltps = (cells[idx.ltps] ? (cells[idx.ltps].textContent || '').trim() : '').toUpperCase();
                var conducted = parseInt((cells[idx.conducted].textContent || '').replace(/[^0-9]/g, ''), 10);
                var attended = parseInt((cells[idx.attended].textContent || '').replace(/[^0-9]/g, ''), 10);
                if (!conducted || conducted <= 0) continue;
                var a = Math.min(attended, conducted);
                var w = W[ltps.charAt(0)] || 1;
                var tcbr = idx.tcbr !== -1 && cells[idx.tcbr] ? parseInt((cells[idx.tcbr].textContent || '').replace(/[^0-9]/g, ''), 10) : 0;
                res.rows.push({
                    code: code, desc: desc, t: ltps.charAt(0) || '', w: w, tcbr: tcbr || 0,
                    c: conducted, a: a, pct: Math.ceil(100 * a / conducted),
                    sec: (cells[4] ? cells[4].textContent : '').trim(),
                    yr: (cells[5] ? cells[5].textContent : '').trim(),
                    sem: (cells[6] ? cells[6].textContent : '').trim(),
                    fdate: (cells[7] ? cells[7].textContent : '').trim(),
                    reg: (cells[cells.length - 1] ? cells[cells.length - 1].innerHTML : '').trim()
                });
            }
            if (res.rows.length) break;
        }
        var map = {};
        var gTotC = 0, gTotA = 0;
        res.rows.forEach(function (row) {
            if (!map[row.code]) map[row.code] = { c: 0, a: 0, wc: 0, wa: 0, tcbr: 0, parts: [] };
            map[row.code].c += row.c;
            map[row.code].a += row.a;
            map[row.code].wc += row.w * row.c;
            map[row.code].wa += row.w * row.a;
            map[row.code].tcbr += (row.tcbr || 0);
            map[row.code].parts.push(row);
            gTotC += row.c;
            gTotA += row.a;
        });
        for (var code in map) {
            if (!Object.prototype.hasOwnProperty.call(map, code)) continue;
            var g = map[code];
            var ltpsTypes = [];
            g.parts.forEach(function (p) {
                if (p.t && ltpsTypes.indexOf(p.t) === -1) ltpsTypes.push(p.t);
            });
            res.courses.push({
                code: code,
                desc: g.parts[0].desc,
                ltps: ltpsTypes.join('/') || g.parts[0].t,
                c: g.c, a: g.a, tcbr: g.tcbr,
                pct: (g.wc > 0) ? Math.ceil(100 * g.wa / g.wc) : Math.ceil(100 * g.a / g.c),
                parts: g.parts
            });
        }
        res.has = res.courses.length > 0;
        res.totC = gTotC;
        res.totA = gTotA;
        res.totPct = gTotC > 0 ? (100 * gTotA / gTotC) : 0;
        return res;
    }

    function addOverall(res) {
        if (!res.totC) return;
        var old = document.getElementById('klu-att-overall');
        if (old) old.parentNode.removeChild(old);
        var box = document.createElement('div');
        box.id = 'klu-att-overall';
        box.className = 'alert alert-info py-2 mb-2 small font-weight-bold';
        var txt = 'Overall Attendance: ' + res.totPct.toFixed(2) + '%  (' + res.totA + '/' + res.totC + ' classes, LTPS weighted per subject)';
        box.textContent = txt;
        var printTable = document.getElementById('printTable') || (document.querySelector('table') ? document.querySelector('table').parentNode : null);
        if (printTable) printTable.insertBefore(box, printTable.firstChild);
    }

    function regCell(parts) {
        var links = [];
        parts.forEach(function (p, j) {
            if (p.reg) {
                links.push((p.t || ('Part' + (j + 1))) + '&nbsp;' + p.reg);
            }
        });
        return links.join('<br>');
    }

    function rebuildTable(res) {
        if (!res.courses.length) return;
        var tables = document.querySelectorAll('#printTable table, table.table-striped');
        for (var ti = 0; ti < tables.length; ti++) {
            var t = tables[ti];
            if (!t.querySelector('thead')) continue;
            if (t.getAttribute('data-klh-combined')) return t;
            var ths = t.querySelectorAll('thead th');
            var hasKey = false;
            for (var h = 0; h < ths.length; h++) {
                if (/coursecode/i.test(ths[h].textContent)) { hasKey = true; break; }
            }
            if (!hasKey) continue;
            var tbody = t.querySelector('tbody');
            if (!tbody) return t;
            var frag = document.createDocumentFragment();
            res.courses.forEach(function (ch, i) {
                var fr = ch.parts[0];
                var vals = [
                    String(i + 1), ch.code, ch.desc, ch.ltps,
                    fr.sec, fr.yr, fr.sem, fr.fdate,
                    String(ch.c), String(ch.a), String(ch.c - ch.a), String(ch.tcbr),
                    ch.pct + '%', regCell(ch.parts)
                ];
                var tr = document.createElement('tr');
                for (var v = 0; v < vals.length; v++) {
                    var td = document.createElement('td');
                    td.innerHTML = vals[v];
                    tr.appendChild(td);
                }
                frag.appendChild(tr);
            });
            tbody.innerHTML = '';
            tbody.appendChild(frag);
            t.setAttribute('data-klh-combined', '1');
            return t;
        }
        return null;
    }

    var tries = 0;
    var timer = setInterval(function () {
        if (tries++ >= 30) { clearInterval(timer); return; }
        var res = parseGrid();
        if (res.has) {
            rebuildTable(res);
            addOverall(res);
            clearInterval(timer);
        }
    }, 1500);
})();