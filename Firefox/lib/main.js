/* browser: true */
/* global require */
var pageMod = require("sdk/page-mod");
var data = require("sdk/self").data;
var preferences = require("sdk/preferences/service");
var simplePrefs = require("sdk/simple-prefs");
var tabs = require("sdk/tabs");
var locale = require("sdk/l10n/core").locale || "en";
var addonid = require('sdk/self').id;


var contentScriptData = {
    ressources: {
        "redditbroken.svg" : data.url("redditbroken.svg"),
        "redditoverload.svg" : data.url("redditoverload.svg"),
        "redditblocked.svg": data.url("redditblocked.svg")
    },

    preferences: {},
    localisation: data.load('_locales/' + locale + '/messages.json'),
    template: data.load('templates.html'),
    version: require('sdk/self').version
};

preferences.keys("extensions." + addonid).forEach(function(key) {
    contentScriptData.preferences[key.substr(key.lastIndexOf('.') + 1)] = preferences.get(key);
});

pageMod.PageMod({
    include: ["https://www.youtube.com/*", "http://www.youtube.com/*", "http://alientube.co/"],
    contentScriptOptions : contentScriptData,
    contentStyleFile: [
        data.url('style.css')
    ],
    contentScriptFile: [
        data.url("snuownd.js"),
        data.url("handlebars-v3.0.3.js"),
        data.url("script.js"),
    ],
    onAttach: function(worker) {
        worker.port.on("setSettingsValue", function(message) {
            preferences.set("extensions." + addonid + "." + message.key, message.value);
            contentScriptData.preferences[message.key] = message.value;
        });
    }
});

simplePrefs.on("openPreferences", function () {
    tabs.open({
        url: data.url('options.html'),
        onReady: function (tab) {
            var worker = tab.attach({
                contentScriptOptions : contentScriptData,
                contentScriptFile: [
                    data.url("options.js")
                ]
            });
            worker.port.on("setSettingsValue", function(message) {
                preferences.set("extensions." + addonid + "." + message.key, message.value);
                contentScriptData.preferences[message.key] = message.value;
            });
        }
    });
});
