/// <reference path="index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        Starts a new instance of the Localisation Manager, for handling language.
        @class LocalisationManager
        @param localisationIndex An object containing a list of language localisation statements.
    */
    export class LocalisationManager {
        private localisationIndex : any;

        constructor(localisationIndex : any) {
            this.localisationIndex = localisationIndex;
        }

        /**
            Retrieve a localised string by key
            @param key The key in the localisation file representing a language string.
            @returns The requested language string.
        */
        get (key : string) {
            if (this.localisationIndex[window.navigator.language]) {
                return this.localisationIndex[window.navigator.language][key] || this.localisationIndex["en"][key];
            } else {
                return this.localisationIndex["en"][key];
            }
        }
    }
}
