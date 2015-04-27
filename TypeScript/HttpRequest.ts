/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
"use strict";
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
            var uuid, listener, xhr, query, key, postData;

            if (window.getCurrentBrowser() === Browser.SAFARI) {
                uuid = HttpRequest.generateUUID();
                listener = safari.self.addEventListener('message', function listenerFunction (event) {
                    if (event.message.uuid !== uuid) return;

                    xhr = JSON.parse(event.message.data);
                    if (HttpRequest.acceptableResponseTypes.indexOf(xhr.status) !== -1) {
                        if (callback) {
                            callback(xhr.responseText);
                        }
                    } else {
                        if (errorHandler) errorHandler(xhr);
                    }
                    safari.self.removeEventListener('message', listenerFunction, false);
                }, false);

                query = [];
                if (type === RequestType.POST) {
                    query = [];
                    for (key in postData) {
                        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(postData[key]));
                    }
                }

                safari.self.tab.dispatchMessage(RequestType[type], {
                    'url': url,
                    'uuid': uuid,
                    'data': query.join('&')
                });
            } else {
                xhr = new XMLHttpRequest();
                xhr.open(RequestType[type], url, true);
                xhr.withCredentials = true;
                if (type === RequestType.POST) {
                    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
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
                if (type === RequestType.POST) {
                    query = [];
                    for (key in postData) {
                        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(postData[key]));
                    }
                    xhr.send(query.join('&'));
                } else {
                    xhr.send();
                }
            }
        }



        /**
        * Generate a UUID 4 sequence.
        * @returns A UUID 4 sequence as string.
        */
        private static generateUUID () : string {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }


    export enum RequestType {
        GET,
        POST
    }
}
