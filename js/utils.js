// String.pad
if (!String.prototype.pad) {
	String.prototype.pad = function(length, char) {
		var newString = this;
		while (newString.length < length) newString = (char.toString() || ' ') + newString;
		return newString.toString();
	}
}

// toggleClass
var toggleClass = function(element, className, override) {
	var added = override,
		classes = element.className.match(/([^\s]+)/g) || [],
		classIndex = classes.indexOf(className);

	if (classIndex > -1) {
		if (!override) {
			classes.splice(classIndex, 1);
			added = false;
		}
	} else if (override !== false) {
		classes.push(className);
		added = true;
	}
	if (typeof added !== 'undefined')
		element.className = classes.join(' ');
	return added;
};

window.log = function(message) {
  document.getElementById("debug").innerHTML = message;
};
