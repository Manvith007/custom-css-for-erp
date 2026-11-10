const ERP_HOME = 'https://newerp.kluniversity.in/index.php?r=site%2Findexindi';
const ERP_LOGIN = 'https://newerp.kluniversity.in/index.php?r=site%2Flogin';
const KEEP_ALARM = 'klh-erp-keepalive';
const HELPER = 'http://127.0.0.1:9765/push?';

function arm() {
    chrome.alarms.create(KEEP_ALARM, { periodInMinutes: 1 });
}

chrome.runtime.onInstalled.addListener(arm);
chrome.runtime.onStartup.addListener(function () {
    arm();
    pushSession();
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== KEEP_ALARM) return;
    keepalive();
});

async function keepalive() {
    try {
        var res = await fetch(ERP_HOME, { credentials: 'include', cache: 'no-store' });
        var text = await res.text();
        var loggedOut = text.indexOf('login-form') > -1 && text.indexOf('indexindi') === -1;
        if (loggedOut) {
            chrome.action.setBadgeText({ text: 'R' });
            chrome.action.setBadgeBackgroundColor({ color: '#d9534f' });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
        pushSession();
    } catch (e) {
        //
    }
}

function pushSession() {
    chrome.cookies.getAll({ domain: 'kluniversity.in' }, function (cookies) {
        if (!cookies || !cookies.length) return;
        var parts = [];
        cookies.forEach(function (c) {
            if (c.name === undefined || c.value === undefined) return;
            parts.push(encodeURIComponent(c.name) + '=' + encodeURIComponent(c.value));
        });
        if (!parts.length) return;
        var url = HELPER + parts.join('&');
        fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(function () { /* helper offline */ });
    });
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg && msg.type === 'kb_cookies') {
        chrome.cookies.getAll({ domain: 'kluniversity.in' }, function (cookies) {
            var parts = [];
            cookies.forEach(function (c) {
                if (c.name !== undefined && c.value !== undefined) {
                    parts.push(encodeURIComponent(c.name) + '=' + encodeURIComponent(c.value));
                }
            });
            sendResponse({ cookie: parts.join('&') });
        });
        return true;
    }
});