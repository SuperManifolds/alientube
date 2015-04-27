/// <reference path="../index.ts" />
"use strict";
var AlienTube;
(function (AlienTube) {
    var RedditReport = (function () {
        function RedditReport(thing, commentThread, isThread) {
            var _this = this;
            var reportTemplate, report_spam, report_vote_manipulation, report_personal_information, report_sexualising_minors, report_breaking_reddit, report_other;
            var submitButton, cancelButton, reportOtherButton, reportOtherField, radioButtonControllers, i, len, parentContainer, commentMain;
            reportTemplate = AlienTube.Main.getExtensionTemplateItem(commentThread.commentSection.template, "report");
            this.reportContainer = reportTemplate.querySelector(".at_report");
            report_spam = this.reportContainer.querySelector("label[for='report_spam']");
            report_spam.appendChild(document.createTextNode(AlienTube.Main.localisationManager.get("report_dialog_spam")));
            report_vote_manipulation = this.reportContainer.querySelector("label[for='report_vote_manipulation']");
            report_vote_manipulation.appendChild(document.createTextNode(AlienTube.Main.localisationManager.get("report_dialog_vote_manipulation")));
            report_personal_information = this.reportContainer.querySelector("label[for='report_personal_information']");
            report_personal_information.appendChild(document.createTextNode(AlienTube.Main.localisationManager.get("report_dialog_personal_information")));
            report_sexualising_minors = this.reportContainer.querySelector("label[for='report_sexualising_minors']");
            report_sexualising_minors.appendChild(document.createTextNode(AlienTube.Main.localisationManager.get("report_dialog_seuxalising_minors")));
            report_breaking_reddit = this.reportContainer.querySelector("label[for='report_breaking_reddit']");
            report_breaking_reddit.appendChild(document.createTextNode(AlienTube.Main.localisationManager.get("report_dialog_breaking_reddit")));
            report_other = this.reportContainer.querySelector("label[for='report_other']");
            report_other.appendChild(document.createTextNode(AlienTube.Main.localisationManager.get("report_dialog_other")));
            submitButton = this.reportContainer.querySelector(".at_report_submit");
            submitButton.appendChild(document.createTextNode(AlienTube.Main.localisationManager.get("report_dialog_button_submit")));
            cancelButton = this.reportContainer.querySelector(".at_report_cancel");
            cancelButton.appendChild(document.createTextNode(AlienTube.Main.localisationManager.get("report_dialog_button_cancel")));
            reportOtherButton = this.reportContainer.querySelector("#report_other");
            reportOtherField = this.reportContainer.querySelector("#report_otherfield");
            var radioButtonControllers = this.reportContainer.querySelectorAll("input[type=radio]");
            for (i = 0, len = radioButtonControllers.length; i < len; i += 1) {
                radioButtonControllers[i].addEventListener("change", function () {
                    if (reportOtherButton.checked) {
                        reportOtherField.disabled = false;
                    }
                    else {
                        reportOtherField.disabled = true;
                    }
                }, false);
            }
            submitButton.addEventListener("click", function () {
                var activeRadioButton, reportReason, otherReason;
                activeRadioButton = _this.getCurrentSelectedRadioButton();
                reportReason = "";
                otherReason = "";
                if (activeRadioButton) {
                    if (activeRadioButton === reportOtherButton) {
                        reportReason = "other";
                        otherReason = reportOtherField.value;
                    }
                    else {
                        reportReason = activeRadioButton.firstChild.innerHTML;
                    }
                }
                new AlienTube.HttpRequest("https://api.reddit.com/api/report", AlienTube.RequestType.POST, function () {
                    var threadCollection, i, len, tabContainer, comment;
                    if (isThread) {
                        threadCollection = commentThread.commentSection.threadCollection;
                        for (i = 0, len = threadCollection.length; i < len; i += 1) {
                            if (threadCollection[i].name === commentThread.threadInformation.name) {
                                threadCollection.splice(i, 1);
                                commentThread.commentSection.clearTabsFromTabContainer();
                                tabContainer = document.getElementById("at_tabcontainer");
                                commentThread.commentSection.insertTabsIntoDocument(tabContainer, 0);
                                commentThread.commentSection.downloadThread(threadCollection[0]);
                                break;
                            }
                        }
                    }
                    else {
                        comment = document.querySelector("article[data-reddit-id='" + thing.substring(3) + "']");
                        if (comment) {
                            comment.parentNode.removeChild(comment);
                        }
                    }
                }, {
                    "api_type": "json",
                    "reason": reportReason,
                    "other_reason": otherReason,
                    "thing_id": thing,
                    "uh": AlienTube.Main.Preferences.getString("redditUserIdentifierHash")
                });
            }, false);
            cancelButton.addEventListener("click", function () {
                _this.reportContainer.parentNode.removeChild(_this.reportContainer);
            }, false);
            if (isThread) {
                parentContainer = document.querySelector("header .info");
                parentContainer.appendChild(this.reportContainer);
            }
            else {
                commentMain = document.querySelector("article[data-reddit-id='" + thing.substring(3) + "'] .at_commentmain");
                commentMain.appendChild(this.reportContainer);
            }
        }
        RedditReport.prototype.getCurrentSelectedRadioButton = function () {
            var radioButtonControllers = this.reportContainer.querySelectorAll("input[type=radio]");
            for (var i = 0, len = radioButtonControllers.length; i < len; i += 1) {
                if (radioButtonControllers[i].checked) {
                    return radioButtonControllers[i];
                }
            }
            return null;
        };
        return RedditReport;
    })();
    AlienTube.RedditReport = RedditReport;
})(AlienTube || (AlienTube = {}));
