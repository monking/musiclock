<?php require_once 'config/config.php'; ?>
<!DOCTYPE html>
<html>
	<head>
		<title>MusiClock</title>
		<script type="text/javascript" src="js/musiclock.js"></script>
		<link type="text/css" rel="stylesheet" href="css/main.css" />
		<script>var mc = new MusiClock(<?=json_encode($pl->list)?>);window.onload=function(){mc.init();mc.setListControls(document.getElementById('mc_controls'));};</script>
	</head>
	<body>
		<section id="mc_controls">
			<select id="moods">
<?php foreach($pl->list as $mood => $set) : ?>
				<option value="<?=$mood?>"><?=$mood?></option>
<?php endforeach; ?>
			</select>
			<button class="prev">&laquo; prev</button>
			<button class="next">next &raquo;</button>
		</section>
		<section id="list"></section>
	</body>
</html>
