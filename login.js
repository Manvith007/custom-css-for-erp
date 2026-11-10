(function () {
    'use strict';
    var tries = 0;
    var ready = false;

    function init(data) {
        var u = document.getElementById('loginFormUserNameID');
        var p = document.getElementById('loginFormPasswordID');
        var cap = document.querySelector('#loginform-captcha');
        var form = document.getElementById('login-form');
        if (!u || !p || !cap || !form) {
            if (tries++ < 30) setTimeout(function () { init(data); }, 500);
            return;
        }
        ready = true;
        if (data && data.klh_user) u.value = data.klh_user;
        if (data && data.klh_pass) p.value = data.klh_pass;
        setTimeout(function () { cap.focus(); }, 200);

        form.addEventListener('submit', function () {
            try {
                chrome.storage.local.set({ klh_user: u.value.trim(), klh_pass: p.value });
            } catch (e) {
                //
            }
        });

        var submitSoon = function () {
            if (cap.value.trim().length < 3) return;
            clearTimeout(submitSoon._t);
            submitSoon._t = setTimeout(function () {
                form.requestSubmit();
            }, 300);
        };
        cap.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter') {
                ev.preventDefault();
                submitSoon();
            }
        });
        cap.addEventListener('blur', submitSoon);
    }

    try {
        chrome.storage.local.get(['klh_user', 'klh_pass'], function (d) {
            init(d || {});
        });
    } catch (e) {
        init(null);
    }
})();