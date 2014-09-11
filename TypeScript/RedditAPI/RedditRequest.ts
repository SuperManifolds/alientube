/// <reference path="../index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
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

        constructor(url : string, type : RequestType, callback : any, postData? : any, loadingScreen? : LoadingScreen) {
            this.requestUrl = url;
            this.requestType = type;
            this.finalCallback = callback;
            this.postData = postData;
            this.loadingScreen = loadingScreen;
            this.performRequest();
        }

        private performRequest () {
            this.attempts++;
            this.loadTimer = setTimeout(() => {
                var loadingText = document.getElementById("at_loadingtext");
                loadingText.innerText = Main.localisationManager.get("slowLoadingText");
            }, 3000);

            new HttpRequest(this.requestUrl, this.requestType, this.onSuccess.bind(this), this.postData, this.onRequestError.bind(this));
        }

        private onSuccess (responseText) {
            clearTimeout(this.loadTimer);

            this.loadingScreen.updateProgress(LoadingState.COMPLETE);
            this.finalCallback(responseText);
            delete this;
        }

        private onRequestError (xhr) {
            clearTimeout(this.loadTimer);

            if (this.attempts <= 3) {
                this.loadingScreen.updateProgress(LoadingState.RETRY);

                this.performRequest();
            } else {
                this.loadingScreen.updateProgress(LoadingState.ERROR);

                switch (xhr.status) {
                    case 404:
                        new ErrorScreen(Main.commentSection, ErrorState.NOT_FOUND);
                        break;

                    case 503:
                    case 504:
                        new ErrorScreen(Main.commentSection, ErrorState.OVERLOAD);
                        break;

                    default:
                        new ErrorScreen(Main.commentSection, ErrorState.ERROR, xhr.responseText);
                }
            }
        }
    }
}
