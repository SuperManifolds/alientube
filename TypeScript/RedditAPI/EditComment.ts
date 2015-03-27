/// <reference path="../index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        Perform a request to Reddit to either save or unsave an item.
        @class RedditCommentRequest
        @param comment A markdown string containing the user's comment
        @param callback Callback handler for the event when loaded.
    */
    export class RedditEditCommentRequest {
        constructor (thing : string, comment : string, callback? : any) {
            var url = "https://api.reddit.com/api/editusertext";
            new HttpRequest(url, RequestType.POST, callback, {
                "uh": Main.Preferences.getString("redditUserIdentifierHash"),
                "thing_id": thing,
                "text": comment,
                "api_type": "json"
            });
        }
    }
}
