/// <reference path="index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        Perform a request to Reddit to either save or unsave an item.
        @class LoadingScreen
    */
    export class RedditSaveRequest {
        constructor() {
    }

    export enum LoadingState {
        SAVE,
        UNSAVE
    }
}
