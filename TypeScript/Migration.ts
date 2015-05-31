/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
"use strict";
module AlienTube {
    /**
        * Version migration of preferences and other necessary conversions.
        * @class Migration
        * @param lastVersion The version of AlienTube the last time the extension was run.
    */
    export class Migration {
        constructor(lastVersion : string) {
            /* If lastVersion is not set, we will assume the version is 2.2. */
            lastVersion = lastVersion || "2.2";
            
            /* Get an array of the different version migrations available. */
            var versions = Object.keys(this.migrations);
            
            /* If our previous version is not in the list, insert it so we will know our place in the version history. */
            versions.push(lastVersion);
            
            /* Run an alphanumerical string sort on the array, this will serve to organise the versions from old to new. */
            versions.sort();
            
            /* Get the index of the previous version, and remove it and all migrations before it, leaving migrations for newer versions behind */
            var positionOfPreviousVersion = versions.indexOf(lastVersion) + 1;
            versions.splice(0, positionOfPreviousVersion);
            
            console.log(versions);
            
            /* Call the migrations to newer versions in sucession. */
            versions.forEach((version) => {
                this.migrations[version].call(this, null);
            });
            
            /* Update the last run version paramater with the current version so we'll know not to run this migration again. */
            //Preferences.set("lastRunVersion", Application.version());
		}
        
        private migrations = {
            "2.3": function () {
                /* Migrate the previous "Display Google+ by default" setting into the "Default display action" setting. */
                var displayGplusPreviousSetting = Preferences.getBoolean("displayGooglePlusByDefault");
                if (displayGplusPreviousSetting === true) {
                    Preferences.set("defaultDisplayAction", "gplus");
                }
            }
        };
	}
}
