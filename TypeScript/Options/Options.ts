/// <reference path="../LocalisationManager.ts" />
/// <reference path="../BrowserPreferenceManager.ts" />

module AlienTube {
    export class Options {
        private localisationManager : LocalisationManager;
        private preferenceKeyList = [
            "hiddenPostScoreThreshold",
            "hiddenCommentScoreThreshold",
            "showGooglePlusWhenNoPosts",
            "rememberTabsOnViewChange",
            "displayGooglePlusByDefault"
        ];

        private hiddenPostScoreThresholdElement;
        private hiddenCommentScoreThresholdElement;
        private showGooglePlusWhenNoPostsElement;
        private rememberTabsOnViewChangeElement;
        private displayGooglePlusByDefaultElement;

        private saveOptionsButton;
        private displayAboutDialogButton;
        private closeAboutDialogButton;

        private preferences;

        constructor () {
            this.localisationManager = new LocalisationManager();
            this.hiddenPostScoreThresholdElement   = document.getElementById("hiddenPostScoreThreshold");
            this.hiddenCommentScoreThresholdElement = document.getElementById("hiddenCommentScoreThreshold");
            this.showGooglePlusWhenNoPostsElement   = document.getElementById("showGooglePlusWhenNoPosts");
            this.rememberTabsOnViewChangeElement    = document.getElementById("rememberTabsOnViewChange");
            this.displayGooglePlusByDefaultElement  = document.getElementById("displayGooglePlusByDefault");

            this.saveOptionsButton = document.getElementById("saveButton");
            this.displayAboutDialogButton = document.getElementById("aboutButton");
            this.closeAboutDialogButton = document.getElementById("closeButton");

            this.saveOptionsButton.textContent  = this.localisationManager.get("options_button_save");
            this.displayAboutDialogButton.textContent = this.localisationManager.get("options_button_about");
            this.closeAboutDialogButton.textContent = this.localisationManager.get("options_button_close");

            document.title = this.localisationManager.get("options_button_save");
            document.getElementById("versiontext").textContent = this.localisationManager.get("options_label_version");

            this.preferences = new BrowserPreferenceManager(() => {
                for (var i = 0, len = this.preferenceKeyList.length; i < len; i++) {
                    var label = <HTMLLabelElement> document.querySelector("label[for='" + this.preferenceKeyList[i] + "']");
                    label.textContent = this.localisationManager.get("options_label_" + this.preferenceKeyList[i]);
                }

                this.hiddenPostScoreThresholdElement.value       = this.preferences.get("hiddenPostScoreThreshold");
                this.hiddenCommentScoreThresholdElement.value     = this.preferences.get("hiddenCommentScoreThreshold");
                this.showGooglePlusWhenNoPostsElement.checked     = this.preferences.get("showGooglePlusWhenNoPosts");
                this.rememberTabsOnViewChangeElement.checked      = this.preferences.get("rememberTabsOnViewChange");
                this.displayGooglePlusByDefaultElement.checked    = this.preferences.get("displayGooglePlusByDefault");

                this.saveOptionsButton.addEventListener("click", this.saveOptions.bind(this), false);
                this.displayAboutDialogButton.addEventListener("click", this.displayAboutDialog.bind(this), false);
                this.closeAboutDialogButton.addEventListener("click", this.closeAboutDialog.bind(this), false);
                document.getElementById("cover").addEventListener("click", this.closeAboutDialog.bind(this), false);
                document.getElementById('version').textContent = Options.getExtensionVersionNumber();
            });

        }

        saveOptions () {
            if (!this.hiddenPostScoreThresholdElement.value.match(/[0-9]+/)) {
                this.hiddenPostScoreThresholdElement.value = -4;
            }
            if (!this.hiddenCommentScoreThresholdElement.value.match(/[0-9]+/)) {
                this.hiddenCommentScoreThresholdElement.value = -4;
            }

            switch (window.getCurrentBrowser()) {
                case Browser.CHROME:
                    chrome.storage.sync.set({
                        'hiddenPostScoreThreshold' :    this.hiddenPostScoreThresholdElement.value,
                        'hiddenCommentScoreThreshold':  this.hiddenCommentScoreThresholdElement.value,
                        'showGooglePlusWhenNoPosts':    this.showGooglePlusWhenNoPostsElement.checked,
                        'rememberTabsOnViewChange':     this.rememberTabsOnViewChangeElement.checked,
                        'displayGooglePlusByDefault':   this.displayGooglePlusByDefaultElement.checked
                    }, this.displayOptionsSavedTicker.bind(this));
                    break;
            }
        }

        displayAboutDialog () {
            document.getElementById('about').style.visibility="visible";
            document.getElementById('cover').style.visibility="visible";
        }

        closeAboutDialog () {
            document.getElementById('about').style.visibility="collapse";
            document.getElementById('cover').style.visibility="collapse";
        }

        displayOptionsSavedTicker () {
            var status = document.getElementById("status");
            status.textContent = this.localisationManager.get("options_label_saved");
            setTimeout(function () {
                status.textContent = "";
            }, 3000);
        }

        static getExtensionVersionNumber () : string {
            switch (window.getCurrentBrowser()) {
                case Browser.CHROME:
                    return chrome.app.getDetails().version;
            }
            return "";
        }
    }

    interface AlienTubePreferenceKeys {
        hiddenPostScoreThreshold : number;
        hiddenCommentScoreThreshold : number;
        showGooglePlusWhenNoPosts : boolean;
        rememberTabsOnViewChange : boolean;
        displayGooglePlusByDefault : boolean;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    new AlienTube.Options();
}, false);
