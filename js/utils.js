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

window.formatSeconds = function(seconds) {
  if (seconds < 60) {
    return Math.floor(seconds) + " seconds";
  } else if (seconds < 3600) {
    return Math.floor(seconds / 60) + " minutes";
  } else if (seconds < 86400) {
    return Math.floor(seconds / 3600) + " hours";
  } else {
    return Math.floor(seconds / 86400) + " days";
  }
  
}

window.getRangeLog = function(element, pow) {
  // assumes min is zero
  pow = pow || 2;
  return Math.pow(element.value, pow) / Math.pow(element.attributes.max.value, pow - 1);
};

window.setRangeLog = function(element, value, pow) {
  // assumes min is zero
  pow = pow || 2;
  element.value = Math.pow(value, pow) / Math.pow(element.attributes.max.value, pow- 1);
};

window.log = function(message) {
  document.getElementById("debug").innerHTML = message;
};
