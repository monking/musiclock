window.onload = function() {
	var request = new XMLHttpRequest();
	request.open('GET', '/library.json', true);
	request.onreadystatechange = function () {
		if (request.readyState != 4 || request.status != 200) return;
		library = JSON.parse(request.responseText);
		var mc = new MusiClock({library:library});
		mc.init();
		mc.setListControls(document.getElementById('.global nav.controls'));
		window.mc = mc;
	};
	request.send();
};
