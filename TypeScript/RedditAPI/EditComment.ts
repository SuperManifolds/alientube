/// <reference path="../index.ts" />
/**
    * Namespace for requests to the Reddit API operations.
    * @namespace AlienTube.Reddit
*/
"use strict";
module AlienTube.Reddit {
    /**
        Perform a request to Reddit to edit an existing comment.
        @class EditCommentRequest
        @param thing The Reddit ID of the item the user wants edit.
        @param comment A markdown string containing the user's new comment
        @param callback Callback handler for the event when loaded.
    */
    export class EditCommentRequest {
        constructor (thing : string, comment : string, callback? : any) {
            var url = "https://api.reddit.com/api/editusertext";
            new HttpRequest(url, RequestType.POST, callback, {
                "uh": Preferences.getString("redditUserIdentifierHash"),
                "thing_id": thing,
                "text": comment,
                "api_type": "json"
            });
        }
    }
}
