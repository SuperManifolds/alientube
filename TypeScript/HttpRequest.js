/// <reference path="Main.ts" />
/// <reference path="typings/chrome/chrome.d.ts" />
/// <reference path="typings/firefox/firefox.d.ts" />
/// <reference path="typings/safari/safari.d.ts" />
var AlienTube;
(function (AlienTube) {
    var HttpRequest = (function () {
        function HttpRequest(url, type, callback, postData) {
            this.acceptableResponseTypes = [200, 201, 202, 301, 302, 303, 0];
            if (AlienTube.Main.getCurrentBrowser() == 2 /* SAFARI */) {
                // TODO
            } else {
                var xhr = new XMLHttpRequest();
                xhr.open(RequestType[type], url, true);
                xhr.withCredentials = true;
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == XMLHttpRequest.DONE) {
                        if (this.acceptableResponseTypes.indexOf(xhr.status) !== -1) {
                            callback(xhr.responseText);
                        } else {
                            // TODO Error handling
                        }
                    }
                };
                if (type == 1 /* POST */) {
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
        return HttpRequest;
    })();
    AlienTube.HttpRequest = HttpRequest;

    (function (RequestType) {
        RequestType[RequestType["GET"] = 0] = "GET";
        RequestType[RequestType["POST"] = 1] = "POST";
    })(AlienTube.RequestType || (AlienTube.RequestType = {}));
    var RequestType = AlienTube.RequestType;
})(AlienTube || (AlienTube = {}));
