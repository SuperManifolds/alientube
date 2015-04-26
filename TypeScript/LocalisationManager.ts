/// <reference path="Utilities.ts" />
/// <reference path="HttpRequest.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        Starts a new instance of the Localisation Manager, for handling language.
        @class LocalisationManager
    */
    export class LocalisationManager {
        private localisationData : any;
        private supportedLocalisations = [
            'en',
            'no',
            'es',
            'fr'
        ];

        constructor(callback?) {
            switch (window.getCurrentBrowser()) {
                case Browser.SAFARI:
                    var localisation = navigator.language.split('-')[0];
                    if (this.supportedLocalisations.indexOf(localisation) == -1) {
                        localisation = "en";
                    }
                    new HttpRequest(safari.extension.baseURI + '_locales/' + localisation + "/messages.json", RequestType.GET, (data) => {
                        this.localisationData = JSON.parse(data);
                        if (callback) setTimeout(callback, 0);
                    }, null, null);
                break;

                case Browser.FIREFOX:
                    this.localisationData = JSON.parse(self.options.localisation);
                    if (callback) setTimeout(callback, 0);
                    break;

                default:
                    if (callback) setTimeout(callback, 0);
                    break;
            }
        }

        /**
            Retrieve a localised string by key
            @param key The key in the localisation file representing a language string.
            @param [placeholders] An array of values for the placeholders in the string.
            @returns The requested language string.
        */
        get (key : string, placeholders? : Array<string>) {
            switch (window.getCurrentBrowser()) {
                case Browser.CHROME:
                    if (placeholders) {
                        return chrome.i18n.getMessage(key, placeholders);
                    } else {
                        return chrome.i18n.getMessage(key);
                    }
                    break;

                case Browser.SAFARI:
                case Browser.FIREFOX:
                    if (placeholders) {
                        var localisationItem = this.localisationData[key];
                        if (localisationItem) {
                            var message = localisationItem.message;
                            for (var placeholder in localisationItem.placeholders) {
                                if (localisationItem.placeholders.hasOwnProperty(placeholder)) {
                                    var placeHolderArgumentIndex = parseInt(localisationItem.placeholders[placeholder].content.substring(1), 10);
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
    }
}
