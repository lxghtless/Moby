// Modules
const {ipcRenderer} = require('electron')
const tasks = require('./tasks.js')
const menu = require('./menu.js')
require('bootstrap/js/dist/modal')

// Load tasks at startup
if(tasks.taskList.length) {
  tasks.taskList.forEach(tasks.addTask)
}

$('#add-modal').on('show.bs.modal', function(e) {
  var status = $(e.relatedTarget).data('status-id')
  $('#taskTitle').val('');
  $('#taskDetail').val('');
  $('#taskStatus').val(status);
})

$('#del-button').click(() => {
  console.log($(document.activeElement))
  tasks.updateTask(tasks.taskList, '1560906999221', "Archive")
  tasks.saveTasks()
})

// Handle add-modal submission
$('#add-button').click(() => {
  var newTaskTitle = $('#taskTitle').val()
  var newTaskDetail = $('#taskDetail').val()
  var newTaskTheme = $('#chooseTheme input:radio:checked').val() || 1
  var newTaskStatus = $('#taskStatus').val()
  var newTaskId = new Date().valueOf()
  var newTaskData = {"TaskStatus":newTaskStatus, "TaskId":newTaskId, "TaskTitle":newTaskTitle, "TaskDetail":newTaskDetail, "TaskTheme":newTaskTheme}
  tasks.taskList.push(newTaskData)
  tasks.saveTasks()
  tasks.addTask(newTaskData)
})

// Drag and drop events
exit = (e) => {
  const remote = require('electron').remote
  let w = remote.getCurrentWindow()
  w.close()
}
allowDrop = (e) => {
  e.preventDefault()
}
drag = (e) => {
  e.dataTransfer.setData("text", e.target.id)
}
drop = (e) => {
  e.preventDefault()
  var data = e.dataTransfer.getData('text')
  let col;
  if(e.target.id.substring(0,3) == 'col') {
    e.target.appendChild(document.getElementById(data))
    col = e.target.getAttribute('id').substring(3);
  } else if (e.target.parentElement.parentElement.id.substring(0,3) == 'col') {
    col = e.target.parentElement.parentElement.getAttribute('id').substring(3);
    e.target.parentElement.parentElement.appendChild(document.getElementById(data))
  } else if (e.target.id.substring(0,4) == 'host') {
    col = e.target.id.substring(4,e.target.id.length)
    document.getElementById('col'+col).appendChild(document.getElementById(data))
  } else {
    return;
  }
  tasks.updateTask(tasks.taskList, data, col)
  tasks.saveTasks()
}