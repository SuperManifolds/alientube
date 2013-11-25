/* jslint browser: true */
/* global _,$,jQuery,safari,chrome, Raven */

// String.Format equivlency function for Javascript
String.format = function() {
    var s = arguments[0];
    for (var i = 0; i < arguments.length - 1; i++) {       
        var reg = new RegExp("\\{" + i + "\\}", "gm");             
        s = s.replace(reg, arguments[i + 1]);
    }
    return s;
};

var AlienTube = {
    preferences : {},
    
    //Url for sending error reports via Raven.
    ravenLoggingUrl : '',
    
    searchResults : [],
    //Looping function used to traverse down the tree of replies
    traverseComment : function(data) {
        var output = AlienTube.getCommentAsHTML(data);
        //Does this comment have replies? 
        if (data.replies !== null && data.replies.length !== 0 && data.replies !== undefined) {
            output += '<div class="replies">';
            //Loop through replies, validate them and continue down the tree.
            $.each(data.replies.data.children, function(index, value) {
                if (value.data.body !== undefined) { output += AlienTube.traverseComment(value.data); }
            });
            output += '</div>';
        }
        output += '</article>';
        return output;
    },
    
    //Universal XHTML Callback between browsers
    GETRequest : function(url, callback) {
        if (typeof(safari) !== 'undefined') {
            var uuid = AlienTube.makeUUID();
            safari.self.addEventListener('message', function(event) {
                if (event.name == uuid) {
                    callback(event.message);
                }
            }, false);
            safari.self.tab.dispatchMessage(uuid, {type: 'GETRequest', url: url});
        } else if (typeof(chrome) !== 'undefined') {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.withCredentials = true;
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    callback(xhr.responseText);
                }
            };
            xhr.send();
        }
    },
    
    POSTRequest : function(url, data, callback) {
        if (typeof(safari) !== 'undefined') {
            var uuid = AlienTube.makeUUID();
            safari.self.addEventListener('message', function(event) {
                if (event.name == uuid) {
                    callback(event.message);
                }
            }, false);
            safari.self.tab.dispatchMessage(uuid, {type: 'POSTRequest', url: url, data: $.param(data)});
        } else if (typeof(chrome) !== 'undefined') {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", url, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    callback(xhr.responseText);
                }
            };
            xhr.send($.param(data));
        }
    },
    
    makeUUID : function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    },
    
    //Convert Unix Timestamp to a Reddit-style elapsed time timestamp.
    timeAgoFromEpochTime : function(epoch) {
        var secs = ((new Date()).getTime() / 1000) - epoch;
        Math.floor(secs);
        var minutes = secs / 60;
        secs = Math.floor(secs % 60);
        if (minutes < 1) { return secs + (secs > 1 ? ' seconds ago' : ' second ago'); }
        var hours = minutes / 60;
        minutes = Math.floor(minutes % 60);
        if (hours < 1) { return minutes + (minutes > 1 ? ' minutes ago' : ' minute ago'); }
        var days = hours / 24;
        hours = Math.floor(hours % 24);
        if (days < 1) { return hours + (hours > 1 ? ' hours ago' : ' hour ago'); }
        var weeks = days / 7;
        days = Math.floor(days % 7);
        if (weeks < 1) { return days + (days > 1 ? ' days ago' : ' day ago'); }
        var months = weeks / 4.35;
        weeks = Math.floor(weeks % 4.35);
        if (months < 1) { return weeks + (weeks > 1 ? ' weeks ago' : ' week ago'); }
        var years = months / 12;
        months = Math.floor(months % 12);
        if (years < 1) { return months + (months > 1 ? ' months ago' : ' month ago'); }
        years = Math.floor(years);
        return years + (years > 1 ? ' years ago' : ' years ago');
    },
    
    //Generate a single comment as HTML. Because reddit does for some reason only the heavens know not provide us with a score we must calculate it ourselves.
    getCommentAsHTML : function(data) {
        var time = AlienTube.timeAgoFromEpochTime(data.created_utc);
        var comment = "";
        var threshold = AlienTube.preferences.hiddenCommentScoreThreshold;
        var html = $("<div/>").html(data.body_html).text().replace('href="/', 'target="_blank" href="http://reddit.com/');
        if (!threshold) { threshold = -4; }
        
        //Create replacement item for collapsed comments. Check if a comment is below the treshold and should be hidden by default.
        if ((data.ups - data.downs) <= threshold) {
            comment = String.format('<div class="collapse" style="display: block;"><span class="info"><a class="expandButton" href="#">[+]</a> <a href="http://www.reddit.com/user/{0}" rel="author" target="_blank">{0}</a>   comment score below threshold</span></div>', 
                                    data.author);
        } else {
            comment = String.format('<div class="collapse"><span class="info"><a class="expandButton" href="#">[+]</a> <a href="http://www.reddit.com/user/{0}" rel="author" target="_blank">{0}</a> {1} points <time datetime="{2}">{3}</time></span></div>', 
                                    data.author,
                                    data.ups - data.downs,
                                    new Date(data.created_utc * 1000).toISOString(),
                                    time);
        }
        //Create the real comment.
        comment += String.format('<article style="{0}" data-id="{1}"><div class="vote">{2}</div><div class="comment"><span class="info"><a class="collapseButton" href="#">[-]</a> <a href="http://www.reddit.com/user/{3}" rel="author" target="_blank">{3}</a> {4} {5} points <time datetime="{6}">{7}</time> (<span class="upvotes">{8}</span>|<span class="downvotes">{9}</span>)</span>{10}</div>',
                                 (data.ups - data.downs) <= -4 ? 'display: none;' : "",
                                 data.name,
                                 AlienTube.getCommentVotingHTML(data),
                                 data.author,
                                 data.author_flair_text !== null ? '<span class="flair">'+data.author_flair_text+'</span>' : "",
                                 data.ups - data.downs,
                                 new Date(data.created_utc * 1000).toISOString(),
                                 time,
                                 data.ups,
                                 data.downs,
                                 html);
        return comment;
    },
    
    getCommentVotingHTML : function(data) {
        var output = '';
        output += data.likes === true ? '<div class="arrow upmod"></div>' : '<div class="arrow up"></div>';
        output += data.likes === false ? '<div class="arrow downmod"></div>' : '<div class="arrow down"></div>';
        return output;
    },
    
    getPostVotingHTML : function(data) {
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
    
    //Generates the reddit comment box
    getRedditComments : function(result, results) {
        console.log(result);
        AlienTube.preferences.modhash = result[0].data.modhash;
        //Create tabs for all available threads.
        var output = '';
        if (!AlienTube.preferences.disableTabs) {
            output += String.format('<div id="redditTabs"><button class="redditTab active border" data-value="{0}">/r/{0}</button>', result[0].data.children[0].data.subreddit);
            if (results !== undefined) {
                if (results.length > 1) {
                    for (var i = 1; (i < results.length && i <= 4); i++) {
                        output += String.format('<button class="redditTab" data-value="{0}">/r/{0}</button>', results[i].subreddit);
                    }
                }
            }
            output += '</div>';
        }
        
        if (!AlienTube.preferences.disablePostHeader) {
            output += String.format('<header data-id="{0}"><div class="vote">{1}</div><a href="http://reddit.com/{2}" target="_blank">{3}</a></header>',
                                    result[0].data.children[0].data.name,
                                    AlienTube.getPostVotingHTML(result[0].data.children[0].data),
                                    result[0].data.children[0].data.permalink,
                                    result[0].data.children[0].data.title);
        }
        
        output += '<div id="rcomments">';
        //Loop through top level comments, validate them, and start down the tree.
        $.each(result[1].data.children, function(index, value) {
            if (value.data.body !== undefined) { output += AlienTube.traverseComment(value.data); }
        });
        output += '</div></section>';
        $('#reddit').html(output);
        AlienTube.bindCommentEvents();
        //Handle changing of tabs.
        $('#redditTabs button').click(function(e){
            var target = e.target;
            var targetid = $(this).attr("data-value");
            //User may have clicked the text inside, instead of the button, check if it is parent we want instead.
            if (targetid === undefined) {
                targetid = $(this).parent().attr('data-value');
                target = $(e.target).parent();
            }
            if (!$(target).hasClass('active')) {
                //Set the clicked button as active and start loading the comments for this tab.
                $('#redditTabs').children('button').each(function () {
                    if ($(this).hasClass('active')) {$(this).removeClass('active');}
                });
                $(target).addClass('active');
                var data = results.filter(function(e) {
                    return e.subreddit == targetid;
                });
                AlienTube.loadCommentsForSubreddit(data[0]);
                
            }
        });
    },
    
    secondSearch : function() {
        /* Reddit's search function distinguishes between the http and https version of a youtube link and does not suport wildcards.
           Unfortunately this means we will have to check both, this function performs the second search. */
        var link = 'https://www.youtube.com/watch?v=' + $.url(window.location.href).param('v');
        AlienTube.GETRequest("https://pay.reddit.com/submit.json?url=" + encodeURIComponent(link), function(requestData) {
            try {
                var result = JSON.parse(requestData);
                if (result == '{}') {
                    if (AlienTube.searchResults.length !== undefined) {
                        AlienTube.processSearchResults();
                    } else {
                        $('.redditSpinner').remove();
                        AlienTube.setCommentSection('<p class="redditSingleMessage">No posts found</p>');
                    }
                } else {
                    //If this is a search result process the search result, if it is a direct link to a single page, process it.
                    if (result.kind == 'Listing') {
                        AlienTube.searchResults = AlienTube.searchResults.concat(result.data.children);
                        AlienTube.processSearchResults();
                    } else {
                        if (result[1].data.children.length > 0) {
                            AlienTube.getRedditComments(result);
                        } else {
                            $('.redditSpinner').remove();
                            AlienTube.setCommentSection('<section id="reddit"><p class="redditSingleMessage">No posts with comments found</p></section>');
                        }
                    }
                }
            } catch (e) {
                if (AlienTube.ravenLoggingUrl.length > 0 && AlienTube.preferences.enableAutomaticErrorReporting) {
                    Raven.captureException(e);
                }
                AlienTube.postErrorMessage(e);
                console.log(e);
            }
        });
    },
    
    //Processes the results of both searches.
    processSearchResults: function() {
        var numArray = [];
        //Remove threads with no comments. In the future we will handle this by suggesting the user makes a comment.
        $.each(AlienTube.searchResults, function(index, value){
            if (value.data.num_comments > 0) { numArray.push(value.data); }
        });
        if (numArray.length === 0) {
            $('.redditSpinner').remove();
            AlienTube.setCommentSection('<section id="reddit"><p class="redditSingleMessage">No posts with comments found</p></section>');
        } else {
            //Retrieve the best thread from each subreddit by adding together the comments and scores then comparing.
            numArray = _.groupBy(numArray, 'subreddit'); 
            var topItemOfSubreddits = [];
            $.each(numArray, function(index, value) {
                topItemOfSubreddits.push(value.reduce(function(a, b) { return (a.score + a.num_comments) > (b.score + b.num_comments) ? a : b; }));
            });
            //Sort the result accordingly with the top being the highest score, and select the item with the highest score and comment accumelence as the default thread.
            topItemOfSubreddits.sort(function(a,b){return (b.score + b.num_comments) - (a.score + a.num_comments); });
            var subReddit = topItemOfSubreddits[0].subreddit;
            var article = topItemOfSubreddits[0].id;
            //Generate Comment box
            AlienTube.GETRequest(String.format("https://pay.reddit.com/r/{0}/comments/{1}.json", subReddit, article), function(requestData) {
                try {
                    var result = JSON.parse(requestData);
                    AlienTube.getRedditComments(result, topItemOfSubreddits);
                }
                catch (e) {
                    if (AlienTube.ravenLoggingUrl.length > 0 && AlienTube.preferences.enableAutomaticErrorReporting) {
                        Raven.captureException(e);
                    }
                    AlienTube.postErrorMessage(e);
                    console.log(e);
                }
            });
        }
    },
    
    //Loads the content of alternate tabs.
    loadCommentsForSubreddit : function (data) {
        var link = String.format("https://pay.reddit.com/r/{0}/comments/{1}.json", data.subreddit, data.id);
        AlienTube.GETRequest(link, function(requestData) {
            try {
                $('#rcomments').html('<div class="redditSpinner"></div>');
                var result = JSON.parse(requestData);
                var output = "";
                $.each(result[1].data.children, function(index, value) {
                    if (value.data.body !== undefined) { output += AlienTube.traverseComment(value.data); }
                });
                $('#rcomments').html(output);
                if (!AlienTube.preferences.disablePostHeader) {
                    $('#reddit header').replaceWith(String.format('<header data-id="{0}"><div class="vote">{1}</div><a href="http://reddit.com/{2}" target="_blank">{3}</a></header>',
                                    result[0].data.children[0].data.name,
                                    AlienTube.getPostVotingHTML(result[0].data.children[0].data),
                                    result[0].data.children[0].data.permalink,
                                    result[0].data.children[0].data.title));
                }
                AlienTube.bindCommentEvents();
            } catch (e) {
                if (AlienTube.ravenLoggingUrl.length > 0 && AlienTube.preferences.enableAutomaticErrorReporting) {
                    Raven.captureException(e);
                }
                AlienTube.postErrorMessage(e);
                console.log(e);
            }
        });
    },
    
    castVote : function(id, vote, callback) {
        try {
            AlienTube.POSTRequest('https://pay.reddit.com/api/vote', {
                id: id,
                dir: vote,
                uh: AlienTube.preferences.modhash
            }, callback);
        } catch (e) {
            if (AlienTube.ravenLoggingUrl.length > 0 && AlienTube.preferences.enableAutomaticErrorReporting) {
                Raven.captureException(e);
            }
            AlienTube.postErrorMessage(e);
            console.log(e);
        }
    },
    
    bindCommentEvents : function() {
        $('.collapseButton').click(function (e) {
            $(this).closest('article').hide();
            $(this).closest('article').prev().show();
            e.preventDefault();
        });
        $('.expandButton').click(function (e) {
            $(this).closest('.collapse').hide();
            $(this).closest('.collapse').next().show();
            e.preventDefault();
        });
        $('.arrow').click(function (e) {
            var id = $(e.target).closest('article').attr('data-id');
            var isPost = false;
            var isModified = false;
            if (id === undefined) {
                id = $('#reddit header').attr('data-id');
                isPost = true;
            }
            if ($(e.target).hasClass('upmod')) {
                AlienTube.castVote(id, 0, function() {
                    $(e.target).addClass('up');
                    $(e.target).removeClass('upmod');
                    if (isPost) {
                        $(e.target).next().removeClass('liked');
                        $(e.target).next().html(parseInt($(e.target).next().text(), 10) - 1);
                    } else {
                    
                    }
                });
            } else if ($(e.target).hasClass('downmod')) {
                AlienTube.castVote(id, 0, function() {
                    $(e.target).addClass('down');
                    $(e.target).removeClass('downmod');
                    if (isPost) {
                        $(e.target).prev().removeClass('disliked');
                        $(e.target).prev().html(parseInt($(e.target).prev().text(), 10) + 1);
                    } else {
                    
                    }
                });
            } else if ($(e.target).hasClass('up')) {
                AlienTube.castVote(id, +1, function() {
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
                    
                    }
                });
            } else if ($(e.target).hasClass('down')) {
                AlienTube.castVote(id, -1, function() {
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
                    
                    }
                });
            }
        });
    },
    
    //Check whether regular YouTube or YouTube feather is being used and apply the comment section appropriately.
    setCommentSection : function(html) {
        $('#reddit').remove();
        if ($('#watch7-content').length) {
            $('#watch-discussion').remove();
            $('#watch7-content').append(html);
        } else {
            $(AlienTube.preferences.featherDescriptionPlacement ? '#ded' : '#cm').append(html);
        }
    },
    
    getExtensionFolderRessource : function (path) {
        if (typeof(safari) !== 'undefined') {
            return safari.extension.baseURI +  path;
        } else if (typeof(chrome) !== 'undefined') {
            return chrome.extension.getURL(path);
        } else {
            return null;
        }
    },
    
    
    postErrorMessage : function(message) {
        AlienTube.setCommentSection(String.format('<section id="reddit"><div class="redditError"><img src="{0}" alt="An error has occured" /><div><h1>A fatal error occured.</h1><p>{1}</p></div></div></section>', AlienTube.getExtensionFolderRessource('error.png'), message));
    },
    
    startAlienTube : function() {
        //Generate a youtube url from the browser window and perform a search for the video.
        var link = 'http://www.youtube.com/watch?v=' + $.url(window.location.href).param('v');
        AlienTube.GETRequest("https://pay.reddit.com/submit.json?url=" + encodeURIComponent(link), function(requestData) {
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
                        AlienTube.getRedditComments(result);
                    }
                }
            } catch (e) {
                if (AlienTube.ravenLoggingUrl.length > 0 && AlienTube.preferences.enableAutomaticErrorReporting) {
                    Raven.captureException(e);
                }
                AlienTube.postErrorMessage(e);
                console.log(e);
            }
        });
        
        //Bye Bye Google+, removing the comment section and adding our own.
        AlienTube.setCommentSection('<section id="reddit"><div class="redditSpinner"></div></section>');
    }
};

