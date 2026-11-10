(async function () {
    'use strict';
    var input = document.getElementById('loginform-captcha') || document.querySelector('input[name*="captcha"]');
    if (!input) return;

    if (typeof ort === 'undefined') return;

    try {
        ort.env.wasm.wasmPaths = chrome.runtime.getURL('lib/');
        var session = await ort.InferenceSession.create(chrome.runtime.getURL('model/crnn.onnx'));
        var img = document.querySelector('img[alt*="captcha"], img[src*="captcha"]');
        if (!img) return;

        // Auto solve logic when image loads / changes
        // ...
    } catch (e) {
        //
    }
})();
