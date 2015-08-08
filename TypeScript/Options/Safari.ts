/// <reference path="../typings/safari/safari.d.ts" />
/// <reference path="../HttpRequest.ts" />
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
                new HttpRequest(event.message.url, event.message.requestType, (data) => {
                    event.target.page.dispatchMessage("POST", {
                        'uuid': event.message.uuid,
                        'data': data
                    });
                }, event.message.postData, (error) => {
                   event.target.page.dispatchMessage("POST", {
                        'uuid': event.message.uuid,
                        'error': error
                    });
                });
            } else if (event.name == "setPreference") {
                console.log("setting preference");
                localStorage.setItem(event.message.key, event.message.value);
            } else if (event.name === "getPreferences") {
                var preferences = {};
                var numKeys = localStorage.length;
                for (var i = 0; i < numKeys; i++) {
                    var keyName = localStorage.key(i);
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