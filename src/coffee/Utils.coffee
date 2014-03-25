overloads = (child, ancestors...) ->
  child ?= {}
  for ancestor in ancestors
    for key, value of ancestor
      child[key] = value if typeof child[key] is 'undefined'
  child

loadJSON = (url, successHandler) ->
  request = new XMLHttpRequest()
  request.open 'GET', url, true
  request.onreadystatechange = ->
    return if request.readyState != 4 or request.status != 200
    data = JSON.parse request.responseText
    successHandler data
  request.send()

toggleClass = (element, className, override) ->
  added = override
  classes = element.className.match(/([^\s]+)/g) or []
  classIndex = classes.indexOf className

  if classIndex > -1
    if !override
      classes.splice classIndex, 1
      added = false
  else if override isnt false
    classes.push className
    added = true

  if typeof added isnt 'undefined'
    element.className = classes.join ' '
  return added

if typeof window.Time is 'undefined'
  window.Time = (input) ->
    units =
      second:
        symbol: 's'
        pattern: /([0-9.]+) ?s(ec(ond)?(s)?)?\.?/
        ratio: 1
      minute:
        symbol: 'min'
        pattern: /([0-9.]+) ?m(in(ute)?(s)?)?\.?/
        ratio: 60
      hour:
        symbol: 'h'
        pattern: /([0-9.]+) ?h(r|our)?(s)?\.?/
        ratio: 3600
      day:
        symbol: 'd'
        pattern: /([0-9.]+) ?d(ay)?(s)?\.?/
        ratio: 86400

    value = Number input
    if isNaN value
      for name, unit of units
        match = input.match unit.pattern
        if match
          value = match[1]
          break
    else
      unit = units.second

    result = new Number(value * unit.ratio)

    if not isNaN value
      maxUnit = units.second
      for name, unit of units
        if result >= unit.ratio
          maxUnit = unit
      precision = if maxUnit.ratio > 1 then 10 else 1
      value = Math.round(value / maxUnit.ratio * precision) / precision
      string = "#{value}#{maxUnit.symbol}"
    else
      string = ''
    result.toString = -> string
    result

window.formatSeconds = (seconds) ->
  (new Time seconds).toString()

window.getRangeLog = (element, pow) ->
  # assumes min is zero
  pow ?= 2
  return Math.pow(element.value, pow) / Math.pow(element.attributes.max.value, pow - 1)

window.setRangeLog = (element, value, pow) ->
  # assumes min is zero
  pow ?= 2
  element.value = Math.pow(value * Math.pow(element.attributes.max.value, pow - 1), 1 / pow)

window.circular = (value, high, low = 0) ->
  adjusted = (value - low) % (high - low + 1) # low <=> high, inclusive
  adjusted += high - low if adjusted < 0
  return adjusted + low
