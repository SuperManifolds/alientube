/// <reference path="index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        A class representation and container of a single Reddit comment.
        @class ReadMore
        @param data Object containing the "load more comments" links.
        @param commentThread CommentThread object representing the container of the load more link.
    */
    export class LoadMore {
        representedHTMLElement : HTMLDivElement;
        private data : any;
        private commentThread;
        private referenceParent;

        constructor(data : any, referenceParent : any, commentThread : CommentThread) {
            this.data = data;
            this.commentThread = commentThread;
            this.referenceParent = referenceParent;

            this.representedHTMLElement = commentThread.commentSection.template.getElementById("loadmore").content.cloneNode(true);

            /* Display the amount of replies available to load */
            var replyCount = this.representedHTMLElement.querySelector(".at_replycount");
            var replyCountText = data.count > 1 ?  Main.localisationManager.get("replyPlural") : Main.localisationManager.get("replyToCommentText");
            replyCount.appendChild(document.createTextNode("(" + data.count + " " + replyCountText + ")"));

            /* Set the localisation for the "load more" button, and the event listener. */
            var loadMoreText = this.representedHTMLElement.querySelector(".at_load");
            loadMoreText.appendChild(document.createTextNode(Main.localisationManager.get("loadMoreComments")));
            loadMoreText.addEventListener("click", this.onLoadMoreClick.bind(this), false);
        }

        private onLoadMoreClick(eventObject : Event) {
            /* Display "loading comments" text */
            var loadingText =  <HTMLAnchorElement> eventObject.target;
            loadingText.removeChild(loadingText.firstChild);
            loadingText.classList.add("loading");
            loadingText.appendChild(document.createTextNode(Main.localisationManager.get("loading")));

            var generateRequestUrl = "https://api.reddit.com/r/" + this.commentThread.threadInformation.subreddit +
            "/comments/" + this.commentThread.threadInformation.id + "/z/" + this.data.id + ".json";

            new HttpRequest(generateRequestUrl, RequestType.GET, (responseData) => {

                /* Remove "loading comments" text */
                var getParentNode = loadingText.parentNode.parentNode;
                getParentNode.removeChild(loadingText.parentNode);

                /* Traverse the retrieved comments and append them to the comment section */
                var commentItems = JSON.parse(responseData)[1].data.children[0].data.replies.data.children;
                if (commentItems.length > 0) {
                    commentItems.forEach((commentObject) => {
                        if (commentObject.kind === "more") {
                            var readmore = new LoadMore(commentObject.data, this.referenceParent, this.commentThread);
                            this.referenceParent.children.push(readmore);
                            getParentNode.appendChild(readmore.representedHTMLElement);
                        } else {
                            var comment = new Comment(commentObject.data, this.commentThread);
                            this.referenceParent.children.push(comment);
                            getParentNode.appendChild(comment.representedHTMLElement);
                        }
                    });
                }
            });
        }
    }
}
