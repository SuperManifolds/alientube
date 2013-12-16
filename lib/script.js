/* jslint browser: true */
/* global _, $, jQuery, safari, chrome, self, SnuOwnd */

// String.Format equivlency function for Javascript. I am not a fan of the inefficiences in this, but it is essential to keep at least a basic templating system with the amount of HTML I work with.
String.format = function () {
    var s = arguments[0];
    for (var i = 0; i < arguments.length - 1; i++) {
        var reg = new RegExp("\\{" + i + "\\}", "gm");
        s = s.replace(reg, arguments[i + 1]);
    }
    return s;
};

var AlienTube = {
    preferences: {},
    searchResults: [],
    Strings: "",
    browser: {
        "Safari": 0,
        "Chrome": 1,
        "Firefox": 2,
        "Opera": 3
    },

    // Looping function used to traverse down the tree of replies
    traverseComment: function (data, result) {
        var output = AlienTube.getCommentAsHTML(data, result);
        // Does this comment have replies? 
        if (data.replies !== null && data.replies.length !== 0 && data.replies !== undefined) {
            output += '<div class="replies">';
            //Loop through replies, validate them and continue down the tree.
            $.each(data.replies.data.children, function (index, value) {
                if (value.data.body !== undefined) {
                    output += AlienTube.traverseComment(value.data, result);
                }
            });
            output += '</div>';
        }
        output += '</article>';
        return output;
    },

    // Checking the API we are using. Credit to RES (http://github.com/honestbleeps/Reddit-Enhancement-Suite) for this.
    getCurrentBrowserAPI: function () {
        if (typeof (safari) !== 'undefined') {
            return 0;
        } else if (typeof (chrome) !== 'undefined') {
            return 1;
        } else if (typeof (self.on) === 'function') {
            return 2;
        } else if (typeof (opera) !== 'undefined') {
            return 3;
        } else {
            return null;
        }
    },

    //Universal AJAX (GET) request Callback between browsers. For Safari we must make a request to the global page because Safari does not allow us to make these in a content script.
    GETRequest: function (url, callback) {
        switch (AlienTube.getCurrentBrowserAPI()) {
        case AlienTube.browser.Safari:
            var uuid = AlienTube.makeUUID();
            safari.self.addEventListener('message', function (event) {
                if (event.name == uuid) {
                    var xhr = JSON.parse(event.message);
                    AlienTube.handleXhrCallbacks(xhr, xhr.responseText, callback);
                }
            }, false);
            safari.self.tab.dispatchMessage(uuid, {
                type: 'GETRequest',
                url: url
            });
            break;
        case AlienTube.browser.Chrome:
        case AlienTube.browser.Firefox:
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.withCredentials = true;
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    AlienTube.handleXhrCallbacks(xhr, xhr.responseText, callback);
                }
            };
            xhr.send();
            break;
        }
    },

    //Universal AJAX (POST) request Callback between browsers. For Safari we must make a request to the global page because Safari does not allow us to make these in a content script.
    POSTRequest: function (url, data, callback) {
        switch (AlienTube.getCurrentBrowserAPI()) {
        case AlienTube.browser.Safari:
            var uuid = AlienTube.makeUUID();
            safari.self.addEventListener('message', function (event) {
                if (event.name == uuid) {
                    var xhr = JSON.parse(event.message);
                    AlienTube.handleXhrCallbacks(xhr, xhr.responseText, callback);
                }
            }, false);
            safari.self.tab.dispatchMessage(uuid, {
                type: 'POSTRequest',
                url: url,
                data: $.param(data)
            });
            break;
        case AlienTube.browser.Chrome:
        case AlienTube.browser.Firefox:
            var xhr = new XMLHttpRequest();
            xhr.open("POST", url, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 4) {
                    AlienTube.handleXhrCallbacks(xhr, xhr.responseText, callback);
                }
            };
            xhr.send($.param(data));
        }
    },

    // Function for handling AJAX callbacks, the information provided by the browsers are not very helpful in itself to end users, so this is my attempt to provide some more useful errors when needed.
    handleXhrCallbacks: function (xhr, response, callback) {
        switch (xhr.status) {
        case 200:
        case 201:
        case 202:
        case 301:
        case 302:
        case 303:
            callback(response);
            break;
        case 400:
            AlienTube.postErrorMessage(AlienTube.formatHTTPErrorMessage(xhr.status, xhr.statusText, AlienTube.getLocalisation('error400')));
            break;
        case 401:
        case 403:
            if (AlienTube.getCurrentBrowserAPI() === AlienTube.browser.Safari) {
                AlienTube.postErrorMessage(AlienTube.formatHTTPErrorMessage(xhr.status, xhr.statusText, AlienTube.getLocalisation('error403Safari')));
            } else {
                AlienTube.postErrorMessage(AlienTube.formatHTTPErrorMessage(xhr.status, xhr.statusText, AlienTube.getLocalisation('error403')));
            }
            break;
        case 404:
            AlienTube.postErrorMessage(AlienTube.formatHTTPErrorMessage(xhr.status, xhr.statusText, AlienTube.getLocalisation('error404')));
            break;
        case 500:
            AlienTube.postErrorMessage(AlienTube.formatHTTPErrorMessage(xhr.status, xhr.statusText, AlienTube.getLocalisation('error500')));
            break;
        case 503:
            AlienTube.postErrorMessage(AlienTube.formatHTTPErrorMessage(xhr.status, xhr.statusText, AlienTube.getLocalisation('error503')));
            break;
        default:
            AlienTube.postErrorMessage(AlienTube.formatHTTPErrorMessage(xhr.status, xhr.statusText));
        }
    },

    // Helper function for formatting the error messages.
    formatHTTPErrorMessage: function (code, error, message) {
        if (typeof (message) !== 'undefined') {
            return '<b>' + code + '</b> (' + error + '): ' + message;
        } else {
            return '<b>' + code + '</b> (' + error + ')';
        }
    },

    // Javascript have no methods for generating UUIDs (Global Unique Identifiers), this is written after the UUID version 4 scheme.
    makeUUID: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    //Convert Unix Timestamp to a Reddit-style elapsed timestamp. This is not pretty but it works, if someone wants to write it better they are welcome to. 
    timeAgoFromEpochTime: function (epoch) {
        var secs = ((new Date()).getTime() / 1000) - epoch;
        Math.floor(secs);
        var minutes = secs / 60;
        secs = Math.floor(secs % 60);
        if (minutes < 1) {
            return secs + (secs > 1 ? ' seconds ago' : ' second ago');
        }
        var hours = minutes / 60;
        minutes = Math.floor(minutes % 60);
        if (hours < 1) {
            return minutes + (minutes > 1 ? ' minutes ago' : ' minute ago');
        }
        var days = hours / 24;
        hours = Math.floor(hours % 24);
        if (days < 1) {
            return hours + (hours > 1 ? ' hours ago' : ' hour ago');
        }
        var weeks = days / 7;
        days = Math.floor(days % 7);
        if (weeks < 1) {
            return days + (days > 1 ? ' days ago' : ' day ago');
        }
        var months = weeks / 4.35;
        weeks = Math.floor(weeks % 4.35);
        if (months < 1) {
            return weeks + (weeks > 1 ? ' weeks ago' : ' week ago');
        }
        var years = months / 12;
        months = Math.floor(months % 12);
        if (years < 1) {
            return months + (months > 1 ? ' months ago' : ' month ago');
        }
        years = Math.floor(years);
        return years + (years > 1 ? ' years ago' : ' years ago');
    },

    //Generate a single comment as HTML. Because reddit does for some reason only the heavens know not provide us with a score we must calculate it ourselves.
    getCommentAsHTML: function (data, result) {
        var time = AlienTube.timeAgoFromEpochTime(data.created_utc);
        // Check whether the comment is older than 180 days, in which case it can no longer be replied to and is in what Reddit calls "preserved" status.
        var isPreserved = ((((new Date()).getTime() / 1000) - data.created_utc) >= 15552000);
        var comment = "";
        var threshold = AlienTube.preferences.hiddenCommentScoreThreshold;
        // jQuery based workaround for unescaping the HTML provided by Reddit. I am willing to this ONLY because we make ALL requests through HTTPS thereby preventing man in the middle attacks.
        var html = $("<div/>").html(data.body_html).text().replace('href="/', 'target="_blank" href="http://reddit.com/');
        if (!threshold) {
            threshold = -4;
        }
        //Create replacement item for collapsed comments. Check if a comment is below the treshold and should be hidden by default.
        if ((data.ups - data.downs) <= threshold) {
            comment = String.format(AlienTube.Strings.html.collapsedCommentBelowThreshold,
                data.author);
        } else {
            comment = String.format(AlienTube.Strings.html.collapsedComment,
                data.author,
                data.ups - data.downs,
                new Date(data.created_utc * 1000).toISOString(),
                time);
        }
        //Create the real comment.
        comment += String.format(AlienTube.Strings.html.comment, (data.ups - data.downs) <= -4 ? 'display: none;' : "",
            data.name,
            AlienTube.getCommentVotingHTML(data),
            data.author,
            data.author_flair_text !== null ? '<span class="flair">' + data.author_flair_text + '</span>' : "",
            data.ups - data.downs,
            new Date(data.created_utc * 1000).toISOString(),
            time,
            data.ups,
            data.downs,
            html,
            isPreserved ? '' : '<span class="replyTo">reply</span> ',
            'http://www.reddit.com' + result.permalink + data.id,
            'http://www.reddit.com' + result.permalink + data.parent_id.substring(3),
            'https://getpocket.com/save?url=' + encodeURIComponent('http://www.reddit.com' + result.permalink));
        return comment;
    },

    // Helper function for getting localisation strings. This is not widely used yet and is more of a thing for the future. Language is hardcoded because there is only one available.
    getLocalisation: function (key) {
        return AlienTube.Strings.localisation['en-GB'][key];
    },

    // Get the HTML for the comment voting arrows.
    getCommentVotingHTML: function (data) {
        if (!AlienTube.preferences.modhash) {
            return "";
        }
        var output = '';
        output += data.likes === true ? '<div class="arrow upmod"></div>' : '<div class="arrow up"></div>';
        output += data.likes === false ? '<div class="arrow downmod"></div>' : '<div class="arrow down"></div>';
        return output;
    },

    //Get the HTML for the post voting arrows.
    getPostVotingHTML: function (data) {
        if (!AlienTube.preferences.modhash) {
            return "";
        }
        var output = '';
        if (data.likes === true) {
            output += '<div class="arrow upmod"></div>';
            output += '<div class="postScore liked">' + data.score + '</div>';
            output += '<div class="arrow down"></div>';
        } else if (data.likes === false) {
            output += '<div class="arrow up"></div>';
            output += '<div class="postScore disliked">' + data.score + '</div>';
            output += '<div class="arrow downmod"></div>';
        } else {
            output += '<div class="arrow up"></div>';
            output += '<div class="postScore">' + data.score + '</div>';
            output += '<div class="arrow down"></div>';
        }
        return output;
    },

    //Generates the reddit comment frame and tabs
    generateRedditComments: function (results, isSingleResult) {
        //Create tabs for all available threads.
        var output = '';
        if (!isSingleResult && !AlienTube.preferences.disableTabs) {
            output += String.format('<div id=\"redditTabs\">' + AlienTube.Strings.html.activeTab, results[0].subreddit);
            // Calculate the number of tabs we can display by adding the width of the chrome (43px) with the average width of a text character times subreddit length.
            var width = (21 + results[0].subreddit.length * 7);
            if (results.length > 1) {
                var i;
                for (i = 1; i < results.length; i++) {
                    width = width + (21 + (results[i].subreddit.length * 7));
                    if (width >= 550) {
                        break;
                    }
                    // Get the HTML for the tabs.
                    output += String.format(AlienTube.Strings.html.tab, results[i].subreddit);
                }
                if (i < results.length) {
                    // Create the overflow tab ad the overflow menu. I decided to handle this with javascript rather than the regular CSS hover menu trick because I found it popping up on mouseover annoying.
                    output += AlienTube.Strings.html.overflowButton;
                    for (i = i; i < results.length; i++) {
                        output += String.format('<li data-value="{0}">{0}</li>', results[i].subreddit);
                    }
                    output += '</ul></button>';
                }
            }
            output += '</div>';
            // Handle changing of tabs.
            $('.redditTab').click(function (e) {
                var target = e.target;
                var targetid = $(this).attr("data-value");
                // User may have clicked the text inside, instead of the button, check if it is parent we want instead.
                if (typeof (targetid) === 'undefined') {
                    targetid = $(this).parent().attr('data-value');
                    target = $(e.target).parent();
                }
                if (!$(target).hasClass('active')) {
                    //Set the clicked button as active and start loading the comments for this tab.
                    $('#redditTabs').children('button').each(function () {
                        if ($(this).hasClass('active')) {
                            $(this).removeClass('active');
                        }
                    });
                    $(target).addClass('active');
                    var data = results.filter(function (e) {
                        return e.subreddit == targetid;
                    });
                    AlienTube.loadCommentsForPost(data[0]);
                }
            });
            // Handle overflow menu events
            $('#redditOverflow').click(function (e) {
                if ($(e.target).children('ul').is(':visible')) {
                    $(e.target).children('ul').hide();
                    $(e.target).fadeTo(300, 0.5);
                } else {
                    $(e.target).children('ul').show();
                    $(e.target).fadeTo(300, 1);
                }
            });
            // If the user clicks anywhere that is not the menu it should close. I use Fadeto because it provides an easy way of closing, and also it looks fancy.
            $('body').click(function (e) {
                if ($('#redditOverflow').children('ul').is(':visible') && !$('#redditOverflow').is(e.target) && $('#redditOverflow').has(e.target).length === 0) {
                    $('#redditOverflow').children('ul').hide();
                    $('#redditOverflow').fadeTo(300, 0.5);
                }
            });
            $('#redditOverflow > ul').click(function (e) {
                // Load the clicked subreddit as the active tab and remove it from the menu and push the rightmost tab into overflow.
                var subreddit = $(e.target).attr('data-value');
                $($('#redditTabs').children()[0]).removeClass('border');
                $('#redditTabs').children('button').each(function () {
                    if ($(this).hasClass('active')) {
                        $(this).removeClass('active');
                    }
                });
                $('#redditTabs').prepend(String.format(AlienTube.Strings.html.activeTab, subreddit));
                $(e.target).remove();
                var rmValue = $($('#redditTabs').children('.redditTab')[$('#redditTabs').children('.redditTab').length - 1]).attr('data-value');
                $('#redditTabs').children('.redditTab')[$('#redditTabs').children('.redditTab').length - 1].remove();
                $('#redditOverflow > ul').append(String.format('<li data-value="{0}">{0}</li>', rmValue));
                var data = results.filter(function (e) {
                    return e.subreddit == subreddit;
                });
                // Load the comments for the new tab.
                AlienTube.loadCommentsForPost(data[0]);
            });
        }
        output += '<div id="rcomments"></div></section>';
        // Insert the generated HTML into the DOM.
        $('#reddit').html(output);
        // Load the first result. If it was a direct single page redirect we do not need to request it.
        if (isSingleResult) {
            AlienTube.generateCommentsForPost(results);
        } else {
            AlienTube.loadCommentsForPost(results[0]);
        }
    },

    // Helper function for downloading the data for a specific post. This is made seperate from the main function because on a single search result Reddit will redirect us directly to this data instead of returning a search result page. 
    loadCommentsForPost: function (data) {
        var link = String.format("https://pay.reddit.com/r/{0}/comments/{1}.json", data.subreddit, data.id);
        $('#rcomments').html('<div class="redditSpinner"></div>');
        AlienTube.GETRequest(link, function (requestData) {
            try {
                AlienTube.generateCommentsForPost(JSON.parse(requestData));
            } catch (e) {
                AlienTube.postErrorMessage(e);
                console.log(e);
            }
        });
    },

    secondSearch: function () {
        /* Reddit's search function distinguishes between the http and https version of a youtube link and does not suport wildcards.
           Unfortunately this means we will have to check both, this function performs the second search. Unfortunately this still doesn't seem to get every result. I am looking into this. */
        var link = 'https://www.youtube.com/watch?v=' + $.url(window.location.href).param('v');
        AlienTube.GETRequest("https://pay.reddit.com/submit.json?url=" + encodeURIComponent(link), function (requestData) {
            try {
                var result = JSON.parse(requestData);
                if (jQuery.isPlainObject(result)) {
                    if (typeof (AlienTube.searchResults) !== 'undefined' && AlienTube.searchResults.length > 0) {
                        AlienTube.processSearchResults();
                    } else {
                        $('.redditSpinner').remove();
                        AlienTube.setCommentSection('<p class="redditSingleMessage">No posts found</p>');
                    }
                } else {
                    // If this is a search result process the search result, if it is a direct link to a single page, process it.
                    if (result.kind == 'Listing') {
                        AlienTube.searchResults = AlienTube.searchResults.concat(result.data.children);
                        AlienTube.processSearchResults();
                    } else {
                        if (typeof (result[1].data) !== 'undefined') {
                            AlienTube.generateRedditComments(result, true);
                        } else {
                            $('.redditSpinner').remove();
                            AlienTube.setCommentSection('<p class="redditSingleMessage">No posts found</p>');
                        }
                    }
                }
            } catch (e) {
                AlienTube.postErrorMessage(e);
                console.log(e);
            }
        });
    },

    //Processes the results of both searches.
    processSearchResults: function () {
        var numArray = [];

        //If there is a link to a subreddit or a reddit post in the video description we will prioritise it.
        var preferedSubreddit = null;
        var preferedPost = null;
        $('#eow-description').children('a').each(function () {
            var url = $.url($(this).attr('href'));
            if (url.host === 'www.reddit.com' && url.segment(1) == 'r' && typeof (url.segment(2)) !== 'undefined') {
                preferedSubreddit = url.segment(2);
                if (url.segment(3) == 'comments' && url.segment(4) !== undefined) {
                    preferedPost = url.segment(4);
                }
            }
        });
        // Remove the .data attribute it is unecessary.
        $.each(AlienTube.searchResults, function (index, value) {
            numArray.push(value.data);
        });
        // Retrieve the best thread from each subreddit by adding together the comments and scores then comparing.
        numArray = _.groupBy(numArray, 'subreddit');
        var topItemOfSubreddits = [];
        $.each(numArray, function (index, value) {
            topItemOfSubreddits.push(value.reduce(function (a, b) {
                return ((a.score + a.num_comments) > (b.score + b.num_comments) || a.id === preferedPost) ? a : b;
            }));
        });
        // Sort the result accordingly with the top being the highest score, and select the item with the highest score and comment accumelence as the default thread.
        topItemOfSubreddits.sort(function (a, b) {
            return ((b.score + b.num_comments) ||  b.subreddit == preferedSubreddit || (b.subreddit == preferedSubreddit && b.id == preferedPost)) - (a.score + a.num_comments);
        });
        AlienTube.generateRedditComments(topItemOfSubreddits, false);
    },

    // Loads the content of alternate tabs.
    generateCommentsForPost: function (result) {
        var currentModhash = AlienTube.preferences.modhash;
        AlienTube.preferences.modhash = result[0].data.modhash;
        var output = "";
        // Create header for the article, this is the post arrows, title, and post information.
        if (!AlienTube.preferences.disablePostHeader) {
            var time = AlienTube.timeAgoFromEpochTime(result[0].data.children[0].data.created_utc);
            output += String.format(AlienTube.Strings.html.header,
                result[0].data.children[0].data.name,
                AlienTube.getPostVotingHTML(result[0].data.children[0].data),
                result[0].data.children[0].data.permalink,
                result[0].data.children[0].data.title,
                time,
                result[0].data.children[0].data.author);
        }
        // Create post comment box
        if (AlienTube.preferences.modhash) {
            output += String.format(AlienTube.Strings.html.mainCommentBox, result[0].data.children[0].data.name);
        }

        // Loop through top level comments, validate them, and start down the tree.
        $.each(result[1].data.children, function (index, value) {
            if (typeof (value.data.body) !== 'undefined') {
                output += AlienTube.traverseComment(value.data, result[0].data.children[0].data);
            }
        });

        // Output the generated HTML into DOM.
        $('#rcomments').html(output);

        // Because of limitations of the Reddit API we will have to call a different page to find out who we are posting as. This is done asynchroniously as to not hold back the rest of the plugin or page. We will only do this if the modhash has changed, in which we know there is a different user or the user has logged in/out.
        if (result[0].data.modhash) {
            if (currentModhash !== result[0].data.modhash) {
                AlienTube.setPreferencesValue('modhash', result[0].data.modhash);
                AlienTube.GETRequest('https://pay.reddit.com/api/me.json', function (data) {
                    var json = JSON.parse(data);
                    AlienTube.setPreferencesValue('username', json.data.name);
                    $('.redditUsername').html('Commenting as: <b>' + json.data.name + '</b>');
                });
            } else {
                $('.redditUsername').html('Commenting as: <b>' + AlienTube.preferences.username + '</b>');
            }
        }
        AlienTube.bindCommentEvents(result[0].data.children[0].data);
    },

    // Helper function for casting a vote to the Reddit API. This can be used for both posts and comments.
    castVote: function (id, vote, callback) {
        try {
            AlienTube.POSTRequest('https://pay.reddit.com/api/vote', {
                id: id,
                dir: vote,
                uh: AlienTube.preferences.modhash
            }, callback);
        } catch (e) {
            AlienTube.postErrorMessage(e);
            console.log(e);
        }
    },

    // Helper function for posting a comment to the Reddit API. This can be used for both posts and comments, replies as well. 
    submitComment: function (id, comment, callback) {
        try {
            AlienTube.POSTRequest('https://pay.reddit.com/api/comment', {
                thing_id: id,
                text: comment,
                uh: AlienTube.preferences.modhash
            }, callback);
        } catch (e) {
            AlienTube.postErrorMessage(e);
            console.log(e);
        }
    },

    // Bind all the events related to the comments.
    bindCommentEvents: function (data) {
        // Bind event for clicking the collapse comment thread button.
        $('.collapseButton').click(function (e) {
            $(this).closest('article').hide();
            $(this).closest('article').prev().show();
            e.preventDefault();
        });
        // Bind event for clicking the expand comment thread button.
        $('.expandButton').click(function (e) {
            $(this).closest('.collapse').hide();
            $(this).closest('.collapse').next().show();
            e.preventDefault();
        });
        // Bind event for content changing in the comment box for hiding or showing the preview box. As well as updating the contents of the preview.
        $('.textarea_comment').bind('input propertychange', function () {
            $($($(this).siblings()[3]).children()[2]).html(SnuOwnd.getParser().render(this.value));
            $($($($(this).siblings()[3]).children()[1]).children()[0]).text(this.value.length);
            if (this.value.length > 0) {
                $($(this).siblings()[3]).show();
            } else {
                $($(this).siblings()[3]).hide();
            }
        });
        // Bind event for comment submit button.
        $('.commentSubmit').click(function (e) {
            var id = $(e.target).closest('article').attr('data-id');
            var isPost = false;
            if (id === undefined) {
                id = $('#reddit header').attr('data-id');
                isPost = true;
            }
            AlienTube.submitComment(id, $(e.target).prev().val(), function () {
                AlienTube.loadCommentsForPost(data);
                $(e.target).prev().val('');
                $(e.target).next().hide();
            });
        });
        // Bind event for comment and post voting. I decided to process it both for comments and posts here to avoid duplicate code.
        $('.arrow').click(function (e) {
            var id = $(e.target).closest('article').attr('data-id');
            var isPost = false;
            var isModified = false;
            if (id === undefined) {
                id = $('#reddit header').attr('data-id');
                isPost = true;
            }
            // The comment/post is already upvoted and the user is clicking on the up arrow. This means they want to remove their vote.
            if ($(e.target).hasClass('upmod')) {
                AlienTube.castVote(id, 0, function () {
                    $(e.target).addClass('up');
                    $(e.target).removeClass('upmod');
                    if (isPost) {
                        $(e.target).next().removeClass('liked');
                        $(e.target).next().html(parseInt($(e.target).next().text(), 10) - 1);
                    } else {
                        var target = $(e.target).parent().next().children('.info').children('.upvotes');
                        target.text(parseInt(target.text(), 10) - 1);
                    }
                });
                // The comment/post is already downvoted and the user is clicking on the down arrow. This means they want to remove their vote.
            } else if ($(e.target).hasClass('downmod')) {
                AlienTube.castVote(id, 0, function () {
                    $(e.target).addClass('down');
                    $(e.target).removeClass('downmod');
                    if (isPost) {
                        $(e.target).prev().removeClass('disliked');
                        $(e.target).prev().html(parseInt($(e.target).prev().text(), 10) + 1);
                    } else {
                        var target = $(e.target).parent().next().children('.info').children('.downvotes');
                        target.html(parseInt(target.text(), 10) - 1);
                    }
                });
                // The user has clicked the upvote button so we must perform the upvote. We have to check whether the comment is already downvoted and the user has changed their mind; in which case we also have to remove the downvote in the UI.
            } else if ($(e.target).hasClass('up')) {
                AlienTube.castVote(id, +1, function () {
                    if ($(e.target).nextAll('.arrow').hasClass('downmod')) {
                        isModified = true;
                    }
                    $(e.target).addClass('upmod');
                    $(e.target).removeClass('up');
                    $(e.target).nextAll('.arrow').addClass('down');
                    $(e.target).nextAll('.arrow').removeClass('downmod');
                    if (isPost) {
                        $(e.target).next().addClass('liked');
                        $(e.target).next().removeClass('disliked');
                        $(e.target).next().html(parseInt($(e.target).next().text(), 10) + (isModified ? 2 : 1));
                    } else {
                        var target = $(e.target).parent().next().children('.info').children('.upvotes');
                        target.html(parseInt(target.text(), 10) + 1);
                        if (isModified) {
                            var opTarget = $(e.target).parent().next().children('.info').children('.downvotes');
                            opTarget.html(parseInt(opTarget.text(), 10) - 1);
                        }
                    }
                });
                // The user has clicked the downvote button so we must perform the downvote. We have to check whether the comment is already upvoted and the user has changed their mind; in which case we also have to remove the upvote in the UI.
            } else if ($(e.target).hasClass('down')) {
                AlienTube.castVote(id, -1, function () {
                    if ($(e.target).prevAll('.arrow').hasClass('upmod')) {
                        isModified = true;
                    }
                    $(e.target).addClass('downmod');
                    $(e.target).removeClass('down');
                    $(e.target).prevAll('.arrow').addClass('up');
                    $(e.target).prevAll('.arrow').removeClass('upmod');
                    if (isPost) {
                        $(e.target).prev().addClass('disliked');
                        $(e.target).prev().removeClass('liked');
                        $(e.target).prev().html(parseInt($(e.target).prev().text(), 10) - (isModified ? 2 : 1));
                    } else {
                        var target = $(e.target).parent().next().children('.info').children('.downvotes');
                        target.html(parseInt(target.text(), 10) + 1);
                        if (isModified) {
                            var opTarget = $(e.target).parent().next().children('.info').children('.upvotes');
                            opTarget.html(parseInt(opTarget.text(), 10) - 1);
                        }
                    }
                });
            }
        });
    },

    // Helper function for setting the comment section in YouTubes DOM. Check whether regular YouTube or YouTube feather is being used and apply the comment section appropriately. 
    setCommentSection: function (html) {
        $('#reddit').remove();
        if ($('#watch7-content').length) {
            $('#watch-discussion').remove();
            $('#watch7-content').append(html);
        } else {
            $(AlienTube.preferences.featherDescriptionPlacement ? '#ded' : '#cm').append(html);
        }
    },

    // Get a resource in the extension folder. For this to work in Firefox the resource must also be defined in main.js
    getExtensionResourcePath: function (path) {
        switch (AlienTube.getCurrentBrowserAPI()) {
        case AlienTube.browser.Safari:
            return safari.extension.baseURI + 'res/' + path;
        case AlienTube.browser.Chrome:
            return chrome.extension.getURL('res/' + path);
        case AlienTube.browser.Firefox:
            return self.options[path];
        }
    },

    // Helper function for displaying an error to the user. This should only be used when it is at a point where the script cannot continue.
    postErrorMessage: function (message) {
        AlienTube.setCommentSection(String.format(AlienTube.Strings.html.errorMessage, AlienTube.getExtensionResourcePath('error.png'), message));
    },

    startAlienTube: function () {
        //Bye Bye Google+, removing the comment section and adding our own.
        AlienTube.setCommentSection('<section id="reddit"><div class="redditSpinner"></div></section>');

        //Generate a youtube url from the browser window and perform a search for the video.
        var link = 'http://www.youtube.com/watch?v=' + $.url(window.location.href).param('v');
        AlienTube.GETRequest("https://pay.reddit.com/submit.json?url=" + encodeURIComponent(link), function (requestData) {
            try {
                var result = JSON.parse(requestData);
                if (result == '{}') {
                    AlienTube.secondSearch();
                } else {
                    //If this is a search result process the search result, if it is a direct link to a single page, process it.
                    if (result.kind == 'Listing' || result == '{}') {
                        AlienTube.searchResults = result.data.children;
                        AlienTube.secondSearch();
                    } else {
                        AlienTube.generateRedditComments(result[0], true);
                    }
                }
            } catch (e) {
                AlienTube.postErrorMessage(e);
                console.log(e);
            }
        });
    },
    // Helper function for setting a settings key. Because Safari and Firefox does not let us set settings from a content script we need to message the global page.
    setPreferencesValue: function (key, value) {
        //Update our local copy.
        AlienTube.preferences[key] = value;
        switch (AlienTube.getCurrentBrowserAPI) {
        case AlienTube.browser.Safari:
            safari.self.tab.dispatchMessage(null, {
                type: 'setSettingsValue',
                key: key,
                value: value
            });
            break;
        case AlienTube.browser.Chrome:
            chrome.storage.sync.set({
                key: value
            });
            break;
        case AlienTube.browser.Firefox:
            self.postMessage({
                type: 'setSettingsValue',
                key: key,
                value: value
            });
        }
    }
};
$(document).ready(function () {
    if (window.top === window) {
        if (AlienTube.getCurrentBrowserAPI() === AlienTube.browser.Safari) {
            //Safari's stylesheet system is fundamentally broken so we'll have to load it ourselves.
            $('head').append('<link rel="stylesheet" type="text/css" href="' + AlienTube.getExtensionResourcePath('style.css') + '">');

            var uuid = AlienTube.makeUUID();
            safari.self.addEventListener('message', function (event) {
                if (event.name == uuid) {
                    var safariPref = JSON.parse(event.message);
                    //Safari doesn't actually give us the default values for some bloody reason so this is a workaround.
                    AlienTube.preferences.hiddenCommentScoreThreshold = safariPref.hiddenCommentScoreThreshold ? safariPref.hiddenCommentScoreThreshold : -4;
                    AlienTube.preferences.wideCommentBox = safariPref.wideCommentBox ? safariPref.wideCommentBox : false;
                    AlienTube.preferences.featherDescriptionPlacement = safariPref.featherDescriptionPlacement ? safariPref.featherDescriptionPlacement : false;
                    AlienTube.preferences.disablePostHeader = safariPref.disablePostHeader ? safariPref.disablePostHeader : false;
                    AlienTube.preferences.disableTabs = safariPref.disableTabs ? safariPref.disableTabs : false;
                    AlienTube.startAlienTube();
                }
            }, false);
            safari.self.tab.dispatchMessage(uuid, {
                type: 'settings'
            });
        } else if (AlienTube.getCurrentBrowserAPI() === AlienTube.browser.Chrome) {
            AlienTube.setCommentSection('<section id="reddit"><div class="redditSpinner"></div></section>');
            chrome.storage.sync.get(null, function (settings) {
                AlienTube.preferences = settings;
                AlienTube.startAlienTube();
            });
        }
    }
});

