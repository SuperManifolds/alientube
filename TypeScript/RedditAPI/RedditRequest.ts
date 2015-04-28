/// <reference path="../index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
"use strict";
module AlienTube {
    /**
        Perform a request to Reddit. Embedded error handling.
        @class RedditRequest
        @param thing The Reddit ID of the item to either save or unsave
        @param type Whether to save or unsave
        @param callback Callback handler for the event when loaded.
    */
    export class RedditRequest {
        private requestUrl : string;
        private requestType : RequestType;
        private finalCallback : any;
        private postData : any;
        private loadingScreen : LoadingScreen;
        private attempts : number;

        private loadTimer = 0;
        private timeoutTimer = 0;

        constructor (url : string, type : RequestType, callback : any, postData? : any, loadingScreen? : LoadingScreen) {
            this.requestUrl = url;
            this.requestType = type;
            this.finalCallback = callback;
            this.postData = postData;
            this.loadingScreen = loadingScreen;
            this.performRequest();
        }

        private performRequest () {
            this.attempts += 1;

            /* Kick of a 3 second timer that will confirm to the user that the loading process is taking unusually long, unless cancelled
            by a successful load (or an error) */
            this.loadTimer = setTimeout(() => {
                var loadingText = document.getElementById("at_loadingtext");
                loadingText.textContent = Main.localisationManager.get("loading_slow_message");
            }, 3000);

            /* Kick of a 10 second timer that will cancel the connection attempt and display an error to the user letting them know
            something is probably blocking the connection. */
            this.timeoutTimer = setTimeout(() => {
                new ErrorScreen(Main.commentSection, ErrorState.CONNECTERROR);
            }, 15000);

            /* Perform the reddit api request */
            new HttpRequest(this.requestUrl, this.requestType, this.onSuccess.bind(this), this.postData, this.onRequestError.bind(this));
        }

        private onSuccess (responseText) {
            var responseObject;

            /* Cancel the slow load timer */
            clearTimeout(this.loadTimer);
            clearTimeout(this.timeoutTimer);

            /* Dismiss the loading screen, perform the callback and clear ourselves out of memory. */
            this.loadingScreen.updateProgress(LoadingState.COMPLETE);
            try {
                responseObject = JSON.parse(responseText);
                this.finalCallback(responseObject);
            } catch (e) {
                if (e.toString().indexOf("SyntaxError: Unexpected end of input") !== -1) {
                    new ErrorScreen(Main.commentSection, ErrorState.CONNECTERROR);
                } else {
                    new ErrorScreen(Main.commentSection, ErrorState.ERROR, e.toString());
                }
            }
        }

        private onRequestError (xhr) {
            /* Cancel the slow load timer */
            clearTimeout(this.loadTimer);
            clearTimeout(this.timeoutTimer);

            if (this.attempts <= 3 && xhr.status !== 404) {
                /* Up to 3 attempts, retry the loading process automatically. */
                this.loadingScreen.updateProgress(LoadingState.RETRY);
                this.performRequest();
            } else {
                /* We have tried too many times without success, give up and display an error to the user. */
                this.loadingScreen.updateProgress(LoadingState.ERROR);
                switch (xhr.status) {
                    case 404:
                        new ErrorScreen(Main.commentSection, ErrorState.NOT_FOUND);
                        break;

                    case 503:
                    case 504:
                    case 520:
                    case 521:
                        new ErrorScreen(Main.commentSection, ErrorState.OVERLOAD);
                        break;

                    default:
                        new ErrorScreen(Main.commentSection, ErrorState.REDDITERROR, xhr.responseText);
                }
            }
        }
    }
}
