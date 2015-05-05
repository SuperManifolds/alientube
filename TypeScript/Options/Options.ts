/// <reference path="../LocalisationManager.ts" />
/// <reference path="../BrowserPreferenceManager.ts" />

/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
"use strict";
module AlienTube {
    /**
     * The extension ptions page for all browsers.
     * @class Options
     */
    export class Options {
        private static preferenceKeyList = [
            "hiddenPostScoreThreshold",
            "hiddenCommentScoreThreshold",
            "showGooglePlusWhenNoPosts",
            "showGooglePlusButton",
            "defaultDisplayAction"
        ];

        /* Declare the page HTML elements. */
        private hiddenPostScoreThresholdElement;
        private hiddenCommentScoreThresholdElement;
        private showGooglePlusWhenNoPostsElement;
        private showGooglePlusButtonElement;
        private defaultDisplayActionElement;
        private saveOptionsButton;
        private displayAboutDialogButton;
        private closeAboutDialogButton;

        /* Declare the preferences object and the localisation object. */
        private preferences;
        private localisationManager;

        constructor () {
            this.localisationManager = new LocalisationManager(() => {
                var i, len, label;
                
                /* Get the input elements for the various preferences on the option page. */
                this.hiddenPostScoreThresholdElement    = document.getElementById("hiddenPostScoreThreshold");
                this.hiddenCommentScoreThresholdElement = document.getElementById("hiddenCommentScoreThreshold");
                this.showGooglePlusWhenNoPostsElement   = document.getElementById("showGooglePlusWhenNoPosts");
                this.showGooglePlusButtonElement        = document.getElementById("showGooglePlusButton");
                this.defaultDisplayActionElement        = document.getElementById("defaultDisplayAction");

                /* Get the various buttons for the page. */
                this.saveOptionsButton = document.getElementById("saveButton");
                this.displayAboutDialogButton = document.getElementById("aboutButton");
                this.closeAboutDialogButton = document.getElementById("closeButton");
                
                /* Set the localised text of the buttons. */
                this.saveOptionsButton.textContent  = this.localisationManager.get("options_button_save");
                this.displayAboutDialogButton.textContent = this.localisationManager.get("options_button_about");
                this.closeAboutDialogButton.textContent = this.localisationManager.get("options_button_close");
                
                /* Set the page title */
                document.title = this.localisationManager.get("options_button_title");

                this.preferences = new BrowserPreferenceManager((preferences) => {
                    /* Set the localisation text for the labels of every setting in the options panel. */
                    for (i = 0, len = Options.preferenceKeyList.length; i < len; i += 1) {
                        console.log("label[for='" + Options.preferenceKeyList[i] + "']");
                        label = <HTMLLabelElement> document.querySelector("label[for='" + Options.preferenceKeyList[i] + "']");
                        label.textContent = this.localisationManager.get("options_label_" + Options.preferenceKeyList[i]);
                    }
                    
                    /* Set the localised text for the "default display action" dropdown options. */
                    this.defaultDisplayActionElement.options[0].textContent = this.localisationManager.get("options_label_alientube");
                    this.defaultDisplayActionElement.options[1].textContent = this.localisationManager.get("options_label_gplus");

                    /* Set the option input element values to what we have stored in preferences or their default values. */
                    this.hiddenPostScoreThresholdElement.value        = preferences.getNumber("hiddenPostScoreThreshold");
                    this.hiddenCommentScoreThresholdElement.value     = preferences.getNumber("hiddenCommentScoreThreshold");
                    this.showGooglePlusWhenNoPostsElement.checked     = preferences.getBoolean("showGooglePlusWhenNoPosts");
                    this.showGooglePlusButtonElement.checked          = preferences.getBoolean("showGooglePlusButton");
                    this.defaultDisplayActionElement.selectedIndex    = preferences.getString("defaultDisplayAction") === "alientube" ? 0 : 1;

                    /* Set the event listeners for the buttons on the page. */
                    this.saveOptionsButton.addEventListener("click", this.save.bind(this), false);
                    this.displayAboutDialogButton.addEventListener("click", this.displayAboutDialog.bind(this), false);
                    this.closeAboutDialogButton.addEventListener("click", this.closeAboutDialog.bind(this), false);
                    document.getElementById("cover").addEventListener("click", this.closeAboutDialog.bind(this), false);
                    
                    /* Set the extension version label. */
                    document.getElementById("versiontext").textContent = this.localisationManager.get("options_label_version");
                    document.getElementById('version').textContent = Options.getExtensionVersionNumber();
                });
            });
        }
        
        /**
         * Save all the settings on the page.
         */
        private save () {
            /* If the user has entered an invalid input in the number fields, set them to the default. */
            if (!this.hiddenPostScoreThresholdElement.value.match(/[0-9]+/)) {
                this.hiddenPostScoreThresholdElement.value = -4;
            }
            if (!this.hiddenCommentScoreThresholdElement.value.match(/[0-9]+/)) {
                this.hiddenCommentScoreThresholdElement.value = -4;
            }
            
            /* Save the preferences to disk. */
            this.preferences.set('hiddenPostScoreThreshold', this.hiddenPostScoreThresholdElement.value);
            this.preferences.set('hiddenCommentScoreThreshold', this.hiddenCommentScoreThresholdElement.value);
            this.preferences.set('showGooglePlusWhenNoPosts', this.showGooglePlusWhenNoPostsElement.checked);
            this.preferences.set('showGooglePlusButton', this.showGooglePlusButtonElement.checked);
            this.preferences.set('defaultDisplayAction', this.defaultDisplayActionElement.value);
            
            /* Display a small message to let the user know their settings has been saved. */
            this.displayOptionsSavedTicker.bind(this);
        }
        
        /**
         * Display the "About AlienTube" dialog.
         * @private
         */
        private displayAboutDialog () {
            document.getElementById('about').style.visibility="visible";
            document.getElementById('cover').style.visibility="visible";
        }
        
        /**
         * Close the "About AlienTube" dialog.
         * @private
         */
        private closeAboutDialog () {
            document.getElementById('about').style.visibility="collapse";
            document.getElementById('cover').style.visibility="collapse";
        }
        
        /**
         * Display a small status message informing the user that their settings has been saved.
         * @private
         */
        private displayOptionsSavedTicker () {
            var status = document.getElementById("status");
            status.textContent = this.localisationManager.get("options_label_saved");
            setTimeout(function () {
                status.textContent = "";
            }, 3000);
        }
        
        /**
         * Get the current version of the extension running on this machine.
         * @private
         */
        private static getExtensionVersionNumber () : string {
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
        hiddenPostScoreThreshold    	: number;
        hiddenCommentScoreThreshold     : number;
        showGooglePlusWhenNoPosts       : boolean;
        showGooglePlusButton            : boolean;
        defaultDisplayAction            : string;
    }
}

new AlienTube.Options();
