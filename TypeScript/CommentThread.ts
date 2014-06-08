/// <reference path="Main.ts" />
/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />

module AlienTube {
    export class CommentThread {
        constructor(threadData : any) {
            var threadInformation = threadData[0].data.children[0].data;
            var commentData = threadData[1].data.children;
            var previousUserIdentifier = Main.Preferences.get("userIdentifier");
            Main.Preferences.set("userIdentifier", threadData[0].data.modhash);
            
        }
    }
}
