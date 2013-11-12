/* jslint browser: true */
/* global _,$,jQuery, chrome */

// String.Format equivlency function for Javascript
String.format = function() {
    var s = arguments[0];
    for (var i = 0; i < arguments.length - 1; i++) {       
        var reg = new RegExp("\\{" + i + "\\}", "gm");             
        s = s.replace(reg, arguments[i + 1]);
    }
    return s;
};

var RYouTube = {
    searchState : false,
    searchResults : [],
    //Looping function used to traverse down the tree of replies
    traverseComment : function(data) {
        var output = RYouTube.getCommentAsHTML(data);
        //Does this comment have replies? 
        if (data.replies !== null && data.replies.length !== 0 && data.replies !== undefined) {
            output += '<div class="replies">';
            //Loop through replies, validate them and continue down the tree.
            $.each(data.replies.data.children, function(index, value) {
                if (value.data.body !== undefined) { output += RYouTube.traverseComment(value.data); }
            });
            output += '</div>';
        }
        output += '</article>';
        return output;
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
        var time = RYouTube.timeAgoFromEpochTime(data.created_utc);
        
        var comment = "";
        
        //Create replacement item for collapsed comments. Check if a comment is below the treshold and should be hidden by default.
        if ((data.ups - data.downs) <= -4) {
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
        comment += String.format('<article style="{0}"><div class="comment"><span class="info"><a class="collapseButton" href="#">[-]</a> <a href="http://www.reddit.com/user/{1}" rel="author" target="_blank">{1}</a> {2} {3} points <time datetime="{4}">{5}</time> (<span class="upvotes">{6}</span>|<span class="downvotes">{7}</span>)</span>{8}</div>',
                                (data.ups - data.downs) <= -4 ? 'display: none;' : "",
                                data.author,
                                data.author_flair_text !== null ? '<span class="flair">'+data.author_flair_text+'</span>' : "",
                                data.ups - data.downs,
                                new Date(data.created_utc * 1000).toISOString(),
                                time,
                                data.ups,
                                data.downs,
                                $("<div/>").html(data.body_html).text());
        return comment;
    },
    
    //Generates the reddit comment box
    getRedditComments : function(link, results) {
        chrome.extension.sendRequest({action:'getJSON',url:link}, function(json) { 
            var output = '<section id="reddit">';
            //Create tabs for all available threads.
            output += String.format('<div id="redditTabs"><button class="redditTab active border" data-value="{0}">/r/{0}</button>', json[0].data.children[0].data.subreddit);
            if (results !== undefined) {
                if (results.length > 1) {
                    for (var i = 1; i < results.length; i++) {
                        output += String.format('<button class="redditTab" data-value="{0}">/r/{0}</button>', results[i].subreddit);
                    }
                }
            }
            output += '</div><div id="rcomments">';
            //Loop through top level comments, validate them, and start down the tree.
            $.each(json[1].data.children, function(index, value) {
                if (value.data.body !== undefined) { output += RYouTube.traverseComment(value.data); }
            });
            output += '</div></section>';
            //Bye Bye Google+, removing the comment section and adding our own.
            $('#watch-discussion').remove();
            $('#watch7-content').append(output);
            RYouTube.bindCollapseExpandEvents();
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
                    RYouTube.loadCommentsForSubreddit(data[0]);
                }
            });
            
        });
    },
    
    secondSearch : function() {
        /* Reddit's search function distinguishes between the http and https version of a youtube link and does not suport wildcards.
           Unfortunately this means we will have to check both, this function performs the second search. */
        var link = 'https://www.youtube.com/watch?v=' + $.url(window.location.href).param('v');
        chrome.extension.sendRequest({action:'getJSON',url:"https://pay.reddit.com/submit.json?jsonp=?&url=" + encodeURIComponent(link)}, function(result) {
            RYouTube.searchResults = RYouTube.searchResults.concat(result.data.children);
            RYouTube.processSearchResults();
        });
    },
    
    //Processes the results of both searches.
    processSearchResults: function() {
        var numArray = [];
        //Remove threads with no comments. In the future we will handle this by suggesting the user makes a comment.
        $.each(RYouTube.searchResults, function(index, value){
            if (value.data.num_comments > 0) { numArray.push(value.data); }
        });
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
        RYouTube.getRedditComments(String.format("https://pay.reddit.com/r/{0}/comments/{1}.json?jsonp=?", subReddit, article), topItemOfSubreddits);
    },
    
    //Loads the content of alternate tabs.
    loadCommentsForSubreddit : function (data) {
        var link = String.format("https://pay.reddit.com/r/{0}/comments/{1}.json?jsonp=?", data.subreddit, data.id);
        chrome.extension.sendRequest({action:'getJSON',url:link}, function(json) {
            var output = "";
            $.each(json[1].data.children, function(index, value) {
                if (value.data.body !== undefined) { output += RYouTube.traverseComment(value.data); }
            });
            $('#rcomments').html(output);
            RYouTube.bindCollapseExpandEvents();
        });
    },
    
    bindCollapseExpandEvents : function() {
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
    }
};


$(document).ready(function() {
    //Generate a youtube url from the browser window and perform a search for the video.
    var link = 'http://www.youtube.com/watch?v=' + $.url(window.location.href).param('v');
    chrome.extension.sendRequest({action:'getJSON',url:"https://pay.reddit.com/submit.json?jsonp=?&url=" + encodeURIComponent(link)}, function(result) {
        RYouTube.searchResults = result.data.children;
        RYouTube.searchState = true;
        RYouTube.secondSearch();
    });
});

//Listen for Chrome letting us know a redirect happened.
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.redditRedirectUrl) {
        if (request.redditRedirectUrl.indexOf("/comments/") !== -1) {
            //Reddit has returned a single article page, let's fetch it.
            RYouTube.searchState = true;
            RYouTube.getRedditComments(request.redditRedirectUrl.replace('?already_submitted=true',''));
        } else {
            //Reddit is trying to redirect us to the login page. This means there were no articles found. Let's try again with an https link if we have not already done so.
            if (!RYouTube.searchState) {
                RYouTube.searchState = true;
                RYouTube.secondSearch();
            }
        }
    }
});