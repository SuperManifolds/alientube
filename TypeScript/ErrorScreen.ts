/// <reference path="index.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
module AlienTube {
    /**
        * The representation and management of an AlienTube loading screen.
        * @class ErrorScreen
        * @param commentSection The active CommentSection to retrieve data from.
        * @param errorState The error state of the error screen, defines what visuals and titles will be displayed.
        * @param [message] Optional message to be displayed if the error state is set to regular "ERROR"
    */
    "use strict";
    export class ErrorScreen {
        private representedHTMLElement: HTMLDivElement;

        constructor(commentSection: CommentSection, errorState: ErrorState, message?: string) {
            this.representedHTMLElement = Application.getExtensionTemplateItem(commentSection.template, "error");

            let errorImage = <HTMLImageElement> this.representedHTMLElement.querySelector("img");
            let errorHeader = <HTMLParagraphElement> this.representedHTMLElement.querySelector("#at_errorheader");
            let errorText = <HTMLParagraphElement> this.representedHTMLElement.querySelector("#at_errortext");

            /* Set the icon, text, and event listener for the button to switch to the Google+ comments. */
            let googlePlusButton = <HTMLButtonElement> this.representedHTMLElement.querySelector("#at_switchtogplus");
            googlePlusButton.addEventListener("click", this.onGooglePlusClick, false);

            let googlePlusContainer = document.getElementById(Application.COMMENT_ELEMENT_ID);
            if (Preferences.getBoolean("showGooglePlusButton") === false ||  googlePlusContainer === null) {
                googlePlusButton.style.display = "none";
            }

            switch (errorState) {
                case ErrorState.NOT_FOUND:
                    /* Reddit.com uses 5 different randomly selected visuals for their 404 graphic, their path consists of a letter from
                    "a" to "e" just like Reddit we are randomly choosing one of these letters and retrieving the image. */
                    let getRandom404Id = String.fromCharCode(97 + Math.floor(Math.random() * 5));
                    errorImage.setAttribute("src", `https://www.redditstatic.com/reddit404${getRandom404Id}.png`);

                    /* Set page not found localisation text */
                    errorHeader.textContent = Application.localisationManager.get("error_header_not_found");
                    errorText.textContent = Application.localisationManager.get("error_message_not_found");
                    break;

                case ErrorState.OVERLOAD:
                    /* Retrieve the Reddit overloaded svg graphic from the ressource directory. */
                    errorImage.setAttribute("src", Application.getExtensionRessourcePath("redditoverload.svg"));

                    /* Set reddit overloaded localisation text */
                    errorHeader.textContent = Application.localisationManager.get("error_header_overloaded");
                    errorText.textContent = Application.localisationManager.get("error_message_overloaded");
                    break;

                case ErrorState.ERROR:
                case ErrorState.REDDITERROR:
                    /* Retrieve the generic "Reddit is broken" svg graphic from the ressource directory */
                    errorImage.setAttribute("src", Application.getExtensionRessourcePath("redditbroken.svg"));

                    /* Set "you broke reddit" localisation text, and a custom message if provided */
                    errorHeader.textContent = Application.localisationManager.get("error_header_generic");
                    if (message) {
                        errorText.textContent = message;
                    }
                    break;

                case ErrorState.CONNECTERROR:
                    /* Retrieve the generic "Reddit is broken" svg graphic from the ressource directory */
                    errorImage.setAttribute("src", Application.getExtensionRessourcePath("redditbroken.svg"));

                    /* Set "connection timed out" localisation text */
                    errorHeader.textContent = Application.localisationManager.get("error_header_timeout");
                    errorText.textContent = Application.localisationManager.get("error_message_timeout");

                    break;

                case ErrorState.BLOCKED:
                    /* Retrieve the reddit blocked svg graphic from the ressource directory */
                    errorImage.setAttribute("src", Application.getExtensionRessourcePath("redditblocked.svg"));

                    /* Set "connection is being interrupted" localisation text */
                    errorHeader.textContent = Application.localisationManager.get("error_header_interrupted");
                    errorText.textContent = Application.localisationManager.get("error_message_interrupted");
                    break;
            }

            /* Provide a retry button which reloads AlienTube completely and tries again. */
            let retryButton = <HTMLButtonElement> this.representedHTMLElement.querySelector(".at_retry");
            retryButton.textContent = Application.localisationManager.get("error_button_retry");
            retryButton.addEventListener("click", this.reload, false);

            commentSection.set(this.representedHTMLElement);
        }
    	
        /**
         * Reload the comment section.
         * @private
         */
        private reload() {
            Application.commentSection = new CommentSection(Application.getCurrentVideoId());
        }
    	
        /**
         * Handle the click of the Google+ Button to change to the Google+ comments.
         * @private
         */
        private onGooglePlusClick(eventObject: Event) {
            var alienTubeContainer = document.getElementById("alientube");
            alienTubeContainer.style.display = "none";
            var googlePlusContainer = document.getElementById(Application.COMMENT_ELEMENT_ID);
            googlePlusContainer.style.visibility = "visible";
            googlePlusContainer.style.height = "auto";
            var redditButton = <HTMLDivElement> document.getElementById("at_switchtoreddit");
            redditButton.style.display = "block";
        }
    }

    export enum ErrorState {
        NOT_FOUND,
        OVERLOAD,
        REDDITERROR,
        CONNECTERROR,
        BLOCKED,
        ERROR
    }
}
