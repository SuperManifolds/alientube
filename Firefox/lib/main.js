/* browser: true */
/* global require */

var pageMod = require("sdk/page-mod");
var data = require("sdk/self").data;
var simplePrefs = require("sdk/simple-prefs");

require("sdk/panel").Panel({
    onMessage: function(message) {
    // Handle message from the content script
        if (message.type == 'setSettingsValue') {
            simplePrefs[message.key] = message.value;   
        }
    }
});
var localFiles = {
    "error.png" : data.url("error.png"),
    "overload.png" : data.url("overload.png"),
    "gplus.png" : data.url("gplus.png"),
    "duck.png": data.url("duck.png")
};

pageMod.PageMod({
    include: ["https://www.youtube.com/watch*", "http://www.youtube.com/watch*"],
    contentScriptOptions : localFiles,
    contentStyleFile: [
        data.url('style.css')
    ],
    contentScriptFile: [
        data.url("jquery-1.9.1.min.js"),
        data.url("mustache.js"),
        data.url("purl.js"),
        data.url("snuownd.js"),
        data.url("underscore-min.js"),
        data.url("raven.min.js"),
        data.url("script.js"), 
    ],
    onAttach: function(worker) {
        worker.postMessage({
            preferences: simplePrefs,
            template: data.load('templates.mustache'),
            localisation: data.load('strings.json')
        });
    }
});