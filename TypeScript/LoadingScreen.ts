/// <reference path="index.ts" />
/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
module AlienTube {
    /**
        * The representation and management of an AlienTube loading screen.
        * @class LoadingScreen
        * @param commentSection The active CommentSection to retrieve data from.
        * @param insertionPoint The DOM element in which the loading screen should be appended to as a child.
        * @param [initialState] An optional initial state for the loading screen, the default is "Loading"
    */
    "use strict";
    export class LoadingScreen {
        private representedHTMLElement: HTMLDivElement;
        private currentProgressState: LoadingState;
        private loadingAttempts: number;

        constructor(commentSection: CommentSection, initialState?: LoadingState, alternativeText?: string) {
            let loadingState = initialState || LoadingState.LOADING;
            this.representedHTMLElement = Application.getExtensionTemplateItem(commentSection.template, "loading");
            this.updateProgress(loadingState, alternativeText);
        }
    	
        /**
         * Get the HTML element of the loading screen container.
         */
        get HTMLElement() {
            return this.representedHTMLElement;
        }
    	
        /**
         * Update the current progress of the loading screen.
         * @param state The new state of the loading screen.
         * @param [alternativeText] A custom message to put on the loading screen for the user.
         */
        public updateProgress(state: LoadingState, alternativeText?: string) {
            this.currentProgressState = state;
            var loadingText = <HTMLParagraphElement> this.representedHTMLElement.querySelector("#at_loadingtext");
            var loadingHeader = <HTMLParagraphElement> this.representedHTMLElement.querySelector("#at_loadingheader");

            switch (this.currentProgressState) {
                case LoadingState.LOADING:
                    this.loadingAttempts = 1;
                    loadingHeader.textContent = alternativeText || Application.localisationManager.get("loading_generic_message");
                    loadingText.textContent = Application.localisationManager.get("loading_generic_text") || "";
                    break;

                case LoadingState.RETRY:
                    this.loadingAttempts += 1;
                    loadingText.textContent = Application.localisationManager.get("loading_retry_message", [
                        this.loadingAttempts.toString(),
                        "3"
                    ]);
                    break;

                case LoadingState.ERROR:
                case LoadingState.COMPLETE:
                    let parentNode = this.representedHTMLElement.parentNode;
                    if (parentNode) {
                        this.representedHTMLElement.parentNode.removeChild(this.representedHTMLElement);
                    }
                    //delete this;
                    break;
            }
        }
    }

    export enum LoadingState {
        LOADING,
        RETRY,
        ERROR,
        COMPLETE
    }
}
