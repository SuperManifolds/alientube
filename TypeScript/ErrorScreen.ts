/// <reference path="index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        The representation and management of an AlienTube loading screen.
        @class LoadingScreen
        @param commentSection The active CommentSection to retrieve data from.
        @param insertionPoint The DOM element in which the loading screen should be appended to as a child.
        @param [initialState] An optional initial state for the loading screen, the default is "Loading"
    */
    export class ErrorScreen {
        private representedHTMLElement : HTMLDivElement;

        constructor(commentSection : CommentSection, errorState : ErrorState, message? : string) {
            this.representedHTMLElement = commentSection.template.getElementById("error").content.cloneNode(true);

            var errorImage = <HTMLImageElement> this.representedHTMLElement.querySelector("img");
            var errorHeader = <HTMLParagraphElement> this.representedHTMLElement.querySelector("#at_errorheader");
            var errorText = <HTMLParagraphElement> this.representedHTMLElement.querySelector("#at_errortext");

            switch (errorState) {
                case ErrorState.NOT_FOUND:
                    var getRandom404Id = String.fromCharCode(97 + Math.floor(Math.random() * 5));
                    errorImage.setAttribute("src", "http://www.redditstatic.com/reddit404" + getRandom404Id + ".png");

                    errorHeader.innerText = Main.localisationManager.get("404header");
                    errorText.innerText = Main.localisationManager.get("404text");
                    break;

                case ErrorState.OVERLOAD:
                    errorImage.setAttribute("src", Main.getExtensionRessourcePath("redditoverload.svg"));

                    errorHeader.innerText = Main.localisationManager.get("overloadHeader");
                    errorText.innerText = Main.localisationManager.get("overloadText");
                    break;

                case ErrorState.ERROR:
                    errorImage.setAttribute("src", Main.getExtensionRessourcePath("redditbroken.svg"));

                    errorHeader.innerText = Main.localisationManager.get("errorHeader");
                    if (message) {
                        errorText.innerText = message;
                    }
                    break;
            }

            commentSection.set(this.representedHTMLElement);
        }

        private reload () {

        }
    }

    export enum ErrorState {
        NOT_FOUND,
        OVERLOAD,
        ERROR
    }
}
