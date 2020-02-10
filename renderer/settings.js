/** @module Settings
 * This module centers it's self around "no save click" needed logic,
 * mainly because I'm lazy and don't like clicking save
 * @returns Settings Service
 */
const { shell } = require('electron')
const { URL } = require('url')
const { Octokit } = require('@octokit/rest')

// TODO: Rename all id's to follow spine case like the rest of the code

// TODO: Refactor this to not be so 🤮 ... maybe turn it into a class
// instead of a factoryFunction or just use a pure function approach
// with a boxed global state

/** @scope scoped variable handle for settings service */
let service = null

const parseGhRepository = (ghRepository) => {
  const uri = new URL(ghRepository)
  const pathParts = uri.pathname.split('/')
  const owner = pathParts[1]
  const repo = pathParts[2]
  return {
    owner,
    repo
  }
}

const isNullOrEmpty = (str) => {
  if (str && str.trim().length !== 0) {
    return false
  }

  return true
}

const createOrUpdateTasksFile = async ({
  json,
  fileName,
  ghRepository,
  ghPersonalAccessToken,
  ghApiEndpoint
}) => {
  let octokit

  if (isNullOrEmpty(ghApiEndpoint)) {
    octokit = new Octokit()
  } else {
    octokit = new Octokit({
      baseUrl: ghApiEndpoint
    })
  }

  const headers = {
    Authorization: `token ${ghPersonalAccessToken}`
  }

  const {
    owner,
    repo
  } = parseGhRepository(ghRepository)

  const jsonStr = JSON.stringify(json, null, 4)
  const jsonBuffer = Buffer.from(jsonStr, 'utf8')
  const jsonBase64 = jsonBuffer.toString('base64')

  let existing

  try {
    existing = await octokit.repos.getContents({
      headers,
      owner,
      repo,
      path: fileName
    })
  } catch (error) {
    if (error.status !== 404) {
      throw error
    }
  }

  let sha
  let messageVerb = 'created'

  if (existing) {
    sha = existing.data.sha
    messageVerb = 'updated'
  }

  const response = await octokit.repos.createOrUpdateFile({
    headers,
    owner,
    repo,
    path: fileName,
    message: `tasks json file ${fileName} ${messageVerb} via Moby`,
    content: jsonBase64,
    sha
  })

  return response
}

// /repos/:owner/:repo/contents/:path

