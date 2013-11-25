<?php require('config/config.php'); ?>
<!DOCTYPE html>
<html>
	<head>
		<title>MusiClock</title>
		<meta name="robots" content="noindex, nofollow" />
		<script type="text/javascript" src="js/swfobject/swfobject.js"></script>
		<script type="text/javascript" src="//www.youtube.com/player_api"></script>
		<script type="text/javascript" src="js/eventdispatcher.js"></script>
		<script type="text/javascript" src="js/utils.js"></script>
		<script type="text/javascript" src="js/musiclock.js"></script>
		<script type="text/javascript" src="js/player.js"></script>
		<script type="text/javascript" src="js/ytplayer.js"></script>
		<link type="text/css" rel="stylesheet" href="css/main.css" />
		<script type="text/javascript">
var mc = new MusiClock({
basePath:"/home/<?php echo $user->username ?>/musiclock",
library:<?php readfile($user->dir . '/musiclock/library.json'); ?>});
window.onload=function(){
	mc.init();
	mc.setListControls(document.getElementById('mc_controls'));
};
		</script>
	</head>
	<body>
		<section id="mc_controls">
			<select id="playlists"></select>
			<button class="prev">&laquo; prev</button>
			<button class="next">next &raquo;</button>
			<label><input type="checkbox" class="repeat"> repeat</label>
			<label><input type="checkbox" class="single"> single</label>
			<label><input type="range" min="0" max="86400" scale="log" class="minPlaytime"> A/B minimum <span class="minPlaytime-value"></span></label>
		</section>
		<section id="players">
			<audio id="htplayer0" controls></audio>
			<audio id="htplayer1" controls></audio>
			<div id="ytcontainer0" class="yt-container hidden"><div id="ytapiplayer0"></div></div>
			<div id="ytcontainer1" class="yt-container hidden"><div id="ytapiplayer1"></div></div>
    <div id="debug"></div>

			<script type="text/javascript">

/*
				var params = { allowScriptAccess: "always" };
				var atts = { id: "myytplayer" };
				swfobject.embedSWF("http://www.youtube.com/v/VIDEO_ID?enablejsapi=1&playerapiid=ytplayer&version=3",
													 "ytapiplayer", "425", "356", "8", null, null, params, atts);
 */

			</script>
		</section>
		<section id="list"></section>
	</body>
</html>
