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
            
            /* Call the migrations to newer versions in sucession. */
            versions.forEach((version) => {
                this.migrations[version].call(this, null);
            });
		}
        
        private migrations = {
            "2.3": function () {
                /* Migrate the previous "Display Google+ by default" setting into the "Default display action" setting. */
                var displayGplusPreviousSetting = Preferences.getBoolean("displayGooglePlusByDefault");
                if (displayGplusPreviousSetting === true) {
                    Preferences.set("defaultDisplayAction", "gplus");
                }
            },
            
            "2.5": function () {
                /* In 2.5 AlienTube now uses the youtube channel ID not the display name for setting AlienTube or Google+ as default per channel.
                We will attempt to migrate existing entries using the YouTube API  */
                var previousDisplayActions = Preferences.getObject("channelDisplayActions");
                if (previousDisplayActions) {
                    var migratedDisplayActions = {};
                    var channelNameMigrationTasks = [];
                    
                    /* Iterate over the collection of previous display actions. We have to perform an asynchronous web request to the YouTube API 
                    for each channel, we will make each request a Promise so we can be informed when they have all been completed,
                    and work with the final result. */
                    Object.keys(previousDisplayActions).forEach((channelName) => {
                        if (previousDisplayActions.hasOwnProperty(channelName)) {
                            var promise = new Promise((fulfill, reject) => { 
                                var encodedChannelName = encodeURIComponent(channelName);
                                var reqUrl = `https://www.googleapis.com/youtube/v3/search?part=id&q=${encodedChannelName}&type=channel&key=${APIKeys.youtubeAPIKey}`;
                                new HttpRequest(reqUrl, RequestType.GET, (data) => {
                                    var results = JSON.parse(data);
                                    if (results.items.length > 0) {
                                        /* We found a match for the display name. We will migrate the old value to the new channel id. */
                                        migratedDisplayActions[results.items[0].id.channelId] = previousDisplayActions[channelName];
                                    }
                                    fulfill();
                                }, null, (error) => {
                                    /* The request could not be completed, we will fail the migration and try again next time. */
                                    reject(error);
                                });
                            });
                            channelNameMigrationTasks.push(promise);
                        }
                    });
                    
                    Promise.all(channelNameMigrationTasks).then(() => {
                        /* All requests were successful, we will save the resul and move on. */
                        Preferences.set("channelDisplayActions", migratedDisplayActions);
                    }, () => {
                        /* One of the requests has failed, the transition will be discarded. We will set our last run version to the previous 
                        version so AlienTube will attempt the migration again next time. */
                        Preferences.set("lastRunVersion", "2.4");
                    });
                }
            }
        };
	}
}