/** @factoryFunction Creates a settings service instance */
const serviceFactory = () => ({
  /** @prop local storage key */
  localStorageKey: 'settings',
  /** @prop default base api url */
  defaultGithubApiUrl: 'https://api.github.com',
  /** @class SettingsType representing stored settings with default values */
  defaultSettings: {
    ghSyncEnabled: false,
    ghPersonalAccessToken: null,
    ghApiEndpoint: null,
    ghRepository: null
  },
  /** @prop flag indicating if the service has been initialized or not */
  initialized: false,
  /** @prop flag indicating if the sync service has been initialized or not */
  initializedSync: false,
  /**
   * Loads initial state and wires on dom events
   */
  load () {
    if (!this.initialized) {
      // wire dom events to service handlers
      $('#gh-new-personal-access-token-button').click(this.onOpenNewGhPersonalAccessTokenClick)
      $('#gh-sync-enabled').change(this.onGhSyncEnabledToggle)
      $('#gh-personal-access-token').change(this.onGhPersonalAccessTokenChange)
      $('#gh-api-endpoint').change(this.onGhApiEndpointChange)
      $('#gh-repository').change(this.onGhRepositoryChange)

      this.initialized = true
    }

    const {
      ghSyncEnabled,
      ghPersonalAccessToken,
      ghApiEndpoint,
      ghRepository
    } = this.getSettings()

    // load state
    $('#gh-personal-access-token').val(ghPersonalAccessToken)
    $('#gh-api-endpoint').val(ghApiEndpoint)
    $('#gh-repository').val(ghRepository)
    $('#gh-sync-enabled').prop('checked', ghSyncEnabled)
    $('#gh-sync-enabled-text').text(this.getGhSyncEnabledText())
  },
  loadSync () {
    if (!this.initializedSync) {
      $('#sync-tasks-button').click(this.onSyncTasksClick)
      this.initializedSync = true
    }

    $('#sync-tasks-success-message').text('')
    $('#sync-tasks-danger-message').text('')
    $('#sync-tasks-info-message').text('Click "Sync Tasks" to save local headers & tasks with your configured Github settings')
  },
  /**
   * Sets new SettingsType value
   *
   * @param {SettingsType} settings
  */
  setSettings (settings) {
    localStorage.setItem(
      this.localStorageKey,
      JSON.stringify(settings)
    )
  },
  /**
   * Gets current {SettingsType} value
   *
   * @returns {SettingsType}
  */
  getSettings () {
    let settings = localStorage.getItem(this.localStorageKey)

    if (!settings) {
      settings = this.defaultSettings
      this.setSettings(settings)
    } else {
      settings = JSON.parse(settings)
    }

    return settings
  },
  /**
   * Merges current {SettingsType} value with partial {SettingsTypes}
   *
   * @returns {SettingsType}
  */
  mergeSettings (partial) {
    const mergedSettings = Object.assign(this.getSettings(), partial)
    this.setSettings(mergedSettings)
    return mergedSettings
  },
  /**
   * Formats Github Sync Enabled or Disabled Toggle Text
   *
   * @returns {String}
  */
  getGhSyncEnabledText () {
    const { ghSyncEnabled } = this.getSettings()
    return `Github Sync Feature ${ghSyncEnabled ? 'Enabled' : 'Disabled'}`
  },
  async syncTasksJson ({
    tasksJson,
    fileName
  }) {
    const {
      ghRepository,
      ghPersonalAccessToken,
      ghApiEndpoint
    } = this.getSettings()
    const { data } = await createOrUpdateTasksFile({
      tasksJson,
      fileName,
      ghRepository,
      ghPersonalAccessToken,
      ghApiEndpoint
    })

    return data
  },
  /*
    "on" DOM Events:
    event handlers need to reference this by this scoped service variable
  */
  onOpenNewGhPersonalAccessTokenClick () {
    shell.openExternal('https://github.com/settings/tokens/new')
  },
  onGhSyncEnabledToggle: () => {
    const settings = service.getSettings()
    settings.ghSyncEnabled = !settings.ghSyncEnabled
    service.setSettings(settings)
    $('#gh-personal-access-token').prop('readonly', !settings.ghSyncEnabled)
    $('#gh-api-endpoint').prop('readonly', !settings.ghSyncEnabled)
    $('#gh-repository').prop('readonly', !settings.ghSyncEnabled)
    $('#gh-sync-enabled').prop('checked', settings.ghSyncEnabled)
    $('#gh-sync-enabled-text').text(service.getGhSyncEnabledText())
  },
  onGhPersonalAccessTokenChange: () => {
    const ghPersonalAccessToken = $('#gh-personal-access-token').val()
    service.mergeSettings({ ghPersonalAccessToken })
  },
  onGhApiEndpointChange: () => {
    const ghApiEndpoint = $('#gh-api-endpoint').val()
    service.mergeSettings({ ghApiEndpoint })
  },
  onGhRepositoryChange: () => {
    const ghRepository = $('#gh-repository').val()
    service.mergeSettings({ ghRepository })
  },
  onSyncTasksClick: async () => {
    try {
      $('#sync-tasks-success-message').text('')
      $('#sync-tasks-danger-message').text('')
      $('#sync-tasks-info-message').text('sync in progress...')
      const headers = localStorage.getItem('headers') || '[]'
      const taskList = localStorage.getItem('taskList') || '{}'
      const {
        ghRepository,
        ghPersonalAccessToken,
        ghApiEndpoint
      } = service.getSettings()

      let params = {
        json: JSON.parse(headers),
        fileName: 'moby-headers.json',
        ghRepository,
        ghPersonalAccessToken,
        ghApiEndpoint
      }

      await createOrUpdateTasksFile(params)

      $('#sync-tasks-info-message').text('headers sync complete. sync tasks in progress...')
      console.log('sync headers complete. sync tasks started')

      params = {
        json: JSON.parse(taskList),
        fileName: 'moby-tasks.json',
        ghRepository,
        ghPersonalAccessToken,
        ghApiEndpoint
      }

      await createOrUpdateTasksFile(params)

      $('#sync-tasks-info-message').text('')
      $('#sync-tasks-success-message').text('headers and tasks sync completed.')
      console.log('sync complete')
    } catch (error) {
      $('#sync-tasks-error-message').text('whoops! something went wrong :(')
      console.error(error)
    }
  }
})

module.exports = service = serviceFactory()
