const { app, BrowserWindow } = require('electron')
const { spawn } = require('child_process')
const path = require('path')

let mainWindow
let pythonProcess

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Start Python backend
  pythonProcess = spawn('python', ['../app.py'])
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python: ${data}`)
  })
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`)
  })

  // Load local app
  mainWindow.loadURL('http://localhost:5000')

  mainWindow.on('closed', function () {
    mainWindow = null
    pythonProcess.kill()
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})
