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

            var replyCount = this.representedHTMLElement.querySelector(".at_replycount");
            var replyCountText = data.count > 1 ?  Main.localisationManager.get("replyPlural") : Main.localisationManager.get("replyToCommentText");
            replyCount.appendChild(document.createTextNode("(" + data.count + " " + replyCountText + ")"));

            var loadMoreText = this.representedHTMLElement.querySelector(".at_load");
            loadMoreText.appendChild(document.createTextNode(Main.localisationManager.get("loadMoreComments")));
            loadMoreText.addEventListener("click", this.onLoadMoreClick.bind(this), false);
        }

        private onLoadMoreClick(eventObject : Event) {
            var loadingText =  <HTMLAnchorElement> eventObject.target;
            loadingText.removeChild(loadingText.firstChild);
            loadingText.classList.add("loading");
            loadingText.appendChild(document.createTextNode(Main.localisationManager.get("loading")));

            var childrenSeperatedByComma = this.data.children.join(",");
            var loadMoreInstance = this;

            new HttpRequest("https://api.reddit.com/api/morechildren", RequestType.POST, (responseData) => {
                var getParentNode = loadingText.parentNode.parentNode;
                getParentNode.removeChild(loadingText.parentNode);

                var commentItems = JSON.parse(responseData).json.data.things;
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
            }, {
                "children": childrenSeperatedByComma,
                "link_id": this.commentThread.threadInformation.name,
                "api_type": "json"
            });
        }
    }
}
