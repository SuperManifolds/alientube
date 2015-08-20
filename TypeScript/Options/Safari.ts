/// <reference path="../typings/safari/safari.d.ts" />
/// <reference path="../HttpRequest.ts" />
/// <reference path="../Utilities.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
"use strict";
module AlienTube {
    /**
        * Safari Global Page
        * @class Safari
    */
    export class Safari {
		constructor(event) {
            if (event.name == 'XHR') {
                new HttpRequest(event.message.url, event.message.requestType, function (data) {
                    event.target.page.dispatchMessage("POST", {
                        'uuid': event.message.uuid,
                        'data': data
                    });
                }, event.message.postData, function (error) {
                   event.target.page.dispatchMessage("POST", {
                        'uuid': event.message.uuid,
                        'error': error
                    });
                });
            } else if (event.name == "setPreference") {
                localStorage.setItem(event.message.key, event.message.value);
            } else if (event.name === "getPreferences") {
                let preferences = {};
                let numKeys = localStorage.length;
                for (let i = 0; i < numKeys; i++) {
                    let keyName = localStorage.key(i);
                    preferences[keyName] = localStorage.getItem(keyName);
                }
                event.target.page.dispatchMessage("preferences", preferences);
            } 
        }
        
        static openPreferences() {
            safari.extension.settings.volume = false;
            safari.application.activeBrowserWindow.openTab().url = safari.extension.globalPage.contentWindow.location.href;
        }
	}
}

if (AlienTube.Utilities.getCurrentBrowser() === Browser.SAFARI) {
    if (safari.application) {
        safari.application.addEventListener("message", function (e) {
            new AlienTube.Safari(e);
        }, false);
        
        safari.extension.settings.addEventListener("change", function (event) {
            if (event.key === "openSettings") {
                AlienTube.Safari.openPreferences();
            }
        }, false);
    }
}