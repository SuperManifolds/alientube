/// <reference path="../index.ts" />
"use strict";
var AlienTube;
(function (AlienTube) {
    var RedditRequest = (function () {
        function RedditRequest(url, type, callback, postData, loadingScreen) {
            this.loadTimer = 0;
            this.timeoutTimer = 0;
            this.requestUrl = url;
            this.requestType = type;
            this.finalCallback = callback;
            this.postData = postData;
            this.loadingScreen = loadingScreen;
            this.performRequest();
        }
        RedditRequest.prototype.performRequest = function () {
            this.attempts += 1;
            this.loadTimer = setTimeout(function () {
                var loadingText = document.getElementById("at_loadingtext");
                loadingText.textContent = AlienTube.Main.localisationManager.get("loading_slow_message");
            }, 3000);
            this.timeoutTimer = setTimeout(function () {
                new AlienTube.ErrorScreen(AlienTube.Main.commentSection, AlienTube.ErrorState.CONNECTERROR);
            }, 15000);
            new AlienTube.HttpRequest(this.requestUrl, this.requestType, this.onSuccess.bind(this), this.postData, this.onRequestError.bind(this));
        };
        RedditRequest.prototype.onSuccess = function (responseText) {
            var responseObject;
            clearTimeout(this.loadTimer);
            clearTimeout(this.timeoutTimer);
            this.loadingScreen.updateProgress(AlienTube.LoadingState.COMPLETE);
            try {
                responseObject = JSON.parse(responseText);
                this.finalCallback(responseObject);
            }
            catch (e) {
                if (e.toString().indexOf("SyntaxError: Unexpected end of input") !== -1) {
                    new AlienTube.ErrorScreen(AlienTube.Main.commentSection, AlienTube.ErrorState.CONNECTERROR);
                }
                else {
                    new AlienTube.ErrorScreen(AlienTube.Main.commentSection, AlienTube.ErrorState.ERROR, e.toString());
                }
            }
            delete this;
        };
        RedditRequest.prototype.onRequestError = function (xhr) {
            clearTimeout(this.loadTimer);
            clearTimeout(this.timeoutTimer);
            if (this.attempts <= 3 && xhr.status !== 404) {
                this.loadingScreen.updateProgress(AlienTube.LoadingState.RETRY);
                this.performRequest();
            }
            else {
                this.loadingScreen.updateProgress(AlienTube.LoadingState.ERROR);
                switch (xhr.status) {
                    case 404:
                        new AlienTube.ErrorScreen(AlienTube.Main.commentSection, AlienTube.ErrorState.NOT_FOUND);
                        break;
                    case 503:
                    case 504:
                    case 520:
                    case 521:
                        new AlienTube.ErrorScreen(AlienTube.Main.commentSection, AlienTube.ErrorState.OVERLOAD);
                        break;
                    default:
                        new AlienTube.ErrorScreen(AlienTube.Main.commentSection, AlienTube.ErrorState.REDDITERROR, xhr.responseText);
                }
            }
        };
        return RedditRequest;
    })();
    AlienTube.RedditRequest = RedditRequest;
})(AlienTube || (AlienTube = {}));
