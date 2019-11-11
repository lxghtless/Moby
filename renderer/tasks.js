/* global tasks, activeTask */
// Track taskList with array
exports.taskList = JSON.parse(localStorage.getItem('taskList')) || []

// Save taskList to localstorage
exports.saveTasks = () => {
  localStorage.setItem('taskList', JSON.stringify(this.taskList))
}

// Update task status helper function
exports.updateTaskStatus = (taskId, taskStatus) => {
  this.taskList.find(task => parseInt(task.TaskId) === parseInt(taskId)).TaskStatus = taskStatus
  this.taskList.find(task => parseInt(task.TaskId) === parseInt(taskId)).StatusDate = Date.now()
}

// Clone task to 'do'
exports.cloneTask = (taskId, taskStatus) => {
  if (taskId) {
    var getTask = tasks.taskList.find(task => parseInt(task.TaskId) === parseInt(taskId))
    // var newTaskStatus = taskStatus ? getTask.StartDate > Date.now() ? 'schedule' : 'do' : taskStatus
    var newTaskStatus = taskStatus !== undefined ? taskStatus : getTask.StartDate > Date.now() ? 'schedule' : 'do'
    var newTaskData = {
      TaskStatus: newTaskStatus,
      TaskId: new Date().valueOf(),
      TaskTitle: getTask.TaskTitle,
      TaskDetail: getTask.TaskDetail,
      TaskTheme: getTask.TaskTheme,
      Count: getTask.Count,
      StartDate: getTask.StartDate,
      WeekDay: getTask.WeekDay,
      MonthDay: getTask.MonthDay,
      Tags: getTask.Tags
    }
    tasks.taskList.push(newTaskData)
    tasks.saveTasks()
    tasks.addTask(newTaskData)
  }
}

// Add task(s) to UI
exports.addTask = task => {
  let tagHTML = ''
  if (task.Tags && task.Tags.length > 0) {
    task.Tags.forEach((item) => {
      tagHTML += `<div class="card tags">${item}</div>`
    })
  }
  const taskHTML = `<div class="card theme-${task.TaskTheme}" id="${task.TaskId}" data-toggle="collapse" data-target="#c${task.TaskId}" draggable="true" ondragstart="drag(event)">
                    <div id="b${task.TaskId}" >${task.TaskTitle}</div>
                    <div class="collapse collapse-content" id="c${task.TaskId}">
                      <p style="white-space: pre-wrap;">${task.TaskDetail}</p>
                      <div class="tag-box" id="t${task.TaskId}">${tagHTML}</div>
                      <div class="card-menu">
                        <div class="card-menu-item-del fas fa-minus-square" id="del-button"></div>
                        <div class="card-menu-item-clone fas fa-clone" id="clone-button-${task.TaskId}"></div>
                        <div class="card-menu-item-edit fas fa-edit" id="edit-button" href="#task-modal" data-toggle="modal" data-type-id="edit"></div>
                      <div>
                    </div>
                  </div>`
  // Add task HTML to host
  $(`#col-${task.TaskStatus}`).append(taskHTML)
  // Active task setting event
  $('.card').on('click', function () {
    window.activeTask = this.id
  })
  // Delete active task (send to archive)
  $('.card-menu-item-del').click(() => {
    if (activeTask) {
      document
        .getElementById('col-archive')
        .appendChild(document.getElementById(activeTask))
      tasks.updateTaskStatus(activeTask, 'archive')
      tasks.saveTasks()
    }
  })
  // Clone active task (to 'do')
  $(`#clone-button-${task.TaskId}`).click(() => {
    this.cloneTask(activeTask)
  })
}
