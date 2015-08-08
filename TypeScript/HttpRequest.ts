/**
    * Namespace for All AlienTube operations.
    * @namespace AlienTube
*/
"use strict";
module AlienTube {
    /**
        * HttpRequest interface across Browsers.
        * @class HttpRequest
        * @param url URL to make the request to.
        * @param type Type of request to make (GET or POST)
        * @param callback Callback handler for the event when loaded.
        * @param [postdata] Key-Value object containing POST data.
    */
    export class HttpRequest {
        private static acceptableResponseTypes = [200, 201, 202, 301, 302, 303, 0];

        constructor(url: string, type: RequestType, callback: any, postData?: any, errorHandler?: any) {
            var uuid, listener, xhr, query, key, postData;

            if (window.getCurrentBrowser() === Browser.SAFARI && safari.self.addEventListener) {
                /* Generate a unique identifier to identify our request and response through Safari's message system. */
                uuid = HttpRequest.generateUUID();
                
                /* Message the global page to have it perform a web request for us. */
                listener = safari.self.addEventListener('message', function listenerFunction(event) {
                    if (event.message.uuid !== uuid) return;
                    
                    if (event.message.data && callback) {
                        callback(event.message.data);
                    } else if (event.message.error && errorHandler) {
                        errorHandler(event.message.error);
                    }
                    safari.self.removeEventListener('message', listenerFunction, false);
                }, false);
    	       
                safari.self.tab.dispatchMessage("XHR", {
                    'url': url,
                    'uuid': uuid,
                    'requestType': type,
                    'postData': postData
                });
                
            } else {
                xhr = new XMLHttpRequest();
                xhr.open(RequestType[type], url, true);
                xhr.withCredentials = true;
                if (type === RequestType.POST) {
                    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                }

                xhr.onerror = (e) => {
                    if (errorHandler) errorHandler(e.target.status);
                }
                xhr.onload = () => {
                    if (HttpRequest.acceptableResponseTypes.indexOf(xhr.status) !== -1) {
                        /* This is an acceptable response, we can now call the callback and end successfuly. */
                        if (callback) {
                            callback(xhr.responseText);
                        }
                    } else {
                        /* There was an error */
                        if (errorHandler) errorHandler(xhr.status);
                    }
                }
                
                /* Convert the post data array to a query string. */
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
        * @private
        */
        private static generateUUID(): string {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
