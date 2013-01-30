<?php require_once 'config/config.php'; ?>
<!DOCTYPE html>
<html>
	<head>
		<title>MusiClock</title>
		<script type="text/javascript" src="js/playlist.js"></script>
		<link type="text/css" rel="stylesheet" href="css/main.css" />
		<script>var list = new Playlist(<?=json_encode($pl->list)?>);window.onload=function(){list.checkTime();};</script>
	</head>
	<body>
		<section id="list"></section>
	</body>
</html>
