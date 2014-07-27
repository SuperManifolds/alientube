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

        get (key : string) {
            return this.localisationIndex[window.navigator.language][key] || this.localisationIndex["en"][key];
        }
    }
}