//Wait to get our preferences from Firefox before we can continue
if (typeof (self.on) === 'function') {
    self.on("message", function (prefs) {
        if (window.top === window) {
            AlienTube.preferences = prefs;
            AlienTube.startAlienTube();
        }
    });
}

// Blob containing localisation strings and the HTML. Originally this was going to be a JSON file but Safari won't let us have nice things and can't load files.
AlienTube.Strings = {
    "localisation": {
        "en-GB": {
            "error400": "Reddit was unable to understand the request and could not complete it. If this persists please contact support.",
            "error403Safari": "The request could not be completed because Reddit says it was unauthorised. Make sure you are logged in to Reddit in this browser and that have you have \"Remember me \" enabled if you are trying to vote, publish or comment.",
            "error403": "The request could not be completed because Reddit says it was unauthorised. Make sure you are logged in to Reddit in this browser if you are trying to vote, publish or comment.",
            "error404": "The request could not be completed because the page could not be found.",
            "error500": "The request could not be completed because Reddit experienced an internal server error.",
            "error503": "The request could not be completed because Reddit is overloaded or under maintainence."
        }
    },
    "html": {
        "collapsedCommentBelowThreshold": "<div class=\"collapse\" style=\"display: block;\"><span class=\"info\"><a class=\"expandButton\" href=\"#\">[+]</a> <a href=\"http://www.reddit.com/user/{0}\" rel=\"author\" target=\"_blank\">{0}</a>   comment score below threshold</span></div>",
        "collapsedComment": "<div class=\"collapse\"><span class=\"info\"><a class=\"expandButton\" href=\"#\">[+]</a> <a href=\"http://www.reddit.com/user/{0}\" rel=\"author\" target=\"_blank\">{0}</a> {1} points <time datetime=\"{2}\">{3}</time></span></div>",
        "comment": "<article style=\"{0}\" data-id=\"{1}\"><div class=\"vote\">{2}</div><div class=\"comment\"><span class=\"info\"><a class=\"collapseButton\" href=\"#\">[-]</a> <a href=\"http://www.reddit.com/user/{3}\" rel=\"author\" target=\"_blank\">{3}</a> {4} {5} points <time datetime=\"{6}\">{7}</time> (<span class=\"upvotes\">{8}</span>|<span class=\"downvotes\">{9}</span>)</span>{10}<span class=\"commentOptions\">{11}<a href=\"{12}\" target=\"_blank\">permalink</a> <a href=\"{13}\" target=\"_blank\">parent</a> <a href=\"{14}\" target=\"_blank\">pocket</a></span></div>",
        "activeTab": "<button class=\"redditTab active border\" data-value=\"{0}\">{0}</button>",
        "tab": "<button class=\"redditTab\" data-value=\"{0}\">{0}</button>",
        "overflowButton": "<button id=\"redditOverflow\"><img class=\"yt-uix-button-arrow\" src=\"http://s.ytimg.com/yts/img/pixel-vfl3z5WfW.gif\" alt=\"\" title=\"\"><ul>",
        "header": "<header data-id=\"{0}\"><div class=\"vote\">{1}</div><div class=\"info\"><a href=\"http://reddit.com/{2}\" target=\"_blank\">{3}</a><br /><span class=\"tagline\">submitted {4} by <a href=\"http://reddit.com/u/{5}\" target=\"_blank\">{5}</a></span></div></header>",
        "mainCommentBox": "<div id=\"comment_main\" class=\"commentBox\"><div class=\"markdownFunctions\"></div><textarea rows=\"1\" cols=\"1\" class=\"textarea_comment\" id=\"textarea_comment_main\" maxlength=\"10000\"></textarea><button data-value=\"{0}\" class=\"commentSubmit\" id=\"submit_comment_main\">save</button><span class=\"redditUsername\">Commenting as:</span><div class=\"commentPreview\" id=\"commentPreview_main\"><b>Live Preview</b><h3><span class=\"commentPreview_count\" id=\"commentPreview_count_main\">0</span>/10000</h3><div class=\"commentPreviewContents\"></div></div></div>",
        "errorMessage": "<section id=\"reddit\"><div class=\"redditError\"><img src=\"{0}\" alt=\"An error has occured\" /><div><h1>An error occured.</h1><p>{1}</p></div></div></section>"
    }
};