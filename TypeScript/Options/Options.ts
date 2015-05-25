/// <reference path="../LocalisationManager.ts" />
/// <reference path="../Preferences.ts" />

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
        private defaultDisplayActionElement;
        private resetButtonElement;

        /* Declare the preferences object and the localisation object. */
        private localisationManager;

        constructor () {
            this.localisationManager = new LocalisationManager(() => {
                var i, len, label, inputElement, selectValue, optionElementIndex;
                
                /* Get the element for inputs we need to specifically modify. */
                this.defaultDisplayActionElement = document.getElementById("defaultDisplayAction");

                /* Get the various buttons for the page. */
                this.resetButtonElement = document.getElementById("reset");
                
                /* Set the localised text of the reset button. */
                this.resetButtonElement.textContent = this.localisationManager.get("options_label_reset");
                
                /* Set the page title */
                window.document.title = this.localisationManager.get("options_label_title");

                Preferences.initialise((preferences) => {
                    /* Go over every setting in the options panel. */
                    for (i = 0, len = Options.preferenceKeyList.length; i < len; i += 1) {
                        /* Set the localised text for every setting. */
                        label = <HTMLLabelElement> document.querySelector("label[for='" + Options.preferenceKeyList[i] + "']");
                        label.textContent = this.localisationManager.get("options_label_" + Options.preferenceKeyList[i]);
                        
                        /* Get the control for the setting. */
                        inputElement = document.getElementById(Options.preferenceKeyList[i]);
                        if (inputElement.tagName === "SELECT") {
                            /* This control is a select/dropdown element. Retreive the existing setting for this. */
                            inputElement = <HTMLSelectElement> inputElement;
                            selectValue = Preferences.getString(Options.preferenceKeyList[i]);
                            
                            /* Go over every dropdown item to find the one we need to set as selected. Unfortunately NodeList does not inherit from 
                               Array and does not have forEach. Therefor we will force an iteration over it by calling Array.prototype.forEach.call */
                            optionElementIndex = 0;
                            Array.prototype.forEach.call(inputElement.options, (optionElement) => {
                                if (optionElement.value === selectValue) {
                                    inputElement.selectedIndex = optionElementIndex;
                                }
                                optionElementIndex += 1;
                            });
                            
                            /* Call the settings changed event when the user has selected a different dropdown item.*/
                            inputElement.addEventListener("change", this.saveUpdatedSettings, false);
                        } else if (inputElement.getAttribute("type") === "number"){
                            /* This control is a number input element. Retreive the existing setting for this. */
                            inputElement.value = Preferences.getNumber(Options.preferenceKeyList[i]);
                            
                            /* Call the settings changed event when the user has pushed a key, cut to clipboard, or pasted, from clipboard */
                            inputElement.addEventListener("keyup", this.saveUpdatedSettings, false);
                            inputElement.addEventListener("cut", this.saveUpdatedSettings, false);
                            inputElement.addEventListener("paste", this.saveUpdatedSettings, false);
                        } else if (inputElement.getAttribute("type") === "checkbox") {
                            /* This control is a checkbox. Retreive the existing setting for this. */
                            inputElement.checked = Preferences.getBoolean(Options.preferenceKeyList[i]);
                            
                            /* Call the settings changed event when the user has changed the state of the checkbox. */
                            inputElement.addEventListener("change", this.saveUpdatedSettings, false);
                        }
                    }
                    
                    /* Set event handler for the reset button. */
                    this.resetButtonElement.addEventListener("click", this.resetSettings, false);
                    
                    /* Set the localised text for the "default display action" dropdown options. */
                    this.defaultDisplayActionElement.options[0].textContent = this.localisationManager.get("options_label_alientube");
                    this.defaultDisplayActionElement.options[1].textContent = this.localisationManager.get("options_label_gplus");
                    
                    /* Set the extension version label. */
                    document.getElementById("versiontext").textContent = this.localisationManager.get("options_label_version");
                    document.getElementById('version').textContent = Options.getExtensionVersionNumber();
                });
            });
        }
        
        /**
         * Trigger when a setting has been changed by the user, update the control, and save the setting.
         * @param event The event object.
         */
        private saveUpdatedSettings(event : Event) {
            var inputElement = <HTMLInputElement> event.target;
            if (inputElement.getAttribute("type") === "number") {
                if (inputElement.value.match(/[0-9]+/)) {
                    inputElement.removeAttribute("invalidInput");
                } else {
                    inputElement.setAttribute("invalidInput", "true");
                    return;
                }
            }
            
            if (inputElement.getAttribute("type") === "checkbox") {
                Preferences.set(inputElement.id, inputElement.checked);
            } else {
                Preferences.set(inputElement.id, inputElement.value);
            }
        }
        
        /**
         * Reset all the settings to factory defaults.
         */
        private resetSettings() {
            Preferences.reset();
            new AlienTube.Options();
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
