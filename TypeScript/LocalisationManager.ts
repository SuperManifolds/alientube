/// <reference path="Utilities.ts" />
/// <reference path="HttpRequest.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
module AlienTube {
    /**
        * Starts a new instance of the Localisation Manager, for handling language.
        * @class LocalisationManager
        * @param [callback] a callback method to be called after the localisation files has been loaded.
    */
    "use strict";
    export class LocalisationManager {
        private localisationData: any;
        private supportedLocalisations = [
            'en',
            'en-US',
            'no',
            'es',
            'fr'
        ];

        constructor(callback?) {
            switch (Utilities.getCurrentBrowser()) {
                case Browser.SAFARI:
                    let localisation = navigator.language.split('-')[0];
                    if (this.supportedLocalisations.indexOf(localisation) === -1) {
                        localisation = "en";
                    }
                    
                    new HttpRequest(`${safari.extension.baseURI}_locales/${localisation}/messages.json`, RequestType.GET, function (data)  {
                        this.localisationData = JSON.parse(data);
                        if (callback) {
                            requestAnimationFrame(callback);
                        }
                    }.bind(this));
                    break;

                case Browser.FIREFOX:
                    this.localisationData = JSON.parse(self.options.localisation);
                    if (callback) {
                        requestAnimationFrame(callback);
                    }
                    break;

                default:
                    if (callback) {
                        requestAnimationFrame(callback);
                    }
                    break;
            }
        }

        /**
            * Retrieve a localised string by key
            * @param key The key in the localisation file representing a language string.
            * @param [placeholders] An array of values for the placeholders in the string.
            * @returns The requested language string.
        */
        public get(key: string, placeholders?: Array<string>) {
            switch (Utilities.getCurrentBrowser()) {
                case Browser.CHROME:
                    if (placeholders) {
                        return chrome.i18n.getMessage(key, placeholders);
                    } else {
                        return chrome.i18n.getMessage(key);
                    }

                case Browser.SAFARI:
                case Browser.FIREFOX:
                    if (placeholders) {
                        let localisationItem = this.localisationData[key];
                        if (localisationItem) {
                            let message = localisationItem.message;
                            for (let placeholder in localisationItem.placeholders) {
                                if (localisationItem.placeholders.hasOwnProperty(placeholder)) {
                                    let placeHolderArgumentIndex = parseInt(localisationItem.placeholders[placeholder].content.substring(1), 10);
                                    message = message.replace("$" + placeholder.toUpperCase() + "$", placeholders[placeHolderArgumentIndex - 1]);
                                }
                            }
                            return message;
                        }
                    } else {
                        return this.localisationData[key] ? this.localisationData[key].message : "";
                    }
                    break;
            }
            return "";
        }
        
        /**
         * Retreive a localised string related to a number of items, localising plurality by language.
         * @param key The key for the non-plural version of the string.
         * @param value The number to localise by.
         * @returns The requested language string.
         */
        public getWithLocalisedPluralisation(key : string, value : number) {
            if (value > 1 || value === 0) {
                return this.get(`${key}_plural`);
            } else {
                return this.get(key);
            }
        }
    }
}
