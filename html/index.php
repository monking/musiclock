<?php require_once 'config/config.php'; ?>
<!DOCTYPE html>
<html>
	<head>
		<title>MusiClock</title>
		<script type="text/javascript" src="js/playlist.js"></script>
		<link type="text/css" rel="stylesheet" href="css/main.css" />
		<script>var list = new Playlist(<?=json_encode($pl->list)?>);window.onload=function(){list.init();list.setListControls(document.getElementById('list_controls'));};</script>
	</head>
	<body>
		<section id="list_controls">
			<span class="prev">&laquo; prev</span>
			<span class="next">next &raquo;</span>
			<select id="moods">
<?php foreach($pl->list as $mood => $set) : ?>
				<option value="<?=$mood?>"><?=$mood?></option>
<?php endforeach; ?>
			</select>
		</section>
		<section id="list"></section>
	</body>
</html>
