/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="CommentSection.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />

/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
	document.addEventListener( "DOMContentLoaded", function() {
    	if (window.top === window) {
			new Main();
    	}
	}, false );


	/**
		Main class for AlienTube
		@class Main
	*/
    export class Main {
        static Preferences : BrowserPreferenceManager;
		commentSection : CommentSection;
		currentVideoIdentifier : string;
        constructor() {
			// Load stylesheet from disk.
            Main.Preferences = new BrowserPreferenceManager();
            if (Main.getCurrentBrowser() == Browser.SAFARI) {
                var stylesheet = document.createElement("link");
                stylesheet.setAttribute("href", Main.getExtensionRessourcePath("style.css"));
                stylesheet.setAttribute("type", "text/css");
                stylesheet.setAttribute("rel", "stylesheet");
                document.head.appendChild(stylesheet);
            }

			// Start observer to detect when a new video is loaded.
			var observer = new MutationObserver(this.mutationObserver);
			var config = { attributes : true, childList : true, characterData : true };
			observer.observe(document.getElementById("content"), config);

			// Start a new comment section.
			this.currentVideoIdentifier = Main.getCurrentVideoId();
			this.commentSection = new CommentSection(this.currentVideoIdentifier);
        }


		private mutationObserver(mutations : Array<MutationRecord>) {
			mutations.forEach(function(mutation) {
				var target = <HTMLElement>mutation.target;
				if (target.classList.contains("yt-card")) {
					var reportedVideoId = Main.getCurrentVideoId();
					if (reportedVideoId !== this.currentVideoIdentifier) {
						this.currentVideoIdentifier = reportedVideoId;
						this.commentSection = new CommentSection(this.currentVideoIdentifier);
					}
				}
			});
		}

		/**
    	* Get the current YouTube video identifier of the window.
    	* @returns YouTube video identifier.
    	*/
		static getCurrentVideoId() : string {
			if (window.location.search.length > 0) {
				var s = window.location.search.substring(1);
				var requestObjects = s.split('&');
				for (var i = 0, len = requestObjects.length; i < len; i++) {
					var obj = requestObjects[i].split('=');
					if (obj[0] === "v") {
						return obj[1];
					}
				}
			}
			return null;
		}

		/**
		* Determine a reddit post is more than 6 months old, and thereby in preserved status.
		* @param epochTime The unix epoch time of the post.
		* @returns Boolean saying whether the post is preserved or not.
		*/
		static isPreserved(epochTime : number) : Boolean {
			return ((((new Date()).getTime() / 1000) - epochTime) >= 15552000);
		}

		/**
		* Get the current browser that the extension is running as.
		* @returns An AlienTube.Browser enum with the value of the Browser.
		*/
        static getCurrentBrowser() : Browser {
            if (chrome) return Browser.CHROME;
            else if (self.on) return Browser.FIREFOX;
            else if (safari) return Browser.SAFARI;
            else {
                throw "Invalid Browser";
            }
        }

		/**
		* Get the path to a ressource in the AlienTube folder.
		* @param path Filename to the ressource.
		* @returns Ressource path (file://)
		*/
        static getExtensionRessourcePath(path : string) : string {
            switch (Main.getCurrentBrowser()) {
                case Browser.SAFARI:
                    return safari.extension.baseURI + 'res/' + path;
                case Browser.CHROME:
                    return chrome.extension.getURL('res/' + path);
                case Browser.FIREFOX:
                    return self.options[path];
                default:
                    return null;
            }
        }

		/**
		* Generate a UUID 4 sequence.
		* @returns A UUID 4 sequence as string.
		*/
        static generateUUID() : string {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0,
                    v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }
    export enum Browser {
        CHROME,
        FIREFOX,
        SAFARI
    }
}
