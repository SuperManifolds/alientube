/// <reference path="../index.ts" />
/**
    * Namespace for requests to the Reddit API operations.
    * @namespace AlienTube.Reddit
*/
module AlienTube.Reddit {
    /**
        Perform a request to Reddit to either save or unsave an item.
        @class RedditVoteRequest
        @param thing The Reddit ID of the item the user wants to vote on
        @param type Whether the user wants to upvote, downvote, or remove their vote.
        @param callback Callback handler for the event when loaded.
    */
    "use strict";
    export class VoteRequest {
        constructor(thing: string, type: Vote, callback?: any) {
            let url = "https://api.reddit.com/api/vote";
            new HttpRequest(url, RequestType.POST, callback, {
                "uh": Preferences.getString("redditUserIdentifierHash"),
                "id": thing,
                "dir": type
            });
        }
    }

    export enum Vote {
        UPVOTE = 1,
        DOWNVOTE = -1,
        REMOVE = 0
    }
}
