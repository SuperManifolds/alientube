/// <reference path="../index.ts" />
/**
    Namespace for requests to the Reddit API operations.
    @namespace AlienTube.Reddit
*/
"use strict";
module AlienTube.Reddit {
    /**
        Perform a request to Reddit to submit a comment.
        @class CommentRequest
        @param thing The Reddit ID of the item the user wants to comment on.
        @param comment A markdown string containing the user's comment
        @param callback Callback handler for the event when loaded.
    */
    export class CommentRequest {
        constructor (thing : string, comment : string, callback? : any) {
            var url = "https://api.reddit.com/api/comment";
            new HttpRequest(url, RequestType.POST, callback, {
                "uh": Main.Preferences.getString("redditUserIdentifierHash"),
                "thing_id": thing,
                "text": comment,
                "api_type": "json"
            });
        }
    }
}
