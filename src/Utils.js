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

if (typeof window.Time === 'undefined') {
  window.Time = function(input) {
    var match, maxUnit, name, precision, result, string, unit, units, value;
    units = {
      second: {
        symbol: 's',
        pattern: /([0-9.]+) ?s(ec(ond)?(s)?)?\.?/,
        ratio: 1
      },
      minute: {
        symbol: 'min',
        pattern: /([0-9.]+) ?m(in(ute)?(s)?)?\.?/,
        ratio: 60
      },
      hour: {
        symbol: 'h',
        pattern: /([0-9.]+) ?h(r|our)?(s)?\.?/,
        ratio: 3600
      },
      day: {
        symbol: 'd',
        pattern: /([0-9.]+) ?d(ay)?(s)?\.?/,
        ratio: 86400
      }
    };
    value = Number(input);
    if (isNaN(value)) {
      for (name in units) {
        unit = units[name];
        match = input.match(unit.pattern);
        if (match) {
          value = match[1];
          break;
        }
      }
    } else {
      unit = units.second;
    }
    result = new Number(value * unit.ratio);
    if (!isNaN(value)) {
      maxUnit = units.second;
      for (name in units) {
        unit = units[name];
        if (result >= unit.ratio) {
          maxUnit = unit;
        }
      }
      precision = maxUnit.ratio > 1 ? 10 : 1;
      value = Math.round(value / maxUnit.ratio * precision) / precision;
      string = "" + value + maxUnit.symbol;
    } else {
      string = '';
    }
    result.toString = function() {
      return string;
    };
    return result;
  };
}

window.formatSeconds = function(seconds) {
  return (new Time(seconds)).toString();
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
