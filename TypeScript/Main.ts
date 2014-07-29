/// <reference path="index.ts" />
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
		static localisationManager : LocalisationManager;
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

			// Get language file
			new HttpRequest(Main.getExtensionRessourcePath("localisation.json"), RequestType.GET, (data) => {
				Main.localisationManager = new LocalisationManager(JSON.parse(data));
			});

			// Start observer to detect when a new video is loaded.
			var observer = new MutationObserver(this.mutationObserver);
			var config = { attributes : true, childList : true, characterData : true };
			observer.observe(document.getElementById("content"), config);

			// Start a new comment section.
			this.currentVideoIdentifier = Main.getCurrentVideoId();
			this.commentSection = new CommentSection(this.currentVideoIdentifier);
        }

		/**
			Mutation Observer for monitoring for whenver the user changes to a new "page"
		*/
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
		* Get a Reddit-style "x time ago" Timestamp from a unix epoch time.
		* @param epochTime Epoch timestamp to calculate from.
		* @returns A string with a human readable time.
		*/
		static getHumanReadableTimestamp(epochTime : number) : string {
			var secs = Math.floor(((new Date()).getTime() / 1000) - epochTime);
			var timeUnits = {
				Year:   Math.floor(secs / 60 / 60 / 24 / 365.27),
				Month:  Math.floor(secs / 60 / 60 / 24 / 30),
				Week:   Math.floor(secs / 60 / 60 / 24 / 7),
				Day:    Math.floor(secs / 60 / 60 / 24),
				Hour:   Math.floor(secs / 60 / 60),
				Minute: Math.floor(secs / 60),
				Second: secs,
			};

		 	/* Retrieve the most relevant number by retrieving the first one that is "1" or more.
			   Decide if it is plural and retrieve the correct localisation */
			for (var timeUnit in timeUnits) {
				if (timeUnits.hasOwnProperty(timeUnit) && timeUnits[timeUnit] >= 1) {
					var timeString = timeUnits[timeUnit] > 1 ?
						this.localisationManager.get("timestampPlural" + timeUnit) : this.localisationManager.get("timestamp" + timeUnit);
					return timeUnits[timeUnit] + " " + timeString;
				}
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
