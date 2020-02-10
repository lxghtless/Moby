## Moby
Moby is a Kanban based personal task management system built with Electron.

## Using the code
    Clone repo
    Provided instructions assume you are using npm as your package manager
    Code has not been tested with other package managers such as Yarn
    Navigate to directory and run 'npm install' to install dependencies

## Running the code
    'npm start' will launch the app (alternatively you can use 'electron .')
    You can uncomment the dev tools load on start up in main.js (~webContents.openDevTools()) or launch from help menu to debug
    To debug main.js you can use the following commands (assumes you are using npm):
    'npm run debug' will launch in main process debug mode on port 6969
    'npm run break' will launch the app and break at entry point also on port 6969
    Use chrome://inspect and configure the target with above port

## VSCode Suggested Plugins and Settings

> settings.json

```json
{
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "eslint.format.enable": true,
    "javascript.format.enable": false
}
```

<b> Plugins </b>

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Bracket Pair Colorizer 2](https://marketplace.visualstudio.com/items?itemName=CoenraadS.bracket-pair-colorizer-2)
- [Highlight Matching Tag](https://marketplace.visualstudio.com/items?itemName=vincaslt.highlight-matching-tag)

## Other
  A fully packaged app is not yet avaliable.
  Tested on MacOS (Mojave & Catalina), Windows 10 (1903) and Linux (Mint 19.3)