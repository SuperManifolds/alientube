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
        private acceptableResponseTypes = [200, 201, 202, 301, 302, 303, 0];

        constructor(url : string, type : RequestType, callback : any, postData? : Array<string>) {
            if (Main.getCurrentBrowser() == Browser.SAFARI) {
                // TODO
            } else {
                var xhr = new XMLHttpRequest();
                xhr.open(RequestType[type], url, true);
                xhr.withCredentials = true;
                xhr.onreadystatechange = () => {
                    if (xhr.readyState == XMLHttpRequest.DONE) {
                        if (this.acceptableResponseTypes.indexOf(xhr.status) !== -1) {
                            callback(xhr.responseText);
                        } else {
                            // TODO Error handling
                        }
                    }
                }
                if (type == RequestType.POST) {
                    var query = [];
                    for (var key in postData) {
                        query.push(encodeURIComponent(key) + '=' + encodeURIComponent(postData[key]));
                    }
                    xhr.send("?" + query.join('&'));
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
