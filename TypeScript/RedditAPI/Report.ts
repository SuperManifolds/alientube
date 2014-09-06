/// <reference path="../index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        Report a post or comment to moderators.
        @class RedditReport
        @param thing The Reddit ID of the item you wish to report.
        @param commentThread CommentThread object representing the container of the comment.
        @param isThread Whether the thing being reported is an entire thread.
    */
    export class RedditReport {
        private reportContainer;

        constructor(thing : string, commentThread : CommentThread, isThread : boolean) {
            this.reportContainer = commentThread.commentSection.template.getElementById("report").content.cloneNode(true);

            /* Set localisation text for the various report reasons */
            var report_spam = this.reportContainer.querySelector("label[for='report_spam']");
            report_spam.appendChild(document.createTextNode(Main.localisationManager.get("spam")));
            var report_vote_manipulation = this.reportContainer.querySelector("label[for='report_vote_manipulation']");
            report_vote_manipulation.appendChild(document.createTextNode(Main.localisationManager.get("voteManipulation")));
            var report_personal_information = this.reportContainer.querySelector("label[for='report_personal_information']");
            report_personal_information.appendChild(document.createTextNode(Main.localisationManager.get("personalInformation")));
            var report_sexualising_minors = this.reportContainer.querySelector("label[for='report_sexualising_minors']");
            report_sexualising_minors.appendChild(document.createTextNode(Main.localisationManager.get("sexualisingMinors")));
            var report_breaking_reddit = this.reportContainer.querySelector("label[for='report_breaking_reddit']");
            report_breaking_reddit.appendChild(document.createTextNode(Main.localisationManager.get("breakingReddit")));
            var report_other = this.reportContainer.querySelector("label[for='report_other']");
            report_other.appendChild(document.createTextNode(Main.localisationManager.get("reportOther")));

            var submitButton = this.reportContainer.querySelector(".at_report_submit");
            submitButton.appendChild(document.createTextNode(Main.localisationManager.get("submit")));

            var cancelButton = this.reportContainer.querySelector(".at_report_cancel");
            cancelButton.appendChild(document.createTextNode(Main.localisationManager.get("cancel")));

            var reportOtherButton = this.reportContainer.querySelector("#report_other");
            var reportOtherField = this.reportContainer.querySelector("#report_otherfield");

            var radioButtonControllers = this.reportContainer.querySelectorAll("input[type=radio]");
            for (var i = 0, len = radioButtonControllers.length; i < len; i++) {
                radioButtonControllers[i].addEventListener("change", () => {
                        if (reportOtherButton.checked) {
                            reportOtherField.disabled = false;
                        } else {
                            reportOtherField.disabled = true;
                        }
                }, false);
            }

            submitButton.addEventListener("click", () => {
                var activeRadioButton = this.getCurrentSelectedRadioButton();
                var reportReason = "";
                var otherReason = "";
                if (activeRadioButton) {
                    if (activeRadioButton === reportOtherButton) {
                        reportReason = "other";
                        otherReason = reportOtherField.value;
                    } else {
                        reportReason = activeRadioButton.firstChild.innerHTML;
                    }
                }

                new HttpRequest("https://api.reddit.com/api/report", RequestType.POST, () => {
                    if (isThread) {
                        var threadCollection = commentThread.commentSection.threadCollection;
                        for (var i = 0, len = threadCollection.length; i < len; i++) {
                            if (threadCollection[i].name === commentThread.threadInformation.name) {
                                threadCollection.splice(i, 1);
                                commentThread.commentSection.clearTabsFromTabContainer();
                                var tabContainer = document.getElementById("at_tabcontainer");
                                commentThread.commentSection.insertTabsIntoDocument(tabContainer, 0);
                                commentThread.commentSection.downloadThread(threadCollection[0]);
                                break;
                            }
                        }
                    } else {
                        var comment = document.querySelector("article[data-reddit-id='" + thing.substring(3) + "']");
                        if (comment) {
                            comment.parentNode.removeChild(comment);
                        }
                    }
                }, {
                    "api_type": "json",
                    "reason": reportReason,
                    "other_reason": otherReason,
                    "thing_id": thing
                });

            }, false);

            if (isThread) {
                var parentContainer = document.querySelector("header .info");
                parentContainer.appendChild(this.reportContainer);
            } else {
                var commentMain = document.querySelector("article[data-reddit-id='" + thing.substring(3) + "'] .at_commentmain");
                commentMain.appendChild(this.reportContainer);
            }

        }

        getCurrentSelectedRadioButton () {
            var radioButtonControllers = this.reportContainer.querySelectorAll("input[type=radio]");
            for (var i = 0, len = radioButtonControllers.length; i < len; i++) {
                if (radioButtonControllers[i].checked) {
                    return radioButtonControllers[i];
                }
            }
            return null;
        }
    }
}
