/* jslint browser: true */
/* global chrome */
// Saves options to localStorage.


function save_options() {
    var hiddenCommentScoreThreshold = document.getElementById("hiddenCommentScoreThreshold");
    var wideCommentBox = document.getElementById("wideCommentBox");
    var featherDescriptionPlacement = document.getElementById("featherDescriptionPlacement");
    if (!hiddenCommentScoreThreshold.value.match(/[0-9]+/)) {
        hiddenCommentScoreThreshold.value = -4;
    }
    
    chrome.storage.sync.set(
        {'hiddenCommentScoreThreshold': hiddenCommentScoreThreshold.value},
        {'wideCommentBox': wideCommentBox.checked},
        {'featherDescriptionPlacement': featherDescriptionPlacement.checked}, function() {
            var status = document.getElementById("status");
            status.innerHTML = "Options Saved.";
            setTimeout(function() {
                status.innerHTML = "";
            }, 750);
        });
}

//Restore options when option page is loaded
function restore_options() {
    var hiddenCommentScoreThreshold = document.getElementById("hiddenCommentScoreThreshold");
    var wideCommentBox = document.getElementById("wideCommentBox");
    var featherDescriptionPlacement = document.getElementById("featherDescriptionPlacement");
    chrome.storage.sync.get('', function (items) {
		hiddenCommentScoreThreshold.value = items.hiddenCommentScoreThreshold ? parseInt(items.hiddenCommentScoreThreshold, -1) : -4;
        wideCommentBox.checked = items.wideCommentBox;
        featherDescriptionPlacement.checked = items.featherDescriptionPlacement;
	});
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById("saveButton").addEventListener("click", save_options);