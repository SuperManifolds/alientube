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

        constructor(data : any, commentThread : CommentThread) {
            this.representedHTMLElement = commentThread.commentSection.template.getElementById("loadmore").content.cloneNode(true);

            var replyCount = this.representedHTMLElement.querySelector(".at_replycount");
            var replyCountText = data.count > 1 ?  Main.localisationManager.get("replyPlural") : Main.localisationManager.get("replyToCommentText");
            replyCount.appendChild(document.createTextNode("(" + data.count + " " + replyCountText + ")"));

            var loadMoreText = this.representedHTMLElement.querySelector(".at_load");
            loadMoreText.appendChild(document.createTextNode(Main.localisationManager.get("loadMoreComments")));
            loadMoreText.addEventListener("click", this.onLoadMoreClick, false);
        }

        private onLoadMoreClick(eventObject : Event) {
            var loadingText =  <HTMLAnchorElement> eventObject.target;
            loadingText.removeChild(loadingText.firstChild);
            loadingText.classList.add("loading");
            loadingText.appendChild(document.createTextNode(Main.localisationManager.get("loading")));
        }
    }
}
