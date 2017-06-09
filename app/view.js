'use strict'

const electron = require('electron').remote

module.exports.currentWindow = electron.getCurrentWindow()

module.exports.showPythonModules = function (modulesJSON) {
  let modules = JSON.parse(modulesJSON)
  let markup = '<ul>'
  for (let pythonModule of modules) {
    markup += '<li><span class="module-name">' + pythonModule.name +
      '</span><span class="module-version">' + pythonModule.version +
      '</span></li>'
  }
  markup += '</ul>'
  $('#modules-list').html(markup)
  $('#spinner').hide()
}
