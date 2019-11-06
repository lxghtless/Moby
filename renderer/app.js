/* global activeTask */
// Modules and variable definition
const { ipcRenderer } = require('electron')
const tasks = require('./tasks')
const fs = require('fs')
require('bootstrap/js/dist/modal')
let desktopPath = ''
let taskType = 1

// Load tasks at startup
if (tasks.taskList.length && document.getElementById('main-window')) {
  tasks.taskList.forEach(tasks.addTask)
  addScheduledTasks()
  window.setInterval(addScheduledTasks, 86400000)
}

// IPC event to get system desktop path
ipcRenderer.on('desktopPath', (e, data) => {
  desktopPath = data
})

// IPC events/channels to act on screen state
ipcRenderer.on('efs', (e) => {
  $('.wrapper').css('grid-template-rows', '0px 1fr')
})

ipcRenderer.on('lfs', (e) => {
  $('.wrapper').css('grid-template-rows', '17px 1fr')
})

// IPC event to get task data from tray window
ipcRenderer.on('quick-data', (e, data) => {
  tasks.taskList.push(data)
  tasks.saveTasks()
  tasks.addTask(data)
})

// Scheduled tasks handler
function addScheduledTasks () {
  /* Schedule logic
  if in 'schedule' status && date < now
  if count = 1 move scheduled to today
  if count > 1 clone task to today, reduce count (except forever -1) and update start date
  */
  if (tasks.taskList.length) {
    tasks.taskList.forEach((item) => {
      if (item.TaskStatus === 'schedule' && item.StartDate < Date.now()) {
        tasks.cloneTask(item.TaskId)
        var i = item.Count > 0 ? item.Count - 1 : item.Count
        var getTask = tasks.taskList.find(task => parseInt(task.TaskId) === parseInt(item.TaskId))
        getTask.Count = i
        getTask.StartDate = getTask.StartDate + (86400000 * 7 * getTask.MonthDay)
        tasks.saveTasks()
      }
    })
  }
}

// Task menu commands
window.openTask = (type) => {
  taskType = type
  $('#task-modal').modal('show')
}

window.deleteTask = () => {
  if (activeTask) {
    document
      .getElementById('col-archive')
      .appendChild(document.getElementById(activeTask))
    tasks.updateTaskStatus(tasks.taskList, activeTask, 'archive')
    tasks.saveTasks()
  }
}

// Task modal load; recieves new vs edit
$('#task-modal').on('show.bs.modal', function (e) {
  console.log($(e.relatedTarget).data('type-id'))
  console.log($(e.currentTarget).data('type-id'))
  taskType = $(e.relatedTarget).data('type-id') === 'new' ? taskType = 0 : 1
  $('#collapse-sched').collapse('hide')
  if (taskType === 0) {
    $('#task-modal-title').html('New Task')
    $(this).find('form').trigger('reset')
    $('#task-status').val($(e.relatedTarget).data('status-id'))
    $('#choose-days').prop('disabled', true)
  } else {
    $('#task-modal-title').html('Edit Task')
    var getTask = tasks.taskList.find(task => parseInt(task.TaskId) === parseInt(activeTask))
    $('#task-title').val(getTask.TaskTitle)
    $('#task-detail').val(getTask.TaskDetail)
    $('#task-status').val(getTask.TaskStatus)
    $(`#option-${getTask.TaskTheme}`)
      .closest('.btn')
      .button('toggle')
    $('#count-select').val(getTask.Count)
    var dt = new Date(getTask.StartDate)
    $('#start-date').val(dt.getMonth() + 1 + '/' + dt.getDate() + '/' + dt.getFullYear())
    if (getTask.weekDay) {
      $('#check-sun').prop('checked', getTask.WeekDay.includes(0))
      $('#check-mon').prop('checked', getTask.WeekDay.includes(1))
      $('#check-tue').prop('checked', getTask.WeekDay.includes(2))
      $('#check-wed').prop('checked', getTask.WeekDay.includes(3))
      $('#check-thu').prop('checked', getTask.WeekDay.includes(4))
      $('#check-fri').prop('checked', getTask.WeekDay.includes(5))
      $('#check-sat').prop('checked', getTask.WeekDay.includes(6))
    }
    $('#radio-recur').val(getTask.MonthDay)
  }
})

// Focus title field on modal 'shown'
$('#task-modal').on('shown.bs.modal', function (e) {
  $('#task-title').focus()
})

// Recurrence elements enable logic
function enableRecur () {
  $('#choose-days').prop('disabled', false)
  $('#count-select').prop('disabled', false)
  $('#recur-count').removeClass('disabled-form-label')
}

// Active radio button change events
$('#radio-weekly').click(() => {
  enableRecur()
})

$('#radio-biWeekly').click(() => {
  enableRecur()
})

$('#radio-triWeekly').click(() => {
  enableRecur()
})

$('#radio-monthly').click(() => {
  enableRecur()
})

$('#radio-once').click(() => {
  $('#choose-days').prop('disabled', true)
  $('#count-select').val(1)
  $('#count-select').prop('disabled', true)
  $(':checkbox').prop('checked', false)
  $('#recur-count').addClass('disabled-form-label')
})

