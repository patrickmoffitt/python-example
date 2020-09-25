'use strict'

const path = require('path')
const os = require('os')
const fs = require('fs')
const app = require('electron').remote.app

const execSync = require('child_process').execSync
const spawn = require('child_process').spawn

/*
  Convert unicode bytes to string.
*/
const _utf8ArrayToStr = function (array) {
  let out, i, len, c, char2, char3
  out = ''
  len = array.length
  i = 0
  while (i < len) {
    c = array[i++]
    switch (c >> 4) {
      case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
        // 0xxxxxxx
        out += String.fromCharCode(c)
        break
      case 12: case 13:
        // 110x xxxx   10xx xxxx
        char2 = array[i++]
        out += String.fromCharCode(
          ((c & 0x1F) << 6) |
          (char2 & 0x3F)
        )
        break
      case 14:
        // 1110 xxxx  10xx xxxx  10xx xxxx
        char2 = array[i++]
        char3 = array[i++]
        out += String.fromCharCode(
          ((c & 0x0F) << 12) |
          ((char2 & 0x3F) << 6) |
          ((char3 & 0x3F) << 0)
        )
        break
    }
  }
  return out
}

/*
  Python modules can not be run from inside an Electron Asar. On Win32 we
  therefor unpack them to app.getPath('userData'). On Darwin and Linux __dirname
  does not point inside an Asar and so this step isn't needed.
*/
module.exports.getPythonAppDir = function () {
  if (os.platform() === 'win32') {
    return path.join(app.getPath('userData'), 'python')
  } else {
    return path.join(__dirname, 'python')
  }
}

/*
  Unpack Python modules to to app.getPath('userData') on Win32.
*/
module.exports.initPythonWin32 = function (callback) {
  if (os.platform() === 'win32') {
    const pythonFileSystemDir = path.join(app.getPath('userData'), 'python')
    try {
      // This will throw if it fails. If it works there is nothing to do.
      fs.accessSync(pythonFileSystemDir, fs.constants.F_OK)
      if (typeof callback === 'function') {
        callback()
      }
    } catch (error) {
      console.log(error.message, 'Creating pythonFileSystemDir', pythonFileSystemDir)
      const pythonAsarDir = path.join(__dirname, 'python')
      fs.mkdirSync(pythonFileSystemDir, '0644')
      fs.readdir(pythonAsarDir, (error, files) => {
        if (error) {
          console.log(error)
          return false
        }
        let type = ''
        let source = ''
        let target = ''
        for (let file of files) {
          type = path.basename(file).split('.')[1]
          if (type === 'py') {
            source = path.join(pythonAsarDir, file)
            target = path.join(pythonFileSystemDir, path.basename(file))
            fs.createReadStream(source).pipe(fs.createWriteStream(target))
          }
        }
      })
      if (typeof callback === 'function') {
        callback()
      }
    }
  }
}

/*
  Attempt to locate Python 3+ across platforms.
*/
module.exports.getPythonPath = function () {
  const platform = os.platform()
  let which = null
  let pythonPath = ''
  let pythonBin = ''
  let python = ''
  let version = null
  let v = null
  let options = null
  let delimiter = ':'
  if (platform === 'darwin') {
    options = {
      env: { PATH: '/usr/local/bin' + path.delimiter + process.env.PATH }
    }
    which = 'which python3'
    try {
      python = _utf8ArrayToStr(execSync(which, options)).replace(/\r?\n|\r/g, '')
      version = python + ' -V'
      v = parseInt(_utf8ArrayToStr(
        execSync(version, options)).split(' ')[1].split('.')[0])
      if (v === 3) {
        pythonPath = python
        pythonBin = pythonPath.replace(/\r?\n|\r/g, '')
      }
    } catch (e) {
      return null
    }
  } else if (platform === 'linux') {
    options = {
      env: { PATH: '/usr/bin' + path.delimiter + process.env.PATH }
    }
    which = 'which python3'
    try {
      python = _utf8ArrayToStr(execSync(which, options)).replace(/\r?\n|\r/g, '')
      version = python + ' -V'
      v = parseInt(_utf8ArrayToStr(
        execSync(version, options)).split(' ')[1].split('.')[0])
      if (v === 3) {
        pythonPath = python
        pythonBin = pythonPath.replace(/\r?\n|\r/g, '')
      }
    } catch (e) {
      return null
    }
  } else if (platform === 'win32') {
    delimiter = ';'
    options = {
      encoding: 'utf8'
    }
    which = 'where "%PATH%:python"'
    try {
      python = execSync(which, options).replace(/\r/g, '').split(/\n/, 1)[0]
      if (python.length > 0) {
        pythonPath = python
        pythonBin = pythonPath.replace(/\r?\n|\r/g, '')
      }
    } catch (e) {
      return null
    }
  }
  if (pythonPath.length > 0) {
    return {
      pythonPath: path.dirname(pythonPath.replace(/\r?\n|\r/g, '')),
      pythonBin: pythonBin,
      delimiter: delimiter
    }
  }
}

/*
  Retrieve a list of installed Python modules and pass it to callback.
  See app/python/list_modules.py
*/
module.exports.getPythonModules = function (callback) {
  const pyPath = this.getPythonPath()
  const pyDir = this.getPythonAppDir()
  const script = path.join(pyDir, 'list_modules.py')
  const lm = spawn(pyPath.pythonBin, [script], {
    cwd: pyDir,
    env: {
      PATH: pyPath.pythonPath + pyPath.delimiter + process.env.PATH,
      PYTHONIOENCODING: 'utf-8'
    }
  })
  lm.stderr.on('data', (data) => {
    console.log('controller.getPythonModules: ' + _utf8ArrayToStr(data))
  })
  lm.stdout.on('data', (data) => {
    if (typeof callback === 'function') {
      callback(_utf8ArrayToStr(data))
    }
  })
  lm.on('close', (code) => {
    console.log('controller.getPythonModules child ' +
      `process exited with code ${code}`)
  })
}

/*
  Check to see if required Python modules are installed. Ask the user to
  install what's missing. See app/python/check_depends.py
*/
module.exports.getPythonDepends = function () {
  const pyPath = this.getPythonPath()
  const pyDir = this.getPythonAppDir()
  const script = path.join(pyDir, 'check_depends.py')
  const cd = spawn(pyPath.pythonBin, [script], {
    cwd: pyDir,
    env: {
      PATH: pyPath.pythonPath + pyPath.delimiter + process.env.PATH,
      PYTHONIOENCODING: 'utf-8'
    }
  })
  cd.stderr.on('data', (data) => {
    const options = {
      title: 'Python Modules?',
      type: 'info',
      message: _utf8ArrayToStr(data),
      buttons: []
    }
    window.remote.dialog.showMessageBox(window.view.currentWindow, options)
  })
  cd.on('close', (code) => {
    console.log('controller.getPythonDepends child ' +
      `process exited with code ${code}`)
  })
}
