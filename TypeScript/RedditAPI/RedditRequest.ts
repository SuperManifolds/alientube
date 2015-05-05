/// <reference path="../index.ts" />
/**
    * Namespace for requests to the Reddit API operations.
    * @namespace AlienTube.Reddit
*/
"use strict";
module AlienTube.Reddit {
    /**
        Perform a request to Reddit with embedded error handling.
        * @class Request
        * @param url The Reddit URL to make the request to.
        * @param type The type of request (POST or GET).
        * @param callback A callback handler for when the request is completed.
        * @param [postData] Eventual HTTP POST data to send with the request.
        * @param [loadingScreen] A LoadingScreen object to use for updating the progress of the request.
    */
    export class Request {
        private requestUrl : string;
        private requestType : RequestType;
        private finalCallback : any;
        private postData : any;
        private loadingScreen : LoadingScreen;
        private attempts : number;

        private loadTimer = 0;
        private timeoutTimer = 0;

        constructor (url : string, type : RequestType, callback : any, postData? : any, loadingScreen? : LoadingScreen) {
            /* Move the request parameters so they are accessible from anywhere within the class. */
            this.requestUrl = url;
            this.requestType = type;
            this.finalCallback = callback;
            this.postData = postData;
            this.loadingScreen = loadingScreen;
            
            /* Perform the request. */
            this.performRequest();
        }
        
        /**
         * Attempt to perform the request to the Reddit API.
         */
        private performRequest () {
            this.attempts += 1;

            /* Kick of a 3 second timer that will confirm to the user that the loading process is taking unusually long, unless cancelled
            by a successful load (or an error) */
            this.loadTimer = setTimeout(() => {
                var loadingText = document.getElementById("at_loadingtext");
                loadingText.textContent = Main.localisationManager.get("loading_slow_message");
            }, 3000);

            /* Kick of a 15 second timer that will cancel the connection attempt and display an error to the user letting them know
            something is probably blocking the connection. */
            this.timeoutTimer = setTimeout(() => {
                new ErrorScreen(Main.commentSection, ErrorState.CONNECTERROR);
            }, 15000);

            /* Perform the reddit api request */
            new HttpRequest(this.requestUrl, this.requestType, this.onSuccess.bind(this), this.postData, this.onRequestError.bind(this));
        }
    	
        /**
         * Called when a successful request has been made.
         * @param responseText the response from the Reddit API.
         */
        private onSuccess (responseText) {
            var responseObject;

            /* Cancel the slow load timer */
            clearTimeout(this.loadTimer);
            
            /* Cancel the unsuccessful load timer */
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
    	
        /**
         * Called when a request was unsuccessful.
         * @param xhr the javascript XHR object of the request.
         */
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
