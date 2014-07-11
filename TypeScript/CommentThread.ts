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
        constructor(threadData : any) {
            var threadInformation = threadData[0].data.children[0].data;
            var commentData = threadData[1].data.children;
            var previousUserIdentifier = Main.Preferences.get("userIdentifier");
            Main.Preferences.set("userIdentifier", threadData[0].data.modhash);

        }
    }
}
