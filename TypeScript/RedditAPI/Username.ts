/// <reference path="../index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        Perform a request to Reddit asking for the user's username so we can save and display it.
        @class RedditUsernameRequest
    */
    export class RedditUsernameRequest {
        constructor () {
            var url = "https://api.reddit.com/api/me.json";
            new HttpRequest(url, RequestType.GET, (responseText) => {
                var responseData = JSON.parse(responseText);
                Main.Preferences.set("username", responseData.data.name);

                /* If possible we should set the username retroactively so the user doesn't need to reload the page */
                var usernameField = document.querySelector(".at_writingauthor");
                if (usernameField) {
                    usernameField.textContent = Main.localisationManager.get("commentfield_label_author", [Main.Preferences.getString("username")]);
                }
            });
        }
    }
}
