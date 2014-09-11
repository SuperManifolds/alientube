/// <reference path="index.ts" />
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

        constructor() {
        }

        /**
            Retrieve a localised string by key
            @param key The key in the localisation file representing a language string.
            @param [placeholders] An array of values for the placeholders in the string.
            @returns The requested language string.
        */
        get (key : string, placeholders? : Array<string>) {
            switch (Main.getCurrentBrowser()) {
                case Browser.CHROME:
                    if (placeholders) {
                        return chrome.i18n.getMessage(key, placeholders);
                    } else {
                        return chrome.i18n.getMessage(key);
                    }
                    break;
            }
            return "";
        }

    }
}
