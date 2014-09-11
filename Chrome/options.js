/* jslint browser: true */
/* global chrome */
// Saves options to localStorage.

var preferenceKeys = [
    "hiddenPostsScoreThreshold",
    "hiddenCommentScoreThreshold",
    "showGooglePlusWhenNoPosts",
    "rememberTabsOnViewChange",
    "displayGooglePlusByDefault"
];

var hiddenPostsScoreThreshold = document.getElementById("hiddenPostsScoreThreshold");
var hiddenCommentScoreThreshold = document.getElementById("hiddenCommentScoreThreshold");
var showGooglePlusWhenNoPosts = document.getElementById("showGooglePlusWhenNoPosts");
var rememberTabsOnViewChange = document.getElementById("rememberTabsOnViewChange");
var displayGooglePlusByDefault = document.getElementById("displayGooglePlusByDefault");

var localisationDirectory;

function initialise() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", chrome.extension.getURL('res/localisation.json'), true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            localisationDirectory = JSON.parse(xhr.responseText);

            window.title = getLocalisationText("optionsTitle");
            document.getElementById("saveButton").innerText = getLocalisationText("saveButtonText");
            document.getElementById("aboutButton").innerText = getLocalisationText("aboutButtonText");
            document.getElementById("closeButton").innerText = getLocalisationText("closeButtonText");
            document.getElementById("versiontext").innerText = getLocalisationText("versionText");


            for (var i = 0, len = preferenceKeys.length; i < len; i++) {
                var label = document.querySelector("label[for='" + preferenceKeys[i] + "']");
                label.innerText = getLocalisationText(preferenceKeys[i]);
            }

            chrome.storage.sync.get(null, function (items) {
                console.log(items);
                hiddenPostsScoreThreshold.value     = items.hiddenPostsScoreThreshold || -4;
                hiddenCommentScoreThreshold.value   = items.hiddenCommentScoreThreshold || -4;
                showGooglePlusWhenNoPosts.checked     = items.showGooglePlusWhenNoPosts || true;
                rememberTabsOnViewChange.checked      = items.rememberTabsOnViewChange || true;
                displayGooglePlusByDefault.checked    = items.displayGooglePlusByDefault || false;
            });
        }
    }
    xhr.send();
}


function getLocalisationText(key) {
    if (localisationDirectory[window.navigator.language]) {
        return localisationDirectory[window.navigator.language][key] || localisationDirectory["en"][key];
    } else {
        return localisationDirectory["en"][key];
    }
}

//Save options
function save_options() {
    if (!hiddenPostsScoreThreshold.value.match(/[0-9]+/)) {
        hiddenPostsScoreThreshold.value = -4;
    }
    if (!hiddenCommentScoreThreshold.value.match(/[0-9]+/)) {
        hiddenCommentScoreThreshold.value = -4;
    }
    chrome.storage.sync.set({
        'hiddenPostsScoreThreshold' :  hiddenPostsScoreThreshold.value,
        'hiddenCommentScoreThreshold': hiddenCommentScoreThreshold.value,
        'showGooglePlusWhenNoPosts': showGooglePlusWhenNoPosts.checked,
        'rememberTabsOnViewChange': rememberTabsOnViewChange.checked,
        'displayGooglePlusByDefault': displayGooglePlusByDefault.checked
    }, function() {
            var status = document.getElementById("status");
            status.innerHTML = getLocalisationText("optionsSavedText");
            setTimeout(function() {
                status.innerHTML = "";
            }, 1000);
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

document.addEventListener('DOMContentLoaded', initialise, false);
document.getElementById("saveButton").addEventListener("click", save_options);
document.getElementById("aboutButton").addEventListener("click", show_about);
document.getElementById("closeButton").addEventListener("click", close_about);
document.getElementById("cover").addEventListener("click", close_about);
document.getElementById('version').innerHTML = chrome.app.getDetails().version;
