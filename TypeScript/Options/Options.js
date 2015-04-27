/// <reference path="../LocalisationManager.ts" />
/// <reference path="../BrowserPreferenceManager.ts" />
"use strict";
var AlienTube;
(function (AlienTube) {
    var Options = (function () {
        function Options() {
            var _this = this;
            this.preferenceKeyList = [
                "hiddenPostScoreThreshold",
                "hiddenCommentScoreThreshold",
                "showGooglePlusWhenNoPosts",
                "rememberTabsOnViewChange",
                "displayGooglePlusByDefault",
                "showGooglePlusButton"
            ];
            this.localisationManager = new AlienTube.LocalisationManager(function () {
                var i, len, label;
                _this.hiddenPostScoreThresholdElement = document.getElementById("hiddenPostScoreThreshold");
                _this.hiddenCommentScoreThresholdElement = document.getElementById("hiddenCommentScoreThreshold");
                _this.showGooglePlusWhenNoPostsElement = document.getElementById("showGooglePlusWhenNoPosts");
                _this.rememberTabsOnViewChangeElement = document.getElementById("rememberTabsOnViewChange");
                _this.displayGooglePlusByDefaultElement = document.getElementById("displayGooglePlusByDefault");
                _this.showGooglePlusButtonElement = document.getElementById("showGooglePlusButton");
                _this.saveOptionsButton = document.getElementById("saveButton");
                _this.displayAboutDialogButton = document.getElementById("aboutButton");
                _this.closeAboutDialogButton = document.getElementById("closeButton");
                _this.saveOptionsButton.textContent = _this.localisationManager.get("options_button_save");
                _this.displayAboutDialogButton.textContent = _this.localisationManager.get("options_button_about");
                _this.closeAboutDialogButton.textContent = _this.localisationManager.get("options_button_close");
                document.title = _this.localisationManager.get("options_button_title");
                document.getElementById("versiontext").textContent = _this.localisationManager.get("options_label_version");
                _this.preferences = new AlienTube.BrowserPreferenceManager(function (preferences) {
                    for (i = 0, len = _this.preferenceKeyList.length; i < len; i += 1) {
                        label = document.querySelector("label[for='" + _this.preferenceKeyList[i] + "']");
                        label.textContent = _this.localisationManager.get("options_label_" + _this.preferenceKeyList[i]);
                    }
                    _this.hiddenPostScoreThresholdElement.value = preferences.getNumber("hiddenPostScoreThreshold");
                    _this.hiddenCommentScoreThresholdElement.value = preferences.getNumber("hiddenCommentScoreThreshold");
                    _this.showGooglePlusWhenNoPostsElement.checked = preferences.getBoolean("showGooglePlusWhenNoPosts");
                    _this.rememberTabsOnViewChangeElement.checked = preferences.getBoolean("rememberTabsOnViewChange");
                    _this.displayGooglePlusByDefaultElement.checked = preferences.getBoolean("displayGooglePlusByDefault");
                    _this.showGooglePlusButtonElement.checked = preferences.getBoolean("showGooglePlusButton");
                    _this.saveOptionsButton.addEventListener("click", _this.saveOptions.bind(_this), false);
                    _this.displayAboutDialogButton.addEventListener("click", _this.displayAboutDialog.bind(_this), false);
                    _this.closeAboutDialogButton.addEventListener("click", _this.closeAboutDialog.bind(_this), false);
                    document.getElementById("cover").addEventListener("click", _this.closeAboutDialog.bind(_this), false);
                    document.getElementById('version').textContent = Options.getExtensionVersionNumber();
                });
            });
        }
        Options.prototype.saveOptions = function () {
            if (!this.hiddenPostScoreThresholdElement.value.match(/[0-9]+/)) {
                this.hiddenPostScoreThresholdElement.value = -4;
            }
            if (!this.hiddenCommentScoreThresholdElement.value.match(/[0-9]+/)) {
                this.hiddenCommentScoreThresholdElement.value = -4;
            }
            this.preferences.set('hiddenPostScoreThreshold', this.hiddenPostScoreThresholdElement.value);
            this.preferences.set('hiddenCommentScoreThreshold', this.hiddenCommentScoreThresholdElement.value);
            this.preferences.set('showGooglePlusWhenNoPosts', this.showGooglePlusWhenNoPostsElement.checked);
            this.preferences.set('rememberTabsOnViewChange', this.rememberTabsOnViewChangeElement.checked);
            this.preferences.set('displayGooglePlusByDefault', this.displayGooglePlusByDefaultElement.checked);
            this.preferences.set('showGooglePlusButton', this.showGooglePlusButtonElement.checked);
            this.displayOptionsSavedTicker.bind(this);
        };
        Options.prototype.displayAboutDialog = function () {
            document.getElementById('about').style.visibility = "visible";
            document.getElementById('cover').style.visibility = "visible";
        };
        Options.prototype.closeAboutDialog = function () {
            document.getElementById('about').style.visibility = "collapse";
            document.getElementById('cover').style.visibility = "collapse";
        };
        Options.prototype.displayOptionsSavedTicker = function () {
            var status = document.getElementById("status");
            status.textContent = this.localisationManager.get("options_label_saved");
            setTimeout(function () {
                status.textContent = "";
            }, 3000);
        };
        Options.getExtensionVersionNumber = function () {
            switch (window.getCurrentBrowser()) {
                case Browser.CHROME:
                    return chrome.app.getDetails().version;
                    break;
                case Browser.FIREFOX:
                    return self.options.version;
                    break;
            }
            return "";
        };
        return Options;
    })();
    AlienTube.Options = Options;
})(AlienTube || (AlienTube = {}));
new AlienTube.Options();
