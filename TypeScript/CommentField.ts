/// <reference path="index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        The representation and management of an AlienTube loading screen.
        @class CommentField
        @param commentSection The active CommentSection to retrieve data from.
        @param insertionPoint The DOM element in which the loading screen should be appended to as a child.
        @param [initialState] An optional initial state for the loading screen, the default is "Loading"
    */
    export class CommentField {
        private representedHTMLElement : HTMLDivElement;
        private parentHTMLElement : HTMLDivElement;
        private commentThread: CommentThread;
        private parentClass : any;
        private previewElement : HTMLDivElement;

        constructor(parent : any, initialText? : string) {
            if (parent instanceof CommentThread) {
                this.parentClass = <CommentThread> parent;
                this.commentThread = this.parentClass;
                this.parentHTMLElement = this.parentClass.threadContainer.querySelector(".options");

            } else if (parent instanceof Comment) {
                this.parentClass = <Comment> parent;
                this.commentThread = this.parentClass.commentThread;
                this.parentHTMLElement = this.parentClass.representedHTMLElement.querySelector(".options");
            } else {
                new TypeError("parent needs to be type CommentThread or Type Comment");
            }
            var template = this.commentThread.commentSection.template.getElementById("commentfield").content.cloneNode(true);
            this.representedHTMLElement = template.querySelector(".at_commentfield");

            var authorName = <HTMLSpanElement> this.representedHTMLElement.querySelector(".at_writingauthor");
            authorName.innerText = Main.localisationManager.get("commentfield_label_author", [Main.Preferences.get("username")]);

            var submitButton = <HTMLButtonElement> this.representedHTMLElement.querySelector(".at_submit");
            submitButton.innerText = Main.localisationManager.get("commentfield_button_submit");
            submitButton.addEventListener("click", this.onSubmitButtonClick.bind(this), false);

            var cancelButton = <HTMLButtonElement> this.representedHTMLElement.querySelector(".at_cancel");
            cancelButton.innerText = Main.localisationManager.get("commentfield_button_cancel")
            submitButton.addEventListener("click", this.onSubmitButtonClick.bind(this), false);

            var previewHeader = <HTMLSpanElement> this.representedHTMLElement.querySelector(".at_preview_header");
            previewHeader.innerText = Main.localisationManager.get("commentfield_label_preview");
            cancelButton.addEventListener("click", this.onCancelButtonClick.bind(this), false);

            var inputField = <HTMLInputElement> this.representedHTMLElement.querySelector(".at_textarea");
            if (initialText) {
                inputField.value = initialText;
            }
            inputField.addEventListener("input", this.onInputFieldChange.bind(this), false);

            this.previewElement = <HTMLDivElement> this.representedHTMLElement.querySelector(".at_comment_preview");

            this.parentHTMLElement.appendChild(this.representedHTMLElement);
        }

        get HTMLElement () {
            return this.representedHTMLElement;
        }

        onSubmitButtonClick () {
            var inputField = <HTMLInputElement> this.representedHTMLElement.querySelector(".at_textarea");
            var thing_id = (this.parentClass instanceof CommentThread) ? this.parentClass.threadInformation.name : this.parentClass.commentObject.name;
            new RedditCommentRequest(thing_id, inputField.value, (responseText) => {
                var responseObject = JSON.parse(responseText);
                var comment = new Comment(responseObject.json.data.things[0].data, this.commentThread);
                this.parentClass.children.push(comment);
                if (this.parentClass instanceof CommentThread) {
                    this.parentClass.threadContainer.appendChild(comment.representedHTMLElement);
                    new CommentField(this.parentClass);
                } else {
                    var replyContainer = this.representedHTMLElement.querySelector(".at_replies");
                    replyContainer.appendChild(comment.representedHTMLElement);
                }
                comment.representedHTMLElement.scrollIntoView(true);
                this.representedHTMLElement.parentNode.removeChild(this.representedHTMLElement);
                delete this;
            });
        }

        onCancelButtonClick () {
            this.representedHTMLElement.parentNode.removeChild(this.representedHTMLElement);
            delete this;
        }

        onInputFieldChange(eventObject : Event) {
            var inputField = <HTMLInputElement> eventObject.target;
            if (inputField.value.length > 0) {
                this.previewElement.style.display = "block";
                var previewContents = <HTMLDivElement> this.previewElement.querySelector(".at_preview_contents");
                previewContents.innerHTML = SnuOwnd.getParser().render(inputField.value);
            } else {
                this.previewElement.style.display = "none";
            }
        }
    }
}
