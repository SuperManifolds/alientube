/* jslint browser: true */
/* global _, $, safari, chrome, self, SnuOwnd, Mustache */

// String.Format equivlency function for JavaScript.
String.format = function () {
    var s = arguments[0];
    var n = '';
    // Iterate over each inividual character until we reach a left curly bracket.
    for (var i = 0, len = s.length; i < len; i++) {
        if (s[i] === '{') {
            var numericKey = '';
            // Start looking ahead for numbers and add them up to get the key.
            for (var j = i + 1; j < len; j++) {
                if (!isNaN(s[j])) {
                    numericKey += s[j];
                    // We have hit a right curly bracket. Build the argument key and add the argument string.
                } else if (s[j] === '}') {
                    n += arguments[parseInt(numericKey, 10) + 1];
                    i = j++;
                    break;
                    // We have hit a syntax error, invalidate it and treat it as regular text.
                } else {
                    n += s[i];
                    break;
                }
            }
        } else {
            n += s[i];
        }
    }
    return n;
};

var AlienTube = {
    Preferences: {},
    SearchResults: [],
    BannedSubreddits: ["alientube"],
    lastLocation: "",
    Template: '',
    Strings: "",
    CurrentVideo: '',
    Browser: {
        "Safari": 0,
        "Chrome": 1,
        "Firefox": 2,
        "Opera": 3
    },

    getUrlRequestObject : function(name) {
        if (window.location.search.length > 0) {
            var s = window.location.search.substring(1);
            var requestObjects = s.split('&');
            for (var i = 0, len = requestObjects.length; i < len; i++) {
                var obj = requestObjects[i].split('=');
                if (obj[0] === name) {
                    return obj[1];
                }
            }
        }
        return null;
    },

    traverseTree : function(post, result) {
        var obj = $.extend({}, post.data);
        obj.score = obj.ups - obj.downs;
        obj.voted = (obj.likes !== null);
        obj.hiddenByDefault = (obj.score <= AlienTube.Preferences.hiddenCommentScoreThreshold);
        obj.datetime = new Date(obj.created_utc * 1000).toISOString();
        obj.timestamp = AlienTube.timeAgoFromEpochTime(obj.created_utc);
        obj.signedin = (AlienTube.Preferences.modhash !== null && AlienTube.Preferences.modhash.length > 0);
        obj.parentid = obj.parent_id.substring(3);
        obj.authorDeleted = (obj.author == '[deleted]');
        obj.encodedPermalink = encodeURIComponent('http://www.reddit.com' + result.permalink);
        // Check whether the comment is older than 180 days, in which case it can no longer be replied to and is in what Reddit calls "preserved" status.
        obj.preserved = ((((new Date()).getTime() / 1000) - obj.created_utc) >= 15552000);
        obj.traverse = AlienTube.Template;
        obj.replies = [];
        obj.html = '<div class="md">' + SnuOwnd.getParser().render(obj.body) + '</div>';
        if (post.data.replies !== null && post.data.replies.length !== 0 && typeof(post.data.replies) !== 'undefined') {
            $.each(post.data.replies.data.children, function (key, value) {
                if (value.data.body) {
                    obj.replies.push(AlienTube.traverseTree(value, result));
                }
            });
        }
        return obj;
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
    GETRequest: function (url, callback, noHandle) {
        console.log("GET request");
        switch (AlienTube.getCurrentBrowserAPI()) {
            case AlienTube.Browser.Safari:
                var uuid = AlienTube.makeUUID();
                safari.self.addEventListener('message', function (event) {
                    if (event.name == uuid) {
                        var xhr = JSON.parse(event.message);
                        if (noHandle) {
                            callback(xhr.responseText);
                        } else {
                            AlienTube.handleXhrCallbacks(xhr, xhr.responseText, callback);
                        }
                    }
                }, false);
                safari.self.tab.dispatchMessage(uuid, {
                    type: 'GETRequest',
                    url: url
                });
                break;
            case AlienTube.Browser.Chrome:
            case AlienTube.Browser.Firefox:
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.withCredentials = true;
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == 4) {
                        if (noHandle) {
                            callback(xhr.responseText);
                        } else {
                            AlienTube.handleXhrCallbacks(xhr, xhr.responseText, callback);
                        }
                    }
                };
                xhr.send();
                break;
        }
    },

    //Universal AJAX (POST) request Callback between browsers. For Safari we must make a request to the global page because Safari does not allow us to make these in a content script.
    POSTRequest: function (url, data, callback) {
        console.log("POST request");
        switch (AlienTube.getCurrentBrowserAPI()) {
            case AlienTube.Browser.Safari:
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
            case AlienTube.Browser.Chrome:
            case AlienTube.Browser.Firefox:
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
        var errorMessage = AlienTube.getLocalisation('error' + xhr.status);
        var acceptableResponses = [200, 201, 202, 301, 302, 303, 0];
        console.log(xhr);
        if (acceptableResponses.indexOf(xhr.status) !== -1 || !xhr.status) {
            callback(response);
        } else if (xhr.status == 403) {
            if (AlienTube.getCurrentBrowserAPI() == AlienTube.Browser.Safari) {
                AlienTube.postErrorMessage(AlienTube.formatHTTPErrorMessage(xhr, AlienTube.getLocalisation('error403Safari')), 'overload.png');
            } else {
                AlienTube.postErrorMessage(AlienTube.formatHTTPErrorMessage(xhr, errorMessage), 'overload.png');
            }
        } else {
            AlienTube.postErrorMessage(AlienTube.formatHTTPErrorMessage(xhr, errorMessage));
        }
    },

    // Helper function for formatting the error messages.
    formatHTTPErrorMessage: function (error, message) {
        if (typeof (message) !== 'undefined') {
            return '<b>' + error.status + '</b> (' + error.statusText + '): ' + message;
        } else {
            return '<b>' + error.status + '</b> (' + error.statusText + ')';
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
            return secs + (secs > 1 ? ' seconds' : ' second') + ' ago';
        }
        var hours = minutes / 60;
        minutes = Math.floor(minutes % 60);
        if (hours < 1) {
            return minutes + (minutes > 1 ? ' minutes' : ' minute') + ' ago';
        }
        var days = hours / 24;
        hours = Math.floor(hours % 24);
        if (days < 1) {
            return hours + (hours > 1 ? ' hours' : ' hour') + ' ago';
        }
        var weeks = days / 7;
        days = Math.floor(days % 7);
        if (weeks < 1) {
            return days + (days > 1 ? ' days' : ' day') + ' ago';
        }
        var months = weeks / 4.35;
        weeks = Math.floor(weeks % 4.35);
        if (months < 1) {
            return weeks + (weeks > 1 ? ' weeks' : ' week') + ' ago';
        }
        var years = months / 12;
        months = Math.floor(months % 12);
        if (years < 1) {
            return months + (months > 1 ? ' months' : ' month') + ' ago';
        }
        years = Math.floor(years);
        return years + (years > 1 ? ' years' : ' years') + ' ago';
    },

    // Helper function for getting localisation strings. This is not widely used yet and is more of a thing for the future. Language is hardcoded because there is only one available.
    getLocalisation: function (key) {
        return AlienTube.Strings.localisation['en-GB'][key];
    },

    //Generates the reddit comment frame and tabs
    generateRedditComments: function (results) {
        //Create tabs for all available threads.
        var output = '';
        if (!AlienTube.Preferences.disableTabs) {
            console.log(results);
            output += '<div id=\"redditTabs\">' + Mustache.render(AlienTube.Template, {tab: true, active: true, subreddit: results[0].subreddit});
            // Calculate the number of tabs we can display by adding the width of the chrome (43px) with the average width of a text character times subreddit length.
            var width = (21 + results[0].subreddit.length * 7);
            var len = results.length;
            if (len > 1) {
                var i;
                for (i = 1; i < len; i++) {
                    width = width + (21 + (results[i].subreddit.length * 7));
                    if (width >= 550) {
                        break;
                    }
                    // Get the HTML for the tabs.
                    output += Mustache.render(AlienTube.Template, {tab: true, subreddit: results[i].subreddit});
                }
                if (i < len) {
                    // Create the overflow tab ad the overflow menu. I decided to handle this with javascript rather than the regular CSS hover menu trick because I found it popping up on mouseover annoying.
                    var items = '';
                    for (i = i; i < len; i++) {
                        items += Mustache.render(AlienTube.Template, {overflowItem: true, subreddit: results[i].subreddit});
                    }
                    output += Mustache.render(AlienTube.Template, {
                        overflow: true,
                        items: items
                    });
                    output += '</ul></button>';
                }
            }

            if ($('#watch-discussion').length) {
                output += Mustache.render(AlienTube.Template, {googleplus: true, imageurl: AlienTube.getExtensionResourcePath('gplus.png')});
            }
            output += '</div>';
        }
        output += '<div id="rcomments"></div></section>';
        // Insert the generated HTML into the DOM.
        $('#reddit').html(output);

        // Handle changing of tabs.
        $('.redditTab').click(function (e) {
            $('#watch-discussion').hide();
            $('#rcomments').show();
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
        //Handle Google Plus button event
        $('.at_gplus').click(function () {
            $('.redditTab.active').removeClass('active');
            $('#watch-discussion').show();
            $('#rcomments').hide();
            setTimeout(function() {
                $('#watch-discussion').hide();
                setTimeout(function() {
                    $('#watch-discussion').show();
                }, 250);
            }, 250);
        });
        // Handle overflow menu events
        $('#redditOverflow').click(function (e) {
            $('#watch-discussion').hide();
            $('#rcomments').show();
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
            $('#redditTabs').prepend(Mustache.render(AlienTube.Template, {tab: true, active: true, subreddit: subreddit}));
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
        // Download the first result.
        AlienTube.loadCommentsForPost(results[0]);
    },

    // Helper function for downloading the data for a specific post.
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

    //Processes the results of both searches.
    processSearchResults: function () {
        //If there is a link to a subreddit or a reddit post in the video description we will prioritise it.
        var preferedSubreddit = null;
        var preferedPost = null;
        $('#eow-description a').each(function () {
            var url = $(this).attr('href');
            if (typeof(url) !== 'undefined') {
                var mRegex = /(?:http|https):\/\/(.[^/]+)\/r\/([A-Za-z0-9][A-Za-z0-9_]{2,20})(?:\/comments\/)?([A-Za-z0-9]*)/g;
                var match = mRegex.exec(url);
                if (match) {
                    preferedSubreddit = match[2];
                    if (match[3].length > 0) preferedPost = match[3];
                }
            }
        });
        var sortedArray = {};
        // Retrieve the best thread from each subreddit by adding together the comments and scores then comparing.
        AlienTube.SearchResults.forEach(function(thread) {
            if (!sortedArray.hasOwnProperty(thread.subreddit)) sortedArray[thread.subreddit] = [];
            sortedArray[thread.subreddit].push(thread);
        });
        var topItemOfSubreddits = [];
        $.each(sortedArray, function (index, value) {
            topItemOfSubreddits.push(value.reduce(function (a, b) {
                return ((a.score + (a.num_comments*3)) > (b.score + (b.num_comments*3)) || b.id === preferedPost) ? a : b;
            }));
        });
        // Sort the result accordingly with the top being the highest score, and select the item with the highest score and comment accumelence as the default thread.
        topItemOfSubreddits.sort(function (a, b) {
            if (b.subreddit == preferedSubreddit && b.id == preferedPost) {
                return 1;
            } else if (b.subreddit == preferedSubreddit) {
                return 1;
            } else {
                return ((b.score + (b.num_comments*3)) - (a.score + (a.num_comments*3)));
            }
        });
        AlienTube.generateRedditComments(topItemOfSubreddits);
    },

    // Generates the HTML for the comment section itself
    generateCommentsForPost: function (result) {
        var currentModhash = AlienTube.Preferences.modhash;
        AlienTube.Preferences.modhash = result[0].data.modhash;
        var output = "";
        var postInfo = result[0].data.children[0].data;
        var preserved = ((((new Date()).getTime() / 1000) - postInfo.created_utc) >= 15552000);
        // Create header for the article, this is the post arrows, title, and post information.
        postInfo.header = true;
        postInfo.score = postInfo.ups - postInfo.downs;
        postInfo.voted = (postInfo.likes !== null);
        postInfo.preserved = preserved;
        postInfo.timestamp = AlienTube.timeAgoFromEpochTime(postInfo.created_utc);
        postInfo.signedin = (AlienTube.Preferences.modhash !== null && AlienTube.Preferences.modhash.length > 0);
        postInfo.encodedPermalink = encodeURIComponent('http://www.reddit.com' + result.permalink);
        postInfo.authorDeleted = (postInfo.author == '[deleted');
        if (!AlienTube.Preferences.disablePostHeader) {
            output += Mustache.render(AlienTube.Template, postInfo);
        }
        // Create post comment box
        if (AlienTube.Preferences.modhash && !preserved) {
            output += Mustache.render(AlienTube.Template, {commentBox: true});
        }
        var tree = [];
        $.each(result[1].data.children, function (key, value) {
            if (value.data.body) {
                tree.push(AlienTube.traverseTree(value, postInfo));
            }
        });
        // Start traversing down the comment section through mustache.
        output += Mustache.render('{{>traverse}}', {replies: tree}, { traverse: AlienTube.Template });
        $('#rcomments').html(output);

        // Because of limitations of the Reddit API we will have to call a different page to find out who we are posting as. This is done asynchroniously as to not hold back the rest of the plugin or page. We will only do this if the modhash has changed, in which we know there is a different user or the user has logged in/out.
        if (AlienTube.Preferences.modhash) {
            if (currentModhash !== result[0].data.modhash) {
                AlienTube.setPreferencesValue('modhash', result[0].data.modhash);
                AlienTube.GETRequest('https://pay.reddit.com/api/me.json', function (data) {
                    var json = JSON.parse(data);
                    AlienTube.setPreferencesValue('username', json.data.name);
                    $('.redditUsername').html('Commenting as: <b>' + json.data.name + '</b>');
                });
            } else {
                $('.redditUsername').html('Commenting as: <b>' + AlienTube.Preferences.username + '</b>');
            }
            if (AlienTube.Preferences.minimiseCommentBox) {
                $('#comment_main').hide();
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
                uh: AlienTube.Preferences.modhash
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
                uh: AlienTube.Preferences.modhash
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

        // Handle comment box minimise/expand
        $('.commentTo').click(function () {
            if ($('#comment_main').is(':visible')) {
                $('#comment_main').hide();
            } else {
                $('#comment_main').show();
            }
        });

        //Handle refresh button
        $('.refresh').click(function () {
            AlienTube.loadCommentsForPost(data);
        });
        // Bind reply button event
        $('.replyTo').click(function () {
            if ($(this).closest('.comment').children('.commentBox').length === 0) {
                $(this).closest('.comment').append(Mustache.render(AlienTube.Template, {commentBox: true, reply: true, username: AlienTube.Preferences.username}));
                AlienTube.bindCommentEvents(data);
            }
        });

        // Bind event for content changing in the comment box for hiding or showing the preview box. As well as updating the contents of the preview.
        $('.textarea_comment').bind('input propertychange', function () {
            if (this.value === 'DUCKS!!!') {
                $('body').append('<img class="duck" src="' + AlienTube.getExtensionResourcePath('duck.png') + '" alt="BEWARE THE DUCKS!!!" />');
                setTimeout(function() {
                    $('.duck').remove();
                }, 10000);
            }
            $(this).parent().find('.commentPreviewContents').html(SnuOwnd.getParser().render(this.value));
            $(this).parent().find('.commentPreview_count').text(this.value.length);
            if (this.value.length > 0) {
                $(this).parent().find('.commentPreview').show();
            } else {
                $(this).parent().find('.commentPreview').hide();
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
        // Bind event for comment cancel submit.
        $('.commentCancel').click(function () {
            $(this).closest('.commentBox').remove();
        });
        // Bind event for comment and post voting. I decided to process it both for comments and posts here to avoid duplicate code.
        $('.arrow').click(function (e) {
            var id = $(e.target).closest('article').attr('data-id');
            var preserved = ($(e.target).closest('.vote').attr('data-preserved') === 'true');
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
                        if (!preserved) {
                            $(e.target).next().text(parseInt($(e.target).next().text(), 10) - 1);
                        }
                    } else {
                        var target = $(e.target).parent().next().children('.info').children('.upvotes');
                        if (!preserved) {
                            target.text(parseInt(target.text(), 10) - 1);
                        }
                    }
                });
                // The comment/post is already downvoted and the user is clicking on the down arrow. This means they want to remove their vote.
            } else if ($(e.target).hasClass('downmod')) {
                AlienTube.castVote(id, 0, function () {
                    $(e.target).addClass('down');
                    $(e.target).removeClass('downmod');
                    if (isPost) {
                        $(e.target).prev().removeClass('disliked');
                        if (!preserved) {
                            $(e.target).prev().text(parseInt($(e.target).prev().text(), 10) + 1);
                        }
                    } else {
                        var target = $(e.target).parent().next().children('.info').children('.downvotes');
                        if (!preserved) {
                            target.text(parseInt(target.text(), 10) - 1);
                        }
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
                        if (!preserved) {
                            $(e.target).next().text(parseInt($(e.target).next().text(), 10) + (isModified ? 2 : 1));
                        }
                    } else {
                        var target = $(e.target).parent().next().children('.info').children('.upvotes');
                        if (!preserved) {
                            target.text(parseInt(target.text(), 10) + 1);
                        }
                        if (isModified && !preserved) {
                            var opTarget = $(e.target).parent().next().children('.info').children('.downvotes');
                            opTarget.text(parseInt(opTarget.text(), 10) - 1);
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
                        $(e.target).prev().text(parseInt($(e.target).prev().text(), 10) - (isModified ? 2 : 1));
                    } else {
                        var target = $(e.target).parent().next().children('.info').children('.downvotes');
                        target.text(parseInt(target.text(), 10) + 1);
                        if (isModified && !preserved) {
                            var opTarget = $(e.target).parent().next().children('.info').children('.upvotes');
                            opTarget.text(parseInt(opTarget.text(), 10) - 1);
                        }
                    }
                });
            }
        });
    },

    // Helper function for setting the comment section in YouTubes DOM. Check whether regular YouTube or YouTube feather is being used and apply the comment section appropriately.
    setCommentSection: function (html) {
        $('#reddit').remove();
        if ($('#watch-discussion').length) {
            $('#watch-discussion').hide();
            $('#watch-discussion').before(html);
        } else {
            $(AlienTube.Preferences.featherDescriptionPlacement ? '#ded' : '#cm').append(html);
        }
    },

    // Get a resource in the extension folder. For this to work in Firefox the resource must also be defined in main.js
    getExtensionResourcePath: function (path) {
        switch (AlienTube.getCurrentBrowserAPI()) {
            case AlienTube.Browser.Safari:
                return safari.extension.baseURI + 'res/' + path;
            case AlienTube.Browser.Chrome:
                return chrome.extension.getURL('res/' + path);
            case AlienTube.Browser.Firefox:
                return self.options[path];
            default:
                return null;
        }
    },

    // Helper function for displaying an error to the user. This should only be used when it is at a point where the script cannot continue.
    postErrorMessage: function (message, image) {
        if (!image) {
            image = 'error.png';
        }
        AlienTube.setCommentSection(Mustache.render(AlienTube.Template, {
            error: true,
            gplus_imageurl: AlienTube.getExtensionResourcePath('gplus.png'),
            imagelink: AlienTube.getExtensionResourcePath(image),
            errormsg: message
        }));
        $('.at_gplus').click(function () {
            $('#watch-discussion').show();
            setTimeout(function() {
                $('#watch-discussion').hide();
                setTimeout(function() {
                    $('#watch-discussion').show();
                }, 250);
            }, 250);
        });
        $('#at_retry').click(function() {
            AlienTube.startAlienTube();
        });
    },

    startAlienTube: function () {
        var videoID =  AlienTube.getUrlRequestObject('v');
        if (typeof(videoID) === null) {
            return;
        }
        AlienTube.SearchResults = [];
        AlienTube.CurrentVideo = videoID;
        //Bye Bye Google+, removing the comment section and adding our own.
        AlienTube.setCommentSection('<section id="reddit"><div class="redditSpinner"></div></section>');
        //Generate a youtube url from the browser window and perform a search for the video.
        AlienTube.GETRequest("https://pay.reddit.com/search.json?q=" + encodeURIComponent("url:'/watch?v=" + videoID + "' (site:youtube.com OR site:youtu.be)"), function (requestData) {
            try {
                var result = JSON.parse(requestData);
                if (result == '{}' || result.kind !== 'Listing' || result.data.children.length === 0) {
                    AlienTube.setCommentSection('<section id="reddit"><p class="redditSingleMessage">No posts found</p></section>');
                    if ($('#watch-discussion').length && !AlienTube.Preferences.dontShowGplus) {
                        $('#watch-discussion').show();
                    }
                } else {
                    // Reddit's search is a bit stupid so we have to validate the the link of posts to make sure it is actually going to this video.
                    var currentRequestObject = AlienTube.getUrlRequestObject("v");
                    $.each(result.data.children, function (index, value) {
                        if (AlienTube.BannedSubreddits.indexOf(value.data.subreddit) === -1 && (value.data.ups - value.data.downs) > AlienTube.Preferences.hiddenPostsScoreThreshold) {
                            if (value.data.domain === "youtube.com") {
                                var urlSearch = value.data.url.substring(value.data.url.indexOf("?") +1);
                                var requestObjects = urlSearch.split('&');
                                for (var i = 0, len = requestObjects.length; i < len; i++) {
                                    var obj = requestObjects[i].split('=');
                                    if (obj[0] === "v" && obj[1] === currentRequestObject) {
                                        AlienTube.SearchResults.push(value.data);
                                    }
                                }
                            } else if (value.data.domain === "youtu.be") {
                                var urlSearch = value.data.url.substring(value.data.url.indexOf("/") + 1);
                                var obj = urlSearch.split('?');
                                if (obj[0] === currentRequestObject) {
                                    AlienTube.SearchResults.push(value.data);
                                }
                            }
                        }
                    });
                    if (AlienTube.SearchResults.length > 0) {
                        AlienTube.processSearchResults();
                    } else {
                        AlienTube.setCommentSection('<section id="reddit"><p class="redditSingleMessage">No posts found</p></section>');
                        if ($('#watch-discussion').length && !AlienTube.Preferences.dontShowGplus) {
                            $('#watch-discussion').show();
                        }
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
        AlienTube.Preferences[key] = value;
        switch (AlienTube.getCurrentBrowserAPI) {
            case AlienTube.Browser.Safari:
                safari.self.tab.dispatchMessage(null, {
                    type: 'setSettingsValue',
                    key: key,
                    value: value
                });
                break;
            case AlienTube.Browser.Chrome:
                chrome.storage.sync.set({
                    key: value
                });
                break;
            case AlienTube.Browser.Firefox:
                self.postMessage({
                    type: 'setSettingsValue',
                    key: key,
                    value: value
                });
        }
    },
    startListener: function () {
        $('body').on('DOMNodeInserted', '#watch-discussion', function(e) {
            console.log('Dom insertion event');
            if (($(e.target).is('iframe') || $(e.target).attr('class') === 'comments-disabled') && (document.getElementById('reddit') === null || window.location.href !== AlienTube.lastLocation)) {
                AlienTube.lastLocation = window.location.href;
                AlienTube.startAlienTube();
            }
        });
    }
};
$(document).ready(function () {
    if (window.top === window) {
        // If we are on the AlienTube website. Send the installed message and stop all execution
        if (window.location.host === 'alientube.co') {
            $("meta[name='alientube:installed']").attr("content", "true");
            return;
        }
        if (AlienTube.getCurrentBrowserAPI() === AlienTube.Browser.Firefox) {
            self.on("message", function (msg) {
                if (window.top === window) {
                    AlienTube.Preferences = msg.preferences.prefs;
                    AlienTube.Preferences.hiddenCommentScoreThreshold = parseInt(AlienTube.Preferences.hiddenCommentScoreThreshold, 10) || -5;
                    AlienTube.Preferences.hiddenPostsScoreThreshold = parseInt(AlienTube.Preferences.hiddenPostsScoreThreshold, 10) || -4;
                    AlienTube.Template = msg.template;
                    Mustache.parse(AlienTube.Template);
                    AlienTube.Strings = JSON.parse(msg.localisation);
                    AlienTube.startListener();
                }
            });
        } else {
            //Load mustache template file.
            var loadTemplateFile = $.Deferred();
            AlienTube.GETRequest(AlienTube.getExtensionResourcePath('templates.mustache'), function(result) {
                AlienTube.Template = result;
                Mustache.parse(AlienTube.Template);
                loadTemplateFile.resolve();
            }, true);
            var loadLocalisationFile = $.Deferred();
            AlienTube.GETRequest(AlienTube.getExtensionResourcePath('strings.json'), function(result) {
                AlienTube.Strings = JSON.parse(result);
                loadLocalisationFile.resolve();
            }, true);
            $.when(loadTemplateFile, loadLocalisationFile).done(function() {
                // All ressources as been loaded.
                if (AlienTube.getCurrentBrowserAPI() === AlienTube.Browser.Safari) {
                    //Safari's stylesheet system is fundamentally broken so we'll have to load it ourselves.
                    $('head').append('<link rel="stylesheet" type="text/css" href="' + AlienTube.getExtensionResourcePath('style.css') + '">');

                    var uuid = AlienTube.makeUUID();
                    safari.self.addEventListener('message', function (event) {
                        if (event.name == uuid) {
                            var safariPref = JSON.parse(event.message);
                            //Safari doesn't actually give us the default values for some bloody reason so this is a workaround.
                            AlienTube.Preferences.hiddenPostsScoreThreshold = safariPref.hiddenPostsScoreThreshold || -5;
                            AlienTube.Preferences.hiddenCommentScoreThreshold = safariPref.hiddenCommentScoreThreshold || -4;
                            AlienTube.Preferences.featherDescriptionPlacement = safariPref.featherDescriptionPlacement || false;
                            AlienTube.Preferences.disablePostHeader = safariPref.disablePostHeader || false;
                            AlienTube.Preferences.disableTabs = safariPref.disableTabs || false;
                            AlienTube.Preferences.minimiseCommentBox = safariPref.minimiseCommentBox || false;
                            AlienTube.Preferences.dontShowGplus = safariPref.dontShowGplus || false;
                            AlienTube.startListener();
                        }
                    }, false);
                    safari.self.tab.dispatchMessage(uuid, {
                        type: 'settings'
                    });
                } else if (AlienTube.getCurrentBrowserAPI() === AlienTube.Browser.Chrome) {
                    chrome.storage.sync.get(null, function (settings) {
                        AlienTube.Preferences = settings;
                        AlienTube.Preferences.hiddenCommentScoreThreshold = parseInt(AlienTube.Preferences.hiddenCommentScoreThreshold, 10) || -5;
                        AlienTube.Preferences.hiddenPostsScoreThreshold = parseInt(AlienTube.Preferences.hiddenPostsScoreThreshold, 10) || -4;
                        AlienTube.startListener();
                    });
                }
            });
        }
    }
});
