/// <reference path="../index.ts" />
/**
    Namespace for requests to the Reddit API operations.
    @namespace AlienTube.Reddit
*/
"use strict";
module AlienTube.Reddit {
    /**
        Report a post or comment to moderators.
        @class RedditReport
        @param thing The Reddit ID of the item you wish to report.
        @param commentThread CommentThread object representing the container of the comment.
        @param isThread Whether the thing being reported is an entire thread.
    */
    export class Report {
        private reportContainer;

        constructor (thing : string, commentThread : CommentThread, isThread : boolean) {
            var reportTemplate, report_spam, report_vote_manipulation, report_personal_information, report_sexualising_minors, report_breaking_reddit, report_other;
            var submitButton, cancelButton, reportOtherButton, reportOtherField, radioButtonControllers, i, len, parentContainer, commentMain;

            reportTemplate = Main.getExtensionTemplateItem(commentThread.commentSection.template, "report");
            this.reportContainer = reportTemplate.querySelector(".at_report");
            
            /* Set localisation text for the various report reasons */
            var report_options = [
                "spam",
                "vote_manipulation",
                "personal_information",
                "sexualising_minors",
                "breaking_reddit",
                "other"
            ];
            
            report_options.forEach(function (reportOption) {
                document.querySelector("label[for='report_" + reportOption + "']").textContent = Main.localisationManager.get("report_dialog_" + reportOption);
            });

            /* Set localisation text for the submit button */
            submitButton = this.reportContainer.querySelector(".at_report_submit");
            submitButton.appendChild(document.createTextNode(Main.localisationManager.get("report_dialog_button_submit")));

            /* Set localisation text for the cancel button */
            cancelButton = this.reportContainer.querySelector(".at_report_cancel");
            cancelButton.appendChild(document.createTextNode(Main.localisationManager.get("report_dialog_button_cancel")));

            /* Assign an event listener to all the buttons, checking if the one that is being selected is the "other" button.
            If so, re-enable the "other reason" text field, if not, disable it. */
            reportOtherButton = this.reportContainer.querySelector("#report_other");
            reportOtherField = this.reportContainer.querySelector("#report_otherfield");

            var radioButtonControllers = this.reportContainer.querySelectorAll("input[type=radio]");
            for (i = 0, len = radioButtonControllers.length; i < len; i += 1) {
                radioButtonControllers[i].addEventListener("change", () => {
                    if (reportOtherButton.checked) {
                        reportOtherField.disabled = false;
                    } else {
                        reportOtherField.disabled = true;
                    }
                }, false);
            }

            /* Submit button click event. Check if the currently selected radio button is the "other" button, if so retrieve it's text
            field value. If not, use the value from whatever radio button is selected.  */
            submitButton.addEventListener("click", () => {
                var activeRadioButton, reportReason, otherReason;

                activeRadioButton = this.getCurrentSelectedRadioButton();
                reportReason = "";
                otherReason = "";
                if (activeRadioButton) {
                    if (activeRadioButton === reportOtherButton) {
                        reportReason = "other";
                        otherReason = reportOtherField.value;
                    } else {
                        reportReason = activeRadioButton.firstChild.innerHTML;
                    }
                }

                /* Send the report to Reddit*/
                new HttpRequest("https://api.reddit.com/api/report", RequestType.POST, () => {
                    var threadCollection, i, len, tabContainer, comment;

                    if (isThread) {
                        /* If the "thing" that was reported was a thread, we will iterate through the thread collection to find it, and
                        delete it, effectively hiding it. We will then force a redraw of the tab container, selecting the first tab in
                        the list.  */
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
                    } else {
                        /* If the "thing" that was reported was a comment, we will locate it on the page and delete it from DOM,
                        effectively hiding it. */
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
                        "uh": Main.Preferences.getString("redditUserIdentifierHash")
                    });

            }, false);

            /* Cancel event listener, will merely just get rid of the report screen. */
            cancelButton.addEventListener("click", () => {
                this.reportContainer.parentNode.removeChild(this.reportContainer);
            }, false);

            /* Append the report screen to the appropriate location. */
            if (isThread) {
                parentContainer = document.querySelector("header .info");
                parentContainer.appendChild(this.reportContainer);
            } else {
                commentMain = document.querySelector("article[data-reddit-id='" + thing.substring(3) + "'] .at_commentmain");
                commentMain.appendChild(this.reportContainer);
            }
        }

        /* Method to iterate through the radio buttons and get the one with a selected (checked) status. */
        getCurrentSelectedRadioButton () {
            var radioButtonControllers = this.reportContainer.querySelectorAll("input[type=radio]");
            for (var i = 0, len = radioButtonControllers.length; i < len; i += 1) {
                if (radioButtonControllers[i].checked) {
                    return radioButtonControllers[i];
                }
            }
            return null;
        }
    }
}
