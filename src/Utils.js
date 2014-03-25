var loadJSON, overloads, toggleClass,
  __slice = [].slice;

overloads = function() {
  var ancestor, ancestors, child, key, value, _i, _len;
  child = arguments[0], ancestors = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
  if (child == null) {
    child = {};
  }
  for (_i = 0, _len = ancestors.length; _i < _len; _i++) {
    ancestor = ancestors[_i];
    for (key in ancestor) {
      value = ancestor[key];
      if (typeof child[key] === 'undefined') {
        child[key] = value;
      }
    }
  }
  return child;
};

loadJSON = function(url, successHandler) {
  var request;
  request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.onreadystatechange = function() {
    var data;
    if (request.readyState !== 4 || request.status !== 200) {
      return;
    }
    data = JSON.parse(request.responseText);
    return successHandler(data);
  };
  return request.send();
};

toggleClass = function(element, className, override) {
  var added, classIndex, classes;
  added = override;
  classes = element.className.match(/([^\s]+)/g) || [];
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
  if (typeof added !== 'undefined') {
    element.className = classes.join(' ');
  }
  return added;
};

window.formatSeconds = function(seconds) {
  var plural, unit, value;
  value = 0;
  unit = '';
  if (seconds < 60) {
    value = Math.floor(seconds);
    unit = 'sec.';
  } else if (seconds < 3600) {
    value = Math.floor(seconds / 60);
    unit = 'min.';
  } else if (seconds < 86400) {
    value = Math.floor(seconds / 3600);
    unit = 'hr.';
  } else {
    value = Math.floor(seconds / 86400);
    unit = 'day';
  }
  plural = /[A-z]$/.test(unit) && value !== 1 ? 's' : '';
  return "" + value + " " + unit + plural;
};

window.getRangeLog = function(element, pow) {
  if (pow == null) {
    pow = 2;
  }
  return Math.pow(element.value, pow) / Math.pow(element.attributes.max.value, pow - 1);
};

window.setRangeLog = function(element, value, pow) {
  if (pow == null) {
    pow = 2;
  }
  return element.value = Math.pow(value * Math.pow(element.attributes.max.value, pow - 1), 1 / pow);
};

window.circular = function(value, high, low) {
  var adjusted;
  if (low == null) {
    low = 0;
  }
  adjusted = (value - low) % (high - low + 1);
  if (adjusted < 0) {
    adjusted += high - low;
  }
  return adjusted + low;
};
