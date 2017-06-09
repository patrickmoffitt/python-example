'use strict'

const path = require('path')
const remote = require('electron').remote
window.remote = remote
window.$ = window.jQuery = require('jquery')
let webRoot = path.dirname(__dirname)
window.view = require(path.join(webRoot, 'view.js'))
window.controller = require(path.join(webRoot, 'controller.js'))

$('window').ready(function () {
  if (window.controller.getPythonPath() === null) {
    let options = {
      title: 'Python?',
      type: 'info',
      message: 'Python version 3+ not found.\nPlease install it.',
      buttons: []
    }
    remote.dialog.showMessageBox(window.remote.getCurrentWindow(), options)
  } else {
    $('#list-modules').click(function (e) {
      e.preventDefault()
      $('#modules-list').html('')
      $('#spinner').show()
      window.controller.getPythonModules(window.view.showPythonModules)
    })
    window.controller.initPythonWin32(window.controller.getPythonDepends())
  }
})
