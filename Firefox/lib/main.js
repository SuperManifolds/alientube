/* browser: true */
/* global require */
require("sdk/preferences/service").set("javascript.options.strict", false);
var pageMod = require("sdk/page-mod");
var data = require("sdk/self").data;
var simplePrefs = require("sdk/simple-prefs");
var locale = require("sdk/l10n/core").locale || "en";

require("sdk/panel").Panel({
    onMessage: function(message) {
    // Handle message from the content script
        if (message.type == 'setSettingsValue') {
            simplePrefs[message.key] = message.value;
        }
    }
});
var contentScriptData = {
    ressources: {
        "redditbroken.svg" : data.url("redditbroken.svg"),
        "redditoverload.svg" : data.url("redditoverload.svg")
    },

    preferences: simplePrefs,
    localisation: data.load('_locales/' + locale + '/messages.json'),
    template: data.load('templates.html')
};

pageMod.PageMod({
    include: ["https://www.youtube.com/*", "http://www.youtube.com/*", "http://alientube.co/"],
    contentScriptOptions : contentScriptData,
    contentStyleFile: [
        data.url('style.css')
    ],
    contentScriptFile: [
        data.url("snuownd.js"),
        data.url("script.js"),
    ]
});
