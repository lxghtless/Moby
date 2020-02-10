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
  tasksJson,
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

  const tasksJsonStr = JSON.stringify(tasksJson, null, 4)
  const tasksContentBuffer = Buffer.from(tasksJsonStr, 'utf8')
  const tasksContentBase64 = tasksContentBuffer.toString('base64')

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
    content: tasksContentBase64,
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
  /**
   * Loads initial state and wires on dom events
   */
  load () {
    const {
      ghSyncEnabled,
      ghPersonalAccessToken,
      ghApiEndpoint,
      ghRepository
    } = this.getSettings()

    // load state
    $('#ghSyncEnabled').prop('checked', ghSyncEnabled)
    $('#ghPersonalAccessTokent').text(ghPersonalAccessToken)
    $('#ghApiEndpoint').text(ghApiEndpoint)
    $('#ghRepository').text(ghRepository)
    $('#gh-sync-enabled-text').text(service.getGhSyncEnabledText())

    if (!this.initialized) {
      // wire dom events to service handlers
      $('#gh-new-personal-access-token-button').click(this.onOpenNewGhPersonalAccessTokenClick)
      $('#ghSyncEnabled').change(this.onGhSyncEnabledToggle)
      $('#ghPersonalAccessTokent').change(this.onGhPersonalAccessTokenChange)
      $('#ghApiEndpoint').change(this.onGhApiEndpointChange)
      $('#ghRepository').change(this.onGhRepositoryChange)

      this.initialized = true
    }
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
    $('#ghPersonalAccessToken').prop('readonly', !settings.ghSyncEnabled)
    $('#ghApiEndpoint').prop('readonly', !settings.ghSyncEnabled)
    $('#ghRepository').prop('readonly', !settings.ghSyncEnabled)
    $('#ghSyncEnabled').prop('checked', settings.ghSyncEnabled)
    $('#gh-sync-enabled-text').text(service.getGhSyncEnabledText())
  },
  onGhPersonalAccessTokenChange: () => {
    const ghPersonalAccessToken = $('#ghPersonalAccessToken').val()
    service.mergeSettings({ ghPersonalAccessToken })
  },
  onGhApiEndpointChange: () => {
    const ghApiEndpoint = $('#ghApiEndpoint').val()
    service.mergeSettings({ ghApiEndpoint })
  },
  onGhRepositoryChange: () => {
    const ghRepository = $('#ghRepository').val()
    service.mergeSettings({ ghRepository })
  }
})

module.exports = service = serviceFactory()
