/// <reference path="BrowserPreferenceManager.ts" />
/// <reference path="Reddit.ts" />
/// <reference path="CommentSection.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />

module AlienTube {
	document.addEventListener( "DOMContentLoaded", function() {
    	if (window.top === window) {
			new Main();
    	}
	}, false );
    export class Main {
        static Preferences : BrowserPreferenceManager;
		commentSection : CommentSection;
		currentVideoIdentifier : string;
        constructor() {
            Main.Preferences = new BrowserPreferenceManager();
			var template = document.createElement("link");
			template.setAttribute("href", Main.getExtensionRessourcePath("templates.html"));
			template.id = "alientubeTemplate";
			template.setAttribute("rel", "import");
			document.head.appendChild(template);

            if (Main.getCurrentBrowser() == Browser.SAFARI) {
                var stylesheet = document.createElement("link");
                stylesheet.setAttribute("href", Main.getExtensionRessourcePath("style.css"));
                stylesheet.setAttribute("type", "text/css");
                stylesheet.setAttribute("rel", "stylesheet");
                document.head.appendChild(stylesheet);
            }
			var observer = new MutationObserver(this.mutationObserver);
			var config = { attributes: true, childList: true, characterData: true };
			observer.observe(document.getElementById("content"), config);

			this.currentVideoIdentifier = Main.getCurrentVideoId();
			this.commentSection = new CommentSection(this.currentVideoIdentifier);
        }

		private mutationObserver(mutations: Array<MutationRecord>) {
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

		static getCurrentVideoId():string {
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

        static getCurrentBrowser():Browser {
            if (chrome) return Browser.CHROME;
            else if (self.on) return Browser.FIREFOX;
            else if (safari) return Browser.SAFARI;
            else {
                throw "Invalid Browser";
            }
        }

        static getExtensionRessourcePath(path :string):string {
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

        static generateUUID():string {
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
