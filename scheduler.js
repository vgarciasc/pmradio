var database = {
	videos: [],
	start_time: 13*60*60 + 22*60 + 15,
	should_loop: false,
	should_block_pauses: false
};


$(document).ready(function() {
	var stored = JSON.parse(localStorage.getItem('uradio_db'));
	if (stored) {
		database = stored;
		updateUiFromDatabase();
	}
});

function onClickAddVideo() {
	var txt = $("#video-input")[0].value;
	var videos = txt.split(/(watch\?v=)/g);
	var condensed_videos = txt.split(/(youtu.be\/)/g);
	var playlists = txt.split(/(\/playlist\?list=)/g);

	var video_id = ((videos != null && videos.length > 1) ? videos[videos.length - 1] : (condensed_videos != null && condensed_videos.length > 1 ? condensed_videos[condensed_videos.length - 1] : null));
	var playlist_id = (playlists ? playlists[playlists.length - 1] : null);

	if (video_id) {
		var id = txt.split("=")[1].split("&")[0];
		$.get(
			'https://www.googleapis.com/youtube/v3/videos', {
				id: id,
				part: 'snippet,contentDetails',
			},
			function(data) {
				$.each( data.items, function(i, item) {
					// !TODO: handle errors
					addVideoToDatabase(item);
				})
			}
		);
	} else {

	}
}

function addVideoToDatabase(video_result) {
	var start_time = database.start_time;
	if (database.videos.length > 0) {
		var last_video = database.videos[database.videos.length - 1];
		start_time = last_video.start_time + last_video.duration;
	}

	var video_obj = {
		id: video_result.id,
		title: video_result.snippet.title,
		duration: extractDurationFromResult(video_result),
		start_time: start_time};
	database.videos.push(video_obj);
	saveToStorage();
	updateUiFromDatabase();
}

function updateUiFromDatabase() {
	$('#video-info-container')[0].innerHTML = "";
	database.videos.forEach((video_obj, video_idx) => {
		addVideoToHtml(video_obj, video_idx)
	});
}

function addVideoToHtml(video_obj, video_idx) {
	var text = $('#video-info-container')[0].innerHTML;

	text += "";
	text += "<div class='video-entry' id='" + video_obj.id + "'>";
	text += "<div style='width: 13%; float: left; vertical-align: middle;'>";
	text += "{" + parseVideoTimeToString(video_obj.start_time, true) + "}";
	text += "</div>";
	text += "<div style='width: 60%; float: left;'>";
	text += "<span>" + video_obj.title + "</span>"
	text += "<br>"
	text += "<span>Duration: " + parseVideoTimeToString(video_obj.duration) + "</span>"
	text += "</div>"
	text += "<div style='width: 15%; float: left; margin-left: 0.5em;'>"
	text += "<button onclick='playVideoById(\"" + video_obj.id + "\")'>▶ play</button>"
	text += "<br>"
	text += "<button onclick='removeVideo(" + video_idx + ")'>✕ remove</button>"
	text += "</div>"
	text += "<div style='width: 5%; float: left;'>" 
	text += "<b><button onclick='moveVideo(" + video_idx + ", -1)' " + (video_idx == 0 ? "disabled" : "") + ">↑ </button></b>"
	text += "<br>"
	text += "<b><button onclick='moveVideo(" + video_idx + ", +1)' " + (video_idx == database.videos.length - 1 ? "disabled" : "") + ">↓</button></b>"
	text += "</div>"
	text += "</div>"

    $('#video-info-container')[0].innerHTML = text;
}

function moveVideo(video_idx, dir) {
	var aux = database.videos[video_idx];
	database.videos[video_idx] = database.videos[video_idx + dir];
	database.videos[video_idx + dir] = aux;

	updateSchedule();
	updateUiFromDatabase();
}

function removeVideo(video_idx) {
	database.videos.splice(video_idx, 1)

	updateSchedule();
	updateUiFromDatabase();
}

function updateStartTime() {
	var start_time = $("#start-time-input")[0].value.split(":");
	database.start_time = parseInt(start_time[0])*60*60 + parseInt(start_time[1])*60 + parseInt(start_time[2]);
	updateSchedule();
	updateUiFromDatabase();
}

function updateSchedule() {
	var start_time = database.start_time;
	var curr_time = start_time;
	for (var i = 0; i < database.videos.length; i++) {
		var video = database.videos[i];
		video.start_time = curr_time;
		curr_time += video.duration;
	}
	saveToStorage();
}

function extractDurationFromResult(video_obj) {
	var string = video_obj.contentDetails.duration;
	return parseInt(string.split("M")[0].slice(2)) * 60 + parseInt(string.split("M")[1].slice(0, 2));
}

function parseVideoTimeToString(time, hour=false) {
	time = time % (24*60*60);
	if (!hour) {
		return Math.floor(time / 60) + ":" + (time % 60).toString().padStart(2, '0');
	} else {
		return Math.floor(time / 3600).toString().padStart(2, '0') 
			+ ":"
			+ Math.floor((time % 3600) / 60).toString().padStart(2, '0') 
			+ ":" 
			+ (time % 60).toString().padStart(2, '0');
	}
}

function saveToStorage() {
	localStorage.setItem('uradio_db', JSON.stringify(database));
}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/javascript;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function exportDatabase() {
	//!TODO: disable button when database unavailable
	database.should_loop = $("#should_loop").is(":checked");
	database.should_block_pauses = $("#should_block_pauses").is(":checked");
	download("database.js", "let database = " + JSON.stringify(database, null, '\t'))	
}

function clearDatabase() {
	database = {
		videos: [],
		start_time: 13*60*60 + 22*60 + 15,
		should_loop: false,
		should_block_pauses: false
	};
	saveToStorage();
	updateUiFromDatabase();	
}

function importDatabase(event) {
	var file = document.getElementById("database-upload").files[0];
	if (file) {
	    var reader = new FileReader();
	    reader.readAsText(file, "UTF-8");
	    reader.onload = function (evt) {
		    database = JSON.parse(evt.target.result.slice(15));
			saveToStorage();
			updateUiFromDatabase();	
	    }
	}
}