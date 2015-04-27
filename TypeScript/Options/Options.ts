/// <reference path="../LocalisationManager.ts" />
/// <reference path="../BrowserPreferenceManager.ts" />

"use strict";
module AlienTube {
    export class Options {
        private preferenceKeyList = [
            "hiddenPostScoreThreshold",
            "hiddenCommentScoreThreshold",
            "showGooglePlusWhenNoPosts",
            "rememberTabsOnViewChange",
            "displayGooglePlusByDefault",
            "showGooglePlusButton"
        ];

        private hiddenPostScoreThresholdElement;
        private hiddenCommentScoreThresholdElement;
        private showGooglePlusWhenNoPostsElement;
        private rememberTabsOnViewChangeElement;
        private displayGooglePlusByDefaultElement;
        private showGooglePlusButtonElement;

        private saveOptionsButton;
        private displayAboutDialogButton;
        private closeAboutDialogButton;

        private preferences;
        private localisationManager;

        constructor () {
            this.localisationManager = new LocalisationManager(() => {
                var i, len, label;

                this.hiddenPostScoreThresholdElement    = document.getElementById("hiddenPostScoreThreshold");
                this.hiddenCommentScoreThresholdElement = document.getElementById("hiddenCommentScoreThreshold");
                this.showGooglePlusWhenNoPostsElement   = document.getElementById("showGooglePlusWhenNoPosts");
                this.rememberTabsOnViewChangeElement    = document.getElementById("rememberTabsOnViewChange");
                this.displayGooglePlusByDefaultElement  = document.getElementById("displayGooglePlusByDefault");
                this.showGooglePlusButtonElement        = document.getElementById("showGooglePlusButton");

                this.saveOptionsButton = document.getElementById("saveButton");
                this.displayAboutDialogButton = document.getElementById("aboutButton");
                this.closeAboutDialogButton = document.getElementById("closeButton");

                this.saveOptionsButton.textContent  = this.localisationManager.get("options_button_save");
                this.displayAboutDialogButton.textContent = this.localisationManager.get("options_button_about");
                this.closeAboutDialogButton.textContent = this.localisationManager.get("options_button_close");

                document.title = this.localisationManager.get("options_button_title");
                document.getElementById("versiontext").textContent = this.localisationManager.get("options_label_version");

                this.preferences = new BrowserPreferenceManager((preferences) => {
                    for (i = 0, len = this.preferenceKeyList.length; i < len; i += 1) {
                        label = <HTMLLabelElement> document.querySelector("label[for='" + this.preferenceKeyList[i] + "']");
                        label.textContent = this.localisationManager.get("options_label_" + this.preferenceKeyList[i]);
                    }

                    this.hiddenPostScoreThresholdElement.value        = preferences.getNumber("hiddenPostScoreThreshold");
                    this.hiddenCommentScoreThresholdElement.value     = preferences.getNumber("hiddenCommentScoreThreshold");
                    this.showGooglePlusWhenNoPostsElement.checked     = preferences.getBoolean("showGooglePlusWhenNoPosts");
                    this.rememberTabsOnViewChangeElement.checked      = preferences.getBoolean("rememberTabsOnViewChange");
                    this.displayGooglePlusByDefaultElement.checked    = preferences.getBoolean("displayGooglePlusByDefault");
                    this.showGooglePlusButtonElement.checked          = preferences.getBoolean("showGooglePlusButton");

                    this.saveOptionsButton.addEventListener("click", this.saveOptions.bind(this), false);
                    this.displayAboutDialogButton.addEventListener("click", this.displayAboutDialog.bind(this), false);
                    this.closeAboutDialogButton.addEventListener("click", this.closeAboutDialog.bind(this), false);
                    document.getElementById("cover").addEventListener("click", this.closeAboutDialog.bind(this), false);
                    document.getElementById('version').textContent = Options.getExtensionVersionNumber();
                });
            });
        }

        saveOptions () {
            if (!this.hiddenPostScoreThresholdElement.value.match(/[0-9]+/)) {
                this.hiddenPostScoreThresholdElement.value = -4;
            }
            if (!this.hiddenCommentScoreThresholdElement.value.match(/[0-9]+/)) {
                this.hiddenCommentScoreThresholdElement.value = -4;
            }

            this.preferences.set('hiddenPostScoreThreshold', this.hiddenPostScoreThresholdElement.value);
            this.preferences.set('hiddenCommentScoreThreshold', this.hiddenCommentScoreThresholdElement.value);
            this.preferences.set('showGooglePlusWhenNoPosts', this.showGooglePlusWhenNoPostsElement.checked);
            this.preferences.set('rememberTabsOnViewChange', this.rememberTabsOnViewChangeElement.checked);
            this.preferences.set('displayGooglePlusByDefault', this.displayGooglePlusByDefaultElement.checked);
            this.preferences.set('showGooglePlusButton', this.showGooglePlusButtonElement.checked);

            this.displayOptionsSavedTicker.bind(this);
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
                    break;

                case Browser.FIREFOX:
                    return self.options.version;
                    break;
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
        showGooglePlusButton : boolean;
    }
}

new AlienTube.Options();
