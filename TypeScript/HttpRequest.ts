/// <reference path="index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        HttpRequest interface across Browsers.
        @class HttpRequest
        @param url URL to make the request to.
        @param type Type of request to make (GET or POST)
        @param callback Callback handler for the event when loaded.
        @param [postdata] Key-Value object containing POST data.
    */
    export class HttpRequest {
        private static acceptableResponseTypes = [200, 201, 202, 301, 302, 303, 0];

        constructor (url : string, type : RequestType, callback : any, postData? : any, errorHandler? : any) {
            if (window.getCurrentBrowser() == Browser.SAFARI) {
                // TODO
            } else {
                var xhr = new XMLHttpRequest();
                xhr.open(RequestType[type], url, true);
                xhr.withCredentials = true;
                if (type === RequestType.POST) {
                    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                }
                if (url.indexOf("api.reddit.com") !== -1) {
                    xhr.setRequestHeader("AlienTube", Main.localisationManager.get("api_header_message"));
                }
                xhr.onload = () => {
                    if (HttpRequest.acceptableResponseTypes.indexOf(xhr.status) !== -1) {
                        if (callback) {
                            callback(xhr.responseText);
                        }
                    } else {
                        if (errorHandler) errorHandler(xhr);
                    }
                }
                if (type == RequestType.POST) {
                    var query = [];
                    for (var key in postData) {
                        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(postData[key]));
                    }
                    xhr.send(query.join('&'));
                } else {
                    xhr.send();
                }
            }
        }
    }


    export enum RequestType {
        GET,
        POST
    }
}
