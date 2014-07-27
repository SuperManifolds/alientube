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
        commentSection : CommentSection;
        commentList : Array<any>;
        postIsInPreservedMode : Boolean;
        constructor(threadData : any, commentSection : CommentSection) {
            this.commentSection = commentSection;
            this.threadInformation = threadData.data.children[0].data;
            this.commentList = threadData.data.children;

            var previousUserIdentifier = Main.Preferences.get("userIdentifier");
            Main.Preferences.set("userIdentifier", threadData.data.modhash);
            this.postIsInPreservedMode = Main.isPreserved(this.threadInformation.created_utc);

            var threadContainer = this.commentSection.template.getElementById("threadcontainer").content.cloneNode(true);

            /* Set the thread title and link to it */
            var title = threadContainer.querySelector(".title");
            title.appendChild(document.createTextNode(this.threadInformation.title));
            title.setAttribute("href", this.threadInformation.permalink);

            /* Set the username of the author and link to them */
            var username = threadContainer.querySelector(".username");
            username.appendChild(document.createTextNode(this.threadInformation.author));
            username.setAttribute("href", "http://www.reddit.com/u/" + this.threadInformation.author);

            /* Set the the thread posted time */
            var timestamp = threadContainer.querySelector(".timestamp");
            timestamp.appendChild(document.createTextNode(Main.getHumanReadableTimestamp(this.threadInformation.created_utc)));
            timestamp.setAttribute("timestamp", new Date(this.threadInformation.created_utc).toISOString);

            this.set(threadContainer);
        }

        /**
        * Sets the contents of the comment thread.
        * @param contents HTML DOM node or element to use.
        */
        set (contents : Node) {
            var threadContainer = document.getElementById("at_comments");
            while (threadContainer.firstChild) {
                threadContainer.removeChild(threadContainer.firstChild);
            }
            threadContainer.appendChild(contents);
        }
    }
}
