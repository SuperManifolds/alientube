/* jslint browser: true */
/* global $,chrome */

// Workaround making all JSONP requests as a Chrome background page because JSONP callbacks get intercepted by Chrome within Content Scripts.
function onRequest(request, sender, callback) {
    if (request.action == 'getJSON') {
        $.getJSON(request.url, callback);
    }
}

/* Workaround intercepting all redirects in Chrome that goes to the reddit API. In the process of being redirected we are losing the
   JSONP parameter in the request and are never receiving anything back. We therefor need to aqquire the redirect url and make a new request to where it's going. */
chrome.extension.onRequest.addListener(onRequest);
chrome.webRequest.onBeforeRedirect.addListener(function(details){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        chrome.tabs.sendMessage(tabs[0].id, {redditRedirectUrl: details.redirectUrl}, function() {});  
    });
}, {urls: ["*://pay.reddit.com/*.json*"]});