$(document).ready(function() {
    if (window.top === window) {
        if (AlienTube.ravenLoggingUrl.length > 0) {
            Raven.config(AlienTube.ravenLoggingUrl).install();
        }
        if (typeof(safari) !== 'undefined') {
            var uuid = AlienTube.makeUUID();
            safari.self.addEventListener('message', function(event) {
                if (event.name == uuid) {
                    var safariPref = JSON.parse(event.message);
                    //Safari doesn't actually give us the default values for some bloody reason so this is a workaround.
                    AlienTube.preferences.hiddenCommentScoreThreshold = safariPref.hiddenCommentScoreThreshold ? safariPref.hiddenCommentScoreThreshold : -4;
                    AlienTube.preferences.wideCommentBox = safariPref.wideCommentBox ? safariPref.wideCommentBox : false;
                    AlienTube.preferences.featherDescriptionPlacement = safariPref.featherDescriptionPlacement ? safariPref.featherDescriptionPlacement : false;
                    AlienTube.preferences.disablePostHeader = safariPref.disablePostHeader ? safariPref.disablePostHeader : false;
                    AlienTube.preferences.disableTabs = safariPref.disableTabs ? safariPref.disableTabs : false;
                    AlienTube.preferences.enableAutomaticErrorReporting = safariPref.enableAutomaticErrorReporting ? safariPref.enableAutomaticErrorReporting : false;
                    AlienTube.startAlienTube();
                }
            }, false);
            safari.self.tab.dispatchMessage(uuid, {type: 'settings'});
        } else if (typeof(chrome) !== 'undefined') {
            return chrome.storage.sync.get(null, function (settings) {
                AlienTube.preferences = settings;
                AlienTube.startAlienTube();
            });
        }
    }
});