// Task modal submit task logic
$('#submit-button').click(() => {
  var taskTitle = $('#task-title').val() || 'No Title'
  var taskDetail = $('#task-detail').val()
  var taskTheme = $('#choose-theme input:radio:checked').val() || 1
  var taskStatus = $('#task-status').val().toLowerCase()
  var taskId = Date.now()
  var count = $('#count-select').val() || 1
  var startDate = new Date(Date.parse($('#start-date').val()) || Date.now()).getTime()
  var monthDay = $('#choose-recur input:radio:checked').val() || 0
  var weekDay = []
  $('#check-sun').prop('checked') && weekDay.push(0)
  $('#check-mon').prop('checked') && weekDay.push(1)
  $('#check-tue').prop('checked') && weekDay.push(2)
  $('#check-wed').prop('checked') && weekDay.push(3)
  $('#check-thu').prop('checked') && weekDay.push(4)
  $('#check-fri').prop('checked') && weekDay.push(5)
  $('#check-sat').prop('checked') && weekDay.push(6)
  if (weekDay.length < 1 && monthDay > 0) {
    weekDay.push(new Date(startDate).getDay())
  }
  count *= weekDay.length > 0 ? weekDay.length : 1
  if (startDate > Date.now()) {
    taskStatus = 'schedule'
  }
  var newTaskData = {
    TaskStatus: taskStatus,
    TaskId: taskId,
    TaskTitle: taskTitle,
    TaskDetail: taskDetail,
    TaskTheme: taskTheme,
    Count: count,
    StartDate: startDate,
    WeekDay: weekDay,
    MonthDay: monthDay
  }
  if (taskType === 0) {
    tasks.taskList.push(newTaskData)
  } else {
    var getTask = tasks.taskList.find(task => parseInt(task.TaskId) === parseInt(activeTask))
    getTask.TaskTitle = taskTitle
    getTask.TaskDetail = taskDetail
    getTask.TaskTheme = taskTheme
    getTask.TaskStatus = taskStatus
    getTask.Count = count
    getTask.StartDate = startDate
    getTask.WeekDay = weekDay
    getTask.MonthDay = monthDay
    document.getElementById(getTask.TaskId).remove()
  }
  tasks.saveTasks()
  tasks.addTask(newTaskData)
})

// Execute task modal submit on enter except when in detail field
$('#task-modal').keypress(function (e) {
  if (e.which === 13 && !$('#task-detail').is(':focus')) {
    $('#submit-button').click()
  }
})

// Restore archived task to 'Do' column
$('#restore-button').click(() => {
  document
    .getElementById('col-do')
    .appendChild(document.getElementById(activeTask))
  tasks.updateTaskStatus(tasks.taskList, activeTask, 'do')
  tasks.saveTasks()
  $('#restore-modal').modal('hide')
})

// Exports all tasks to file to desktop
$('#export-button').click(() => {
  if (tasks.taskList.length) {
    var JSONexport = JSON.stringify(tasks.taskList)
    fs.writeFile(`${desktopPath}/moby_export.txt`, JSONexport, err => {
      if (err) {
        alert('An error during the export ' + err.message)
        return
      }
      alert(
        'The export has completed succesfully and is located on your desktop'
      )
    })
  }
})

// Imports all tasks (even duplicates) from file from desktop
// TODO: handle dupes
$('#import-button').click(() => {
  fs.readFile(`${desktopPath}/moby_export.txt`, (err, data) => {
    if (err) {
      alert('An error during the import ' + err.message)
      return
    }
    var JSONimport = JSON.parse(data)
    if (JSONimport.length) {
      JSONimport.forEach(item => {
        tasks.taskList.push(item)
      })
      tasks.saveTasks()
      JSONimport.forEach(tasks.addTask)
      alert('The import has completed succesfully')
    } else {
      alert('No records found')
    }
  })
})

// Collapse all task elements on hover outside of tasks
// TODO: Fix cludgie implementation
// $('.wrapper').hover(() => {
//   $('.collapse').collapse('hide')
// })

// Completely close app
const exit = e => {
  const remote = require('electron').remote
  remote.app.exit()
}

// Task drag and drop events
const allowDrop = e => {
  e.preventDefault()
}

const drag = e => {
  e.dataTransfer.setData('text', e.target.id)
}

const drop = e => {
  e.preventDefault()
  var data = e.dataTransfer.getData('text')
  let col
  if (e.target.id.substring(0, 3) === 'col') {
    e.target.appendChild(document.getElementById(data))
    col = e.target.getAttribute('id').substring(4)
  } else if (e.target.parentElement.parentElement.id.substring(0, 3) === 'col') {
    col = e.target.parentElement.parentElement.getAttribute('id').substring(4)
    e.target.parentElement.parentElement.appendChild(
      document.getElementById(data)
    )
  } else if (e.target.id.substring(0, 4) === 'host') {
    col = e.target.id.substring(5, e.target.id.length)
    document
      .getElementById('col-' + col)
      .appendChild(document.getElementById(data))
  } else {
    return
  }
  tasks.updateTaskStatus(tasks.taskList, data, col)
  tasks.saveTasks()
}
