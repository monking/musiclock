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

window.formatSeconds = (seconds) ->
  value = 0
  unit = ''
  if seconds < 60
    value = Math.floor seconds
    unit = 'sec.'
  else if seconds < 3600
    value = Math.floor seconds / 60
    unit = 'min.'
  else if seconds < 86400
    value = Math.floor seconds / 3600
    unit = 'hr.'
  else
    value = Math.floor seconds / 86400
    unit = 'day'
  return "#{value} #{unit}#{'s' if /[A-z]$/.test(unit) and value != 1}"

window.getRangeLog = (element, pow) ->
  # assumes min is zero
  pow ?= 2
  return Math.pow(element.value, pow) / Math.pow(element.attributes.max.value, pow - 1)

window.setRangeLog = (element, value, pow) ->
  # assumes min is zero
  pow ?= 2
  element.value = Math.pow(value * Math.pow(element.attributes.max.value, pow - 1), 1 / pow)
