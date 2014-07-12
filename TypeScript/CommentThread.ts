/// <reference path="index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        Creates a new instance of a Comment Thread and adds it to DOM.
        @class CommentThread
        @param threadData JavaScript object containing all information about the Reddit thread.
    */
    export class CommentThread {
        threadInformation : any;
        commentList : Array<any>;
        postIsInPreservedMode : Boolean;
        constructor(threadData : any) {
            this.threadInformation = threadData.data.children[0].data;
            this.commentList = threadData.data.children;
            var previousUserIdentifier = Main.Preferences.get("userIdentifier");
            Main.Preferences.set("userIdentifier", threadData.data.modhash);
            this.postIsInPreservedMode = Main.isPreserved(this.threadInformation.created_utc);
        }
    }
}
