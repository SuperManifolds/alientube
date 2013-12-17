/* jslint browser: true */
/* global chrome */
// Saves options to localStorage.

//Save options
function save_options() {
    var hiddenCommentScoreThreshold = document.getElementById("hiddenCommentScoreThreshold");
    var wideLayout = document.getElementById("wideLayout");
    var featherDescriptionPlacement = document.getElementById("featherDescriptionPlacement");
    var disablePostHeader = document.getElementById("disablePostHeader");
    var disableTabs = document.getElementById("disableTabs");
    var minimiseCommentBox = document.getElementById("minimiseCommentBox");
    if (!hiddenCommentScoreThreshold.value.match(/[0-9]+/)) {
        hiddenCommentScoreThreshold.value = -4;
    }
    chrome.storage.sync.set({
        'hiddenCommentScoreThreshold': hiddenCommentScoreThreshold.value,
        'wideLayout': wideLayout.checked,
        'featherDescriptionPlacement': featherDescriptionPlacement.checked,
        'disablePostHeader': disablePostHeader.checked,
        'disableTabs': disableTabs.checked,
        'minimiseCommentBox' : minimiseCommentBox.checked
    }, function() {
            var status = document.getElementById("status");
            status.innerHTML = "Options Saved.";
            setTimeout(function() {
                status.innerHTML = "";
            }, 1000);
        });
}

//Restore options when option page is loaded
function restore_options() {
    var hiddenCommentScoreThreshold = document.getElementById("hiddenCommentScoreThreshold");
    var wideLayout = document.getElementById("wideLayout");
    var featherDescriptionPlacement = document.getElementById("featherDescriptionPlacement");
    var disablePostHeader = document.getElementById("disablePostHeader");
    var disableTabs = document.getElementById("disableTabs");
    var minimiseCommentBox = document.getElementById("minimiseCommentBox");
    chrome.storage.sync.get(null, function (items) {
        hiddenCommentScoreThreshold.value = items.hiddenCommentScoreThreshold ? items.hiddenCommentScoreThreshold : -4;
        wideLayout.checked = items.wideLayout;
        featherDescriptionPlacement.checked = items.featherDescriptionPlacement;
        disablePostHeader.checked = items.disablePostHeader;
        disableTabs.checked = items.disableTabs;
        minimiseCommentBox.checked = items.minimiseCommentBox;
    });
}

// Show about dialog
function show_about() {
    document.getElementById('about').style.visibility="visible";
    document.getElementById('cover').style.visibility="visible";
}

// Hide about dialog
function close_about() {
    document.getElementById('about').style.visibility="collapse";
    document.getElementById('cover').style.visibility="collapse";
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById("saveButton").addEventListener("click", save_options);
document.getElementById("aboutButton").addEventListener("click", show_about);
document.getElementById("close").addEventListener("click", close_about);
document.getElementById('version').innerHTML = chrome.app.getDetails().version;