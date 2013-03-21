/**
 * Content Script
 * @author: Karthik VJ
 */

var pathName = window.location.pathname;
var template_main = '<div class="xbmc_control">YouTube to XBMC: $play_all $sep $play_now</div>';
var template_playnow = '<a href="#" rel="$pid" class="xbmc_playNow" onclick="return false;">Play Now</a> | <a href="#" rel="$qid" class="xbmc_queue" onclick="return false;">[+] Add to Queue</a>';
var template_playnow_sidebar = '<span rel="$pid" class="xbmc_playNow xbmc_link" onclick="return false;">Play Now</span> | <span rel="$qid" class="xbmc_queue xbmc_link" onclick="return false;">[+] Add to Queue</span>';
var template_playall = '<a href="#" rel="$lid" class="xbmc_playlist" onclick="return false;">Play All</a>';
var template_playall_sidebar = '<span rel="$lid" class="xbmc_playlist xbmc_link" onclick="return false;">Play All</span>';
var timer;

console.log("pathName, " + pathName);

var RpcService = function()
{
    this.playVideoOnXBMC = function(vId)
    {
        chrome.extension.sendMessage({message: "playVideo", videoId: vId}, function(response) {
            console.log("video sent! " + response);
        });
    };

    this.queueVideoToXBMC = function(vId)
    {
        chrome.extension.sendMessage({message: "queueVideo", videoId: vId}, function(response) {
            console.log("inject script >> video sent! " + response);
            if(response == ResultData.OK)
            {
                toastr.success("Added to Queue!");
            }
            else
            {
                toastr.error("Error! Can't Add to Queue!");
            }
        });
    };
    this.playListOnXBMC = function(listId, videoId)
    {
        chrome.extension.sendMessage({message: "playList", listId: listId, videoId: videoId}, function(response) {
            console.log("list sent! " + response);
        });
    };
};

var Utils = new function()
{
    this.findPropertyFromString = function(str, property)
    {
        //console.log("findPropertyFromString, str = " + str);
        //console.log("findPropertyFromString, property = " + property);
        property = property + "=";
        var index = str.indexOf('?');
        str = str.substring(index + 1);
        //console.log("index = " + index);
        //console.log("str = " + str);

        var list = str.split('&');
        //console.log("list.length, " + list.length);
        for(var i = 0; i < list.length; i++)
        {
            if(list[i].search(property) == 0)
            {
                return list[i].replace(property, "");
            }
        }
        return 0;
    }
};


this.injectLinks = function()
{
	console.log("injectLinks");
	// (home / subscription on home page), search page, video manager, user page, user browse video, Popular on YouTube, Popular on youtube right side, video list (on video page), play list page
	$(".feed-item-content, .yt-lockup2-content, .vm-video-info-container, .yt-tile-visible, .channels-content-item, .lohp-category-shelf-item, .lohp-large-shelf-container, .lohp-medium-shelf-content, .lohp-vertical-shelf-item-content, .video-list-item, .playlist-video-item, .yt-lockup-content").each(function(index)
	{
		var alreadyAdded = false;
		$(this).find(".xbmc_control").each(function(xIndex)
		{
			alreadyAdded = true;
			return false;

		});

		if(alreadyAdded)
		{
			return; // continue
		}

		console.log(index);
		var videoPathString;
		var listId;
		var videoId;
		// (home / subscription on home page), search page, video manager, (user page / user browse video / Popular on YouTube)
		$(this).find(".feed-video-title, .yt-uix-tile-link, .vm-video-title-content, .yt-uix-sessionlink").each(function(vIndex)
		{
			//console.log("video link, " + vIndex + ", " + $(this).attr("href"));
			videoPathString = $(this).attr("href");
			return false;
		});

		if(videoPathString)
		{
			console.log("videoPathString, " + videoPathString);
			var mainTemplate = template_main;

			// just a single video
			videoId = Utils.findPropertyFromString(videoPathString, "v");
			if(videoId == 0)
			{
				videoId = Utils.findPropertyFromString(videoPathString, "video_id");
			}

			var copyTemp = template_playnow;
			if(videoId != 0)
			{
				console.log("videoId, "  +videoId);
				if($(this).hasClass("video-list-item") || $(this).hasClass("playlist-video-item"))
				{
					copyTemp = template_playnow_sidebar;
				}
				copyTemp = copyTemp.replace("$pid", videoId);
				copyTemp = copyTemp.replace("$qid", videoId);

				mainTemplate = mainTemplate.replace("$play_now", copyTemp);
				//mainTemplate = mainTemplate.replace("$sep", "|");
				//$(this).prepend(copyTemp);
			}
			else
			{
				//mainTemplate = mainTemplate.replace("$sep", "");
				mainTemplate = mainTemplate.replace("$play_now", "");
			}

			// find play list id
			listId = Utils.findPropertyFromString(videoPathString, "list");
			var listTemp = template_playall;
			if(listId)
			{
				if($(this).hasClass("video-list-item") || $(this).hasClass("playlist-video-item"))
				{
					listTemp = template_playall_sidebar;
				}
				// it is play list
				if(videoId != 0)
				{
					// there is video too
					listId = listId + " " + videoId;
					mainTemplate = mainTemplate.replace("$sep", "|");
				}
				else
				{
					// just play list
					mainTemplate = mainTemplate.replace("$sep", "");
				}
				listTemp = listTemp.replace("$lid", listId);

				mainTemplate = mainTemplate.replace("$play_all", listTemp);
				//$(this).prepend(copyTemp);

			}
			else
			{
				mainTemplate = mainTemplate.replace("$sep", "");
				mainTemplate = mainTemplate.replace("$play_all", "");
			}


			//////
			if(listId != 0 || videoId !=0)
			{
				$(this).prepend(mainTemplate);
			}

			listId = 0;
			videoId = 0;


		}

	});

	$("#content").bind('DOMNodeInserted', function(event)
	{
		console.log("DOM updated!");
		var element = event.target;
		console.log("element, " + element.tagName);

		clearInterval(timer);
		timer = setInterval(function(){
			clearInterval(timer);
			$("#content").unbind('DOMNodeInserted');
			injectLinks();
		}, 2000)
	});


};


this.initListeners = function()
{
	// click event listeners
	$(document).on('click', '.xbmc_playlist', function(event)
	{
		console.log("playlist, " + $(this).attr("rel"));
		var listId = $(this).attr("rel");

		if(listId)
		{
			var listData = listId.split(" ");

			//console.log(listData[0]);
			//console.log(listData[1]);
			rpc.playListOnXBMC(listData[0], listData[1]);
			event.preventDefault();
		}

	});

	$(document).on('click', '.xbmc_playNow', function(event)
	{
		console.log("play single video, " + $(this).attr("rel"));
		rpc.playVideoOnXBMC($(this).attr("rel"));
		event.preventDefault();

	});

	$(document).on('click', '.xbmc_queue', function(event)
	{
		console.log("queue single video, " + $(this).attr("rel"));
		rpc.queueVideoToXBMC($(this).attr("rel"));
		event.preventDefault();
	});
}

/////////////////////////////

var rpc = new RpcService();
this.initListeners();

////////////////////////////
if(pathName == "/watch")
{
	console.log("window.location, " + window.location);
	var loc = window.location.toString();
	var mainVideoId = Utils.findPropertyFromString(loc, "v");
	//alert("mainVideoId, " + mainVideoId);
	var mainTemplate = template_main;	
	if(mainVideoId != 0)
	{
		var copyTemp = template_playnow.replace("$pid", mainVideoId);
		copyTemp = copyTemp.replace("$qid", mainVideoId);
						
		mainTemplate = mainTemplate.replace("$play_now", copyTemp);
					
	}
	else
	{
		mainTemplate = mainTemplate.replace("$play_now", "");
	}
	
	var listId = Utils.findPropertyFromString(loc, "list");
	if(listId != 0)
	{
		if(mainVideoId != 0)
		{
			listId = listId + " " + mainVideoId;
		}
		copyTemp = template_playall.replace("$lid", listId);										
		mainTemplate = mainTemplate.replace("$play_all", copyTemp);
		mainTemplate = mainTemplate.replace("$sep", "|");
	}
	else
	{
		mainTemplate = mainTemplate.replace("$sep", "");
		mainTemplate = mainTemplate.replace("$play_all", "");
	}
	
	if(listId != 0 || videoId !=0)
	{
		$("#watch7-headline").prepend(mainTemplate);		
	}
		
	injectLinks();
	
}
else if(pathName.indexOf("/embed") == 0)
{		
	var videoId = pathName.replace("/embed/", "");
	console.log("videoId, " + videoId);
	
	var copyTemp = template_playnow.replace("$pid", videoId);
	copyTemp = copyTemp.replace("$qid", videoId);
		
	var mainTemplate = template_main;
	mainTemplate = mainTemplate.replace("$play_all", "");
	mainTemplate = mainTemplate.replace("$sep", "");
	mainTemplate = mainTemplate.replace("$play_now", copyTemp);
		
	$(".html5-info-panel").append(mainTemplate);

}
else if(pathName == "/share_popup")
{
    var loc = window.location.toString();
    var mainVideoId = Utils.findPropertyFromString(loc, "v");

    var mainTemplate = template_main;
    if(mainVideoId != 0)
    {
        var copyTemp = template_playnow.replace("$pid", mainVideoId);
        copyTemp = copyTemp.replace("$qid", mainVideoId);
        mainTemplate = mainTemplate.replace("$play_now", copyTemp);

        mainTemplate = mainTemplate.replace("$sep", "");
        mainTemplate = mainTemplate.replace("$play_all", "");

        $("#page").prepend(mainTemplate);
    }

}
else
{
	injectLinks();
}



