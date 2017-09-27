/// <reference path="../LocalisationManager.ts" />
/// <reference path="../Preferences.ts" />
/// <reference path="../APIKeys.ts" />
/// <reference path="../Migration.ts" />
/// <reference path="Safari.ts" />

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
        private excludeSubredditsField;
        private addToExcludeButton;
        private excludeListContainer;

        /* Declare the preferences object and the localisation object. */
        private localisationManager;
        private excludedSubreddits;

        constructor() {
            this.localisationManager = new LocalisationManager(function () {
                /* Get the element for inputs we need to specifically modify. */
                this.defaultDisplayActionElement = document.getElementById("defaultDisplayAction");

                /* Get the various buttons for the page. */
                this.resetButtonElement = document.getElementById("reset");
                this.addToExcludeButton = document.getElementById("addSubredditToList");
                
                /* Set the localised text of the reset button. */
                this.resetButtonElement.textContent = this.localisationManager.get("options_label_reset");
                this.addToExcludeButton.textContent = this.localisationManager.get("options_button_add");
                
                /* Get the element for the exclude subreddits input field and the list container. */
                this.excludeSubredditsField = document.getElementById("addSubredditsForExclusion");
                this.excludeListContainer = document.getElementById("excludedSubreddits");
                
                /* Set the page title */
                window.document.title = this.localisationManager.get("options_label_title");

                Preferences.initialise(function (preferences) {
                    // Check if a version migration is necessary.
                    if (Preferences.getString("lastRunVersion") !== Options.getExtensionVersionNumber()) {
                        new Migration(Preferences.getString("lastRunVersion"));
                        
                        /* Update the last run version paramater with the current version so we'll know not to run this migration again. */
                        Preferences.set("lastRunVersion", Options.getExtensionVersionNumber());
                    }
                    
                    /* Go over every setting in the options panel. */
                    for (let i = 0, len = Options.preferenceKeyList.length; i < len; i += 1) {
                        /* Set the localised text for every setting. */
                        let label = <HTMLLabelElement> document.querySelector("label[for='" + Options.preferenceKeyList[i] + "']");
                        label.textContent = this.localisationManager.get("options_label_" + Options.preferenceKeyList[i]);
                        
                        /* Get the control for the setting. */
                        let inputElement = document.getElementById(Options.preferenceKeyList[i]);
                        if (inputElement.tagName === "SELECT") {
                            /* This control is a select/dropdown element. Retreive the existing setting for this. */
                            var selectInputElement = <HTMLSelectElement> inputElement;
                            var selectValue = Preferences.getString(Options.preferenceKeyList[i]);
                            
                            /* Go over every dropdown item to find the one we need to set as selected. Unfortunately NodeList does not inherit from 
                               Array and does not have forEach. Therefor we will force an iteration over it by calling Array.prototype.forEach.call */
                            var optionElementIndex = 0;
                            Array.prototype.forEach.call(selectInputElement.options, function (optionElement) {
                                if (optionElement.value === selectValue) {
                                    selectInputElement.selectedIndex = optionElementIndex;
                                }
                                optionElementIndex += 1;
                            });
                            
                            /* Call the settings changed event when the user has selected a different dropdown item.*/
                            inputElement.addEventListener("change", this.saveUpdatedSettings, false);
                        } else if (inputElement.getAttribute("type") === "number") {
                            let numberInputElement = <HTMLInputElement>inputElement;
                            /* This control is a number input element. Retreive the existing setting for this. */
                            numberInputElement.value = Preferences.getNumber(Options.preferenceKeyList[i]).toString();
                            
                            /* Call the settings changed event when the user has pushed a key, cut to clipboard, or pasted, from clipboard */
                            inputElement.addEventListener("keyup", this.saveUpdatedSettings, false);
                            inputElement.addEventListener("cut", this.saveUpdatedSettings, false);
                            inputElement.addEventListener("paste", this.saveUpdatedSettings, false);
                        } else if (inputElement.getAttribute("type") === "checkbox") {
                            let checkboxInputElement = <HTMLInputElement> inputElement;
                            
                            /* This control is a checkbox. Retreive the existing setting for this. */
                            checkboxInputElement.checked = Preferences.getBoolean(Options.preferenceKeyList[i]);
                            
                            /* Call the settings changed event when the user has changed the state of the checkbox. */
                            checkboxInputElement.addEventListener("change", this.saveUpdatedSettings, false);
                        }
                    }

                    document.querySelector("label[for='addSubredditForExclusion']").textContent = this.localisationManager.get("options_label_hide_following");
                    
                    /* Set event handler for the reset button. */
                    this.resetButtonElement.addEventListener("click", this.resetSettings, false);
                    
                    /* Set the localised text for the "default display action" dropdown options. */
                    this.defaultDisplayActionElement.options[0].textContent = this.localisationManager.get("options_label_alientube");
                    this.defaultDisplayActionElement.options[1].textContent = this.localisationManager.get("options_label_gplus");

                    this.excludedSubreddits = Preferences.getArray("excludedSubredditsSelectedByUser");
                    
                    /* Erase the current contents of the subreddit list, in case this is an update call on an existing page. */
                    while (this.excludeListContainer.firstChild !== null) {
                        this.excludeListContainer.removeChild(this.excludeListContainer.firstChild);
                    }
                    
                    /* Populate the excluded subreddit list. */
                    this.excludedSubreddits.forEach(function (subreddit) {
                        this.addSubredditExclusionItem(subreddit);
                    });
                    
                    /* Validate the input to see if it is a valid subreddit on key press, cut, or paste, and aditionally check for an 'Enter' key press and process it as a submission. */
                    this.excludeSubredditsField.addEventListener("keyup", this.onExcludeFieldKeyUp.bind(this), false);
                    this.addToExcludeButton.addEventListener("click", this.addItemToExcludeList.bind(this), false);
                    this.excludeSubredditsField.addEventListener("cut", this.validateExcludeField.bind(this), false);
                    this.excludeSubredditsField.addEventListener("paste", this.validateExcludeField.bind(this), false);
                    
                    /* Set the extension version label. */
                    document.getElementById("versiontext").textContent = this.localisationManager.get("options_label_version");
                    document.getElementById('version').textContent = Options.getExtensionVersionNumber();
                }.bind(this));
            }.bind(this));
        }
        
        /**
         * Trigger when a setting has been changed by the user, update the control, and save the setting.
         * @param event The event object.
         * @private
         */
        private saveUpdatedSettings(event: Event) {
            let inputElement = <HTMLInputElement> event.target;
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
         * @private
         */
        private resetSettings() {
            Preferences.reset();
            new AlienTube.Options();
            Preferences.set("lastRunVersion", Options.getExtensionVersionNumber());
        }
        
        /**
         * Add a subreddit item to the excluded subreddits list on the options page. This does not automatically add it to preferences.
         * @param subreddit The name of the subreddit to block, case insensitive.
         * @param [animate] Whether to visualise the submission as text animating from the input field into the list.
         * @private
         */
        private addSubredditExclusionItem(subreddit: string, animate?: boolean) {
            /* Create the list item and set the name of the subreddit. */
            let subredditElement = document.createElement("div");
            subredditElement.setAttribute("subreddit", subreddit);
            
            /* Create and populate the label that contains the name of the subreddit. */
            let subredditLabel = document.createElement("span");
            subredditLabel.textContent = subreddit;
            subredditElement.appendChild(subredditLabel);
            
            /* Create the remove item button and set the event handler. */
            let removeButton = document.createElement("button");
            removeButton.textContent = '╳';
            subredditElement.appendChild(removeButton);
            removeButton.addEventListener("click", this.removeSubredditFromExcludeList.bind(this), false);
            
            /* If requested, place the list item on top of the input field and css transition it to the top of the list. */
            if (animate) {
                subredditElement.classList.add("new");
                setTimeout(function () {
                    subredditElement.classList.remove("new");
                }, 100);
            }
            
            /* Add the item to the top of the list view. */
            this.excludeListContainer.insertBefore(subredditElement, this.excludeListContainer.firstChild);
        }
        
        /**
         * Validate keyboard input in the exclude subreddits text field, and if an enter press is detected, process it as a submission.
         * @param event A keyboard event object
         * @private
         */
        private onExcludeFieldKeyUp(event : KeyboardEvent) {
            if (!this.validateExcludeField(event)) return;
            if (event.keyCode === 13) {
                this.addItemToExcludeList(event);
            }
        }
        
        /**
         * Validate the exclude subreddits text field after any input change event.
         * @param event Any input event with the exclude subreddits text field as a target.
         * @private
         */
        private validateExcludeField(event: Event): boolean {
            let textfield = <HTMLInputElement>event.target;
            
            /* Check that the text field contents is a valid subreddit name. */
            if (textfield.value.match(/([A-Za-z0-9_]+|[reddit.com]){3}/) !== null) {
                this.addToExcludeButton.disabled = false;
                return true;
            }
            this.addToExcludeButton.disabled = true;
            return false;
        }
        
        /**
         * Add the contents of the exclude subreddits field to the exclude subreddits list in the options page and in the preferences.
         * @param event A button press or enter event.
         * @private
         */
        private addItemToExcludeList(event: Event) {
            /* Retrieve the subreddit name from the text field, and add it to the list. */
            let subredditName = this.excludeSubredditsField.value;
            this.addSubredditExclusionItem(subredditName, true);
            
            /* Add the subreddit name to the list in preferences. */
            this.excludedSubreddits.push(subredditName);
            Preferences.set("excludedSubredditsSelectedByUser", this.excludedSubreddits);
            
            /* Remove the contents of the text field and reset the submit button state. */
            setTimeout(function () {
                this.addToExcludeButton.disabled = true;
                this.excludeSubredditsField.value = "";
            }, 150);
        }
    	
        /**
         * Remove a subreddit from the exclude list on the options page and in the preferences.
         * @param event An event from the click of a remove button on a subreddit list item.
         * @private
         */
        private removeSubredditFromExcludeList(event: Event) {
            /* Retrieve the subreddit item that will be removed. */
            let subredditElement = <HTMLDivElement>(<HTMLButtonElement> event.target).parentNode;
            
            /* Remove the item from the preferences file. */
            this.excludedSubreddits.splice(this.excludedSubreddits.indexOf(subredditElement.getAttribute("subreddit")), 1);
            Preferences.set("excludedSubredditsSelectedByUser", this.excludedSubreddits);
            
            /* Remove the item from the list on the options page and animate its removal. */
            subredditElement.classList.add("removed");
            setTimeout(function () {
                this.excludeListContainer.removeChild(subredditElement);
            }, 500);
        }
        
        /**
         * Get the current version of the extension running on this machine.
         * @private
         */
        private static getExtensionVersionNumber(): string {
            let version = "";
            switch (Utilities.getCurrentBrowser()) {
                case Browser.CHROME:
                    version = chrome.runtime.getManifest().version;
                    break;

                case Browser.FIREFOX:
                    version = self.options.version;
                    break;
                    
                case Browser.SAFARI:
                    version = safari.extension.displayVersion;
                    break;
            }
            return version || "";
        }
    }

    interface AlienTubePreferenceKeys {
        hiddenPostScoreThreshold: number;
        hiddenCommentScoreThreshold: number;
        showGooglePlusWhenNoPosts: boolean;
        showGooglePlusButton: boolean;
        defaultDisplayAction: string;
    }
}

new AlienTube.Options();
