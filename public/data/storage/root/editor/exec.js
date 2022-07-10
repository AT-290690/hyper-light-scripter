import { API, QUINE } from './common.js';
import editor from './index.js';
export default instance => {
  instance.FSM_DELAY = 50;
  instance.CMD_HISTORY = [];
  instance.CMD_HISTORY_POINTER = 0;
  instance.tempExecVariables = {};
  instance.NEXT_CMD = null;
  const createExpTime = () => {
    // const expTime = new Date().getTime() + 60 * 60 * (1000 * 1);
    instance.temporal = false;
    // instance.expTime = expTime;
    instance.elements.getKeyButton.classList.remove('shake');
    // return expTime;
  };
  const mediumPassRegex = new RegExp(
    '((?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{6,}))|((?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])(?=.{8,}))'
  );
  instance.exec = function (standartInput) {
    if (this.NEXT_CMD) {
      const CMD = this.NEXT_CMD;
      this.NEXT_CMD = null;
      this.exec(CMD + ' ' + this.elements.consoleInputField.value.trim());
      return;
    }
    this.CMD_HISTORY.push(standartInput);
    this.CMD_HISTORY_POINTER++;
    const input = standartInput
      ?.trim()
      .replace(/\s\s+/, ' ')
      .split(' ')
      .map(x => x.trim());
    const raw = input?.shift();
    const command = raw.toUpperCase();
    switch (command) {
      case 'HELP':
      case 'COMMON':
        this.clearInputs();
        this.editor.setValue(`/*
 FIND - finds scripts
 PRIVATE / PUBLIC - finds user private / public scripts

 ADD -  adds project
 IN - suffix for ADD - create a folder for the project
 SWITCH/NEXT - same as ADD but clears prev project first
 
 DIR - list directories
 OPEN - selects file

 SHOW - shows window
 HIDE  - hides window

 SAVE - saves current file
 DELETE - removes a file

 COMMIT - collects project
 PUSH - deploy project
 UPLOAD - commit + deploy
 BUILD - commit + deploy + build link for temp app (HYPER_LIGHT)
 DROP - delete script if you own it.

 CHECK - opens a specific loaded package
 PEEK - opens a specific loaded package by index

 E - clear the editor without focusing on it

 SIGN - login with inline token
 REGISTER - create account
 LINK - create a link for script
 HYPER_LIGHT/HYPER - create a link for temporal app
 
 REFRESH - refreshes the app
 RELOAD - reload editor
 
 RUN - runs code ignoring lint erros
 DEBUG - runs code and if there are any runtime errors it displays them
 
 // - creates a comment from selection or input
 / remove a comment from selection
 
  writting nothing and pressing enter runs the code if no lint erros are found
  selecting a word staring with >>> and pressing enter in a blank text runs it as executable
  selecting a word starting with >_ and pressing enter creates a script
  selecting a word starting with ... and pressing enter pastes it in the editor by clearing it first
  
 */`);
        break;
      case 'PORTAL':
        this.editor.replaceSelection(this.userId);
        break;
      case 'DROP':
        const name = input[0]?.trim();
        if (!name)
          return this.log('Missing name of script to delete.', 'error');
        fetch(`${API}/storage/drop`, {
          method: 'DELETE',
          headers: {
            credentials: 'same-origin',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: this.userId, name })
        })
          .then(res => res.json())
          .then(res =>
            res.success
              ? this.log(`Script ${name} deleted!`)
              : this.log(`Failed to script ${name}!`, 'error')
          )
          .catch(err => this.log(err.message, 'error', err.status));
        break;
      case 'LOAD':
        {
          const KEY = input[0]?.trim() || '';
          const FILE = input[1]?.trim() || '';
          if (!KEY || !FILE) return this.log(`Provide KEY and FILENAME!`);
          fetch(
            `${API}/data/${this.selectedStorage}/portals/${
              KEY === 'KEY' ? this.userId : KEY
            }/${input[1].trim()}`,
            { headers: { credentials: 'same-origin' } }
          )
            .then(file => file.text())
            .then(content => {
              if (input[2]?.trim()?.toUpperCase() === 'IN') {
                const path = this.correctFilePath(
                  input[3]?.trim() || new Date().getTime() + '.txt'
                );
                this.saveFile(path, content);
              } else {
                this.editor.addValue('\n' + content);
              }
            })
            .catch(err => this.log(err.message, 'error', err.status));
        }
        break;
      case 'FOCUS':
        this.FSM_lock();
        this.margin.y = 35;
        this.progressBarBottom = 30;
        this.elements.interfaceContainer.style.visibility = 'hidden';
        this.elements.interfaceContainer.style.position = 'absolute';
        this.elements.interfaceContainer.style.top = -35;
        this.responsiveResize();
        this.FSM_unlock();
        break;
      case 'UNFOCUS':
        this.FSM_lock();
        this.margin.y = 77;
        this.progressBarBottom = 35;
        this.elements.interfaceContainer.style.position = 'static';
        this.elements.interfaceContainer.style.top = 0;
        this.elements.interfaceContainer.style.visibility = 'visible';
        this.responsiveResize();
        this.FSM_unlock();
        break;

      case 'RUN':
        {
          this.elements.appWindow.src = '';
          this.elements.appWindow.src = `../../portals/${
            this.userId
          }/${'index'}.html`;
        }
        break;
      case 'RF':
      case 'REFRESH':
        {
          this.elements.appWindow.src = '';
          this.elements.appWindow.src = `../../portals/${this.userId}/${
            input[0]?.trim() || 'index'
          }.html`;
          this.elements.appWindow.style.height = this.height + 'px';
          this.resizeX(
            document.body.clientWidth <= 600 ? 8 : this.initialResize
          );
          this.elements.resizerElement.style.display = 'block';
          this.elements.appWindow.style.display = 'block';
          this.isAppOpened = true;
        }
        break;
      case 'RELOAD':
        this.reload();
        break;
      case 'LOGOUT':
        {
          fetch(`${API}/${this.selectedStorage}/logout`, {
            method: 'POST',
            headers: {
              credentials: 'same-origin',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: this.userId })
          }).then(() => {
            this.StorageProvider.removeItem('hyper_light_scripter_id' + QUINE);
            this.userId = null;
            // this.reload(() => {
            //   this.log(`Logout successful!`);
            // });
          });
        }
        break;
      case 'TEMPORARY_SESSION':
      case 'RESET': {
        const userDir = this.userId;
        navigator.sendBeacon(
          `${API}/${this.selectedStorage}/disconnect?userId=${userDir}`
        );
        this.StorageProvider.removeItem('hyper_light_scripter_id' + QUINE);
        this.reload(() => {
          this.elements.getKeyButton.click();
          this.editor.setValue('');
        });
        break;
      }
      case 'REGISTER':
        this.elements.consoleInputField.value = '';
        this.elements.consoleInputField.type = 'password';
        this.changeMode('text/plain');
        this.editor.setValue(
          `Enter your password in the console.\n\nRequirements:\n 8+ characters\n 1+ numbers\n 1+ upper case letters\n 1+ lower case letters\n 1+ symbols\n\n Don't forget your password!`
        );
        this.NEXT_CMD = 'REGISTER_PASSWORD';
        break;
      case 'REGISTER_PASSWORD':
        {
          this.elements.consoleInputField.type = 'text';
          const pass = input[0]?.trim();
          if (pass.toUpperCase() === 'CANCEL') {
            return this.log('Registration canceled!', 'error');
          } else if (pass && pass.length < 8) {
            this.NEXT_CMD = 'REGISTER_PASSWORD';
            return this.log(
              'Password must be atleast 8 characters long',
              'error'
            );
          } else if (!mediumPassRegex.test(pass)) {
            this.NEXT_CMD = 'REGISTER_PASSWORD';
            return this.log('Your password is not strong enough!', 'error');
          }

          fetch(`${API}/storage/register`, {
            method: 'POST',
            headers: {
              credentials: 'same-origin',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: this.userId, pass })
          })
            .then(res => res.json())
            .then(res => {
              createExpTime();
              this.editor.setValue(`Username: ${res.public}`);
              this.StorageProvider.setItem(
                'hyper_light_scripter_id' + QUINE,
                res.public
              );
              this.CMD_HISTORY = [];
              this.CMD_HISTORY_POINTER = 0;
            })
            .catch(err => this.log(err.message, 'error', err.status));
        }
        break;
      case 'LOGIN':
        this.tempExecVariables['new_username'] = input[0].trim();
        this.tempExecVariables['old_username'] = this.userId;
        this.editor.setValue(`Enter your password in the console`);
        this.elements.consoleInputField.value = '';
        this.elements.consoleInputField.type = 'password';
        this.NEXT_CMD = 'VALIDATE_PASSWORD';
        break;

      case 'VALIDATE_PASSWORD':
        {
          this.elements.consoleInputField.type = 'text';
          const oldId = this.tempExecVariables['old_username'];
          const id = this.tempExecVariables['new_username'];
          this.tempExecVariables = {};
          this.StorageProvider.removeItem('hyper_light_scripter_id' + QUINE);
          this.StorageProvider.removeItem('hyper_light_scripter_temp' + QUINE);
          fetch(`${API}/storage/login`, {
            method: 'POST',
            headers: {
              credentials: 'same-origin',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id,
              oldId,
              pass: input[0]?.trim()
            })
          })
            .then(res => {
              this.dirCache.clear();
              this.clearFileOptions();
              this.fileCache.clear();
              this.tempFiles.clear();
              this.clearInputs();
              if (res.status === 200) {
                this.userId = id;
                this.StorageProvider.setItem(
                  'hyper_light_scripter_id' + QUINE,
                  this.userId
                );
                createExpTime();
                this.log('Logged in!');
              } else {
                this.StorageProvider.removeItem(
                  'hyper_light_scripter_id' + QUINE
                );
                this.StorageProvider.removeItem(
                  'hyper_light_scripter_temp' + QUINE
                );
                this.startup();
              }
              return res.json();
            })
            .then(res => this.log(res.message))
            .catch(err => this.log(err.message, 'error', err.status))
            .finally(() => {
              this.editor.setValue('');
              this.CMD_HISTORY = [];
              this.CMD_HISTORY_POINTER = 0;
            });
        }
        break;
      case 'CACHE':
        {
          const currentInput = input[0]?.trim()?.toUpperCase();
          if (currentInput === 'CLEAR') {
            this.fileCache.clear();
          } else if (currentInput === 'LIMIT') {
            this.MAXIMUM_CACHE_SIZE = +input[1]?.trim();
          } else if (currentInput === 'ALL') {
            this.MAXIMUM_CACHE_SIZE = this.tempFiles.size;
            this.tempFiles.forEach(file => {
              this.loadFileFromCache(file);
            });
          } else if (currentInput === 'DISABLE') {
            this.cacheOn = false;
          } else if (currentInput === 'ENABLE') {
            this.cacheOn = true;
          } else if (!currentInput) {
            console.log(this.fileCache);
          }
        }
        break;
      case 'OPEN':
      case '-':
        {
          const file = input?.[0]?.trim();
          if (!file) return this.log('Missing file to open!', 'error');
          this.selectFile(file);
        }
        break;
      case 'PFX_PREP':
        this.editor.setValue(
          this.editor
            .getValue()
            .split('\n')
            .map(line => 'PREP ' + line)
            .join('\n')
        );
        break;

      case 'PREP':
        this.elements.consoleInputField.value = input.join(' ');
        this.elements.consoleInputField.focus();
        break;
      case 'MODE':
        this.fileModes.set(this.selectedFile, input[0]);
        this.changeMode('r.' + input[0]);
        break;
      case 'FONT':
        if (input[0]?.trim()) {
          this.setFontSize(input[0]);
        }
        break;
      case 'ENTRY':
      case 'CHANGE_ENTRY':
        this.index = input[0]?.trim();
        break;
      case 'BUILDS':
        const script = '';
        const lifespan = +input[2]?.trim() || 10;
        const maxLifeSpan = 30 * 60;
        let prefix = '';
        let sufix = '';
        const line = '\n-------------------------------------------\n';
        fetch(
          `${API}/${this.selectedStorage}/list?find=${'_build_'}&page=${
            parseInt(input[1]) || 0
          }&filter=${this.userId}`,
          { headers: { credentials: 'same-origin' } }
        )
          .then(res => res.json())
          .then(res => {
            this.editor.setValue(
              `${
                res.items?.length > 0
                  ? res.items
                      .map(
                        script =>
                          `${script}${line}${API}/${
                            this.selectedStorage
                          }/temp?script=${script.split('>_')[1]}&portal=${
                            this.userId
                          }&lifespan=${lifespan}${line}\n`
                      )
                      .join('\n')
                  : 'FOUND 0 BUILDS'
              }`
            );
          })
          .catch(err => this.log(err.message, 'error', err.status))
          .finally(() => this.FSM_unlock());
        break;
      case 'BUILD':
        {
          const name = input[0]?.trim();
          if (!name) return this.log('Missing a name of the script!', 'error');
          if (!this.tempFiles.has('/' + this.index))
            return this.log(`Missing ${this.index} file!`, 'error');

          const scriptName = '>_' + name + '_build_' + this.userId;
          fetch(`${API}/${this.selectedStorage}/push`, {
            method: 'POST',
            headers: {
              credentials: 'same-origin',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filename: name + '_build',
              userId: this.userId,
              files: [...this.tempFiles],
              secret: 0
            })
          })
            .then(() => {
              this.log(`${name} deployed!`);
              this.FSM_unlock();
              instance.exec('HYPER_LIGHT ' + scriptName);
            })
            .catch(err => this.log(err.message, 'error', err.status))
            .finally(() => this.FSM_unlock());
        }
        break;
      case 'UPLOAD':
        {
          this.FSM_lock();
          if (this.tempFiles.size === 0) {
            this.lastCommit =
              input[0] +
              '_' +
              this.userId +
              '_fragment_' +
              LZUTF8.compress(this.editor.getValue(), {
                outputEncoding: 'Base64'
              });
            this.log(`Fragment ${input[0] || 'untitled'} is ready!`);
          } else {
            this.lastCommit = input[0];
            this.log(`Package ${input[0] || 'untitled'} is ready!`);
          }
          fetch(`${API}/${this.selectedStorage}/push`, {
            method: 'POST',
            headers: {
              credentials: 'same-origin',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filename: this.lastCommit,
              userId: this.userId,
              files: [...this.tempFiles],
              secret: input[1]?.trim().toLowerCase() === 'secret' ? 1 : 0
            })
          })
            .then(() => {
              this.log(`${this.lastCommit} deployed!`);
              this.lastCommit = 'untitled';
            })
            .catch(err => this.log(err.message, 'error', err.status))
            .finally(() => this.FSM_unlock());
        }
        break;
      case 'CREATE_APP': {
        const content = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Hyper Light App</title>
    <link href="./style.css" rel="stylesheet" href="stylesheet.css" />
  </head>
  <body>
    <script type="module" src="./script.js"></script>
  </body>
</html>
`;
        this.saveFile('/index.html', content);
        this.saveFile(
          '/style.css',
          `body { \n background: black;\n color: white;\n}`
        );
        this.saveFile('/script.js', `(() => {\n\n\n\n})()`);
        this.onLoadCallback(() => {
          this.loadFileFromCache('/index.html');
          this.editor.setValue(content);
          this.changeMode('x.html');
        });
        break;
      }
      case 'MD':
      case 'MARKDOWN':
        this.saveFile(
          '/index.html',
          `<script src="https://cdn.jsdelivr.net/npm/@webcomponents/webcomponentsjs@2/webcomponents-loader.min.js"></script>
        <script type="module" src="https://cdn.jsdelivr.net/gh/zerodevx/zero-md@1/src/zero-md.min.js"></script>
        <zero-md src=".${this.selectedFile}"></zero-md>`
        );
        break;
      case 'JS':
        this.saveFile('/script.js');
        this.saveFile(
          '/index.html',
          '<body><script type="module" src="./script.js"></script></body>'
        );
        this.onLoadCallback(() => {
          this.loadFileFromCache('/script.js');
          this.changeMode('x.js');
        });
        break;
      case 'X':
      case 'EXECUTE':
        {
          const scriptName = input[0]?.trim();
          if (scriptName?.substring(0, 3) === '>>>') {
            const link = `${API}/${this.selectedStorage}/snippets`;
            fetch(link, {
              method: 'POST',
              headers: {
                credentials: 'same-origin',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: scriptName,
                prefix: '',
                userId: this.userId
              })
            })
              .then(response => response.json())
              .then(data => {
                if (data?.files.length === 0) {
                  const decoded = LZUTF8.decompress(data.code, {
                    inputEncoding: 'Base64',
                    outputEncoding: 'String'
                  });
                  this.tempExecVariables['exec_history'] = decoded.split('\n');
                  this.exec('EXEC');
                  this.log(scriptName + ' executed!');
                }
              })
              .catch(err => this.log(err.message, 'error', err.status));
          } else {
            this.log('Invalid script name! Exe scripts must start with >>> ');
          }
        }
        break;
      case 'EXEC':
        {
          clearInterval(this._timeout['exec_interval']);
          let argument = input[0]?.trim()?.toUpperCase();
          if (argument) {
            if (argument === '.') {
              argument = 'FROM';
              input[1] = 'EDITOR';
            }
            if (argument === 'X') {
              argument = 'FROM';
              input[2] = input[1];
              input[1] = 'CLOUD';
            }
          }
          if (argument === 'FROM') {
            const context = input[1]?.trim()?.toUpperCase();
            switch (context) {
              case 'EDITOR':
                this.tempExecVariables['exec_history'] = this.editor
                  .getValue()
                  .trim()
                  .split('\n')
                  .filter(Boolean);
                break;
              case 'FILE':
                {
                  const file = this.convertToRelativePath(input[2]?.trim());
                  if (!this.tempFiles.has(file))
                    return this.log('no such file found!');
                  this.loadFileFromCache(file, value => {
                    this.tempExecVariables['exec_history'] = value
                      .trim()
                      .split('\n')
                      .filter(Boolean);
                    this.unsaved = false;
                    // this.editor.clearHistory();
                    this.elements.saveIndex.textContent = 0;
                  });
                }
                break;
              case 'CLOUD':
                {
                  const scriptName = input[2]?.trim();
                  if (scriptName?.substring(0, 3) === '>>>') {
                    const link = `${API}/${this.selectedStorage}/snippets`;
                    fetch(link, {
                      method: 'POST',
                      headers: {
                        credentials: 'same-origin',
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        name: scriptName,
                        prefix: '',
                        userId: this.userId
                      })
                    })
                      .then(response => response.json())
                      .then(data => {
                        if (data?.files.length === 0) {
                          const decoded = LZUTF8.decompress(data.code, {
                            inputEncoding: 'Base64',
                            outputEncoding: 'String'
                          });
                          this.tempExecVariables['exec_history'] =
                            decoded.split('\n');
                          this.exec('EXEC');
                          this.log(scriptName + ' executed!');
                        }
                      })
                      .catch(err => this.log(err.message, 'error', err.status));
                  } else {
                    this.log(
                      'Invalid script name! Exe scripts must start with >>> ',
                      'error'
                    );
                  }
                }
                break;
              default:
                break;
            }
          }
          if (Array.isArray(this.tempExecVariables['exec_history'])) {
            const state = this.tempExecVariables['exec_history'];
            this._timeout['exec_interval'] = setInterval(() => {
              if (!this.FSM_isLocked) {
                const CMD = state.shift();
                if (CMD) this.exec(CMD);
                if (state.length === 0) {
                  clearInterval(this._timeout['exec_interval']);
                }
              }
            }, this.FSM_DELAY);
          }
        }
        break;
      case 'E':
      case 'EMPTY':
        this.clearInputs();
        this.editor.setValue('');
        this.changeMode('text/plain');
        break;
      case 'BLANK':
        this.clearInputs();
        this.editor.setValue('');
        this.editor.focus();
        this.changeMode('text/plain');
        break;
      case 'OPENTAB':
        window
          .open(
            `${API}/data/${this.selectedStorage}/portals/${this.userId}/${this.index}`,
            '_blank'
          )
          .focus();
        break;
      case 'OPENAPP':
      case 'R':
        this.OpenExternalResource('app');
        break;
      case 'CLOSEAPP':
        if (this.appPopWindow) {
          this.appPopWindow.close();
          this.appPopWindow = null;
        }
        break;
      case 'EXE':
        {
          if (this.tempFiles.size === 0) {
            this.lastCommit =
              '>>>' +
              input[0] +
              '_' +
              this.userId +
              '_fragment_' +
              LZUTF8.compress(this.editor.getValue(), {
                outputEncoding: 'Base64'
              });
            this.log(`Exe ${input[0] || 'untitled'} is ready!`);
          } else {
            this.log(`You must remove your files first! Run FRAGMENT`, 'error');
          }
        }
        break;
      case 'PACK':
      case 'PACKAGE':
      case 'COMMIT':
        {
          if (this.tempFiles.size === 0) {
            this.lastCommit =
              input[0] +
              '_' +
              this.userId +
              '_fragment_' +
              LZUTF8.compress(this.editor.getValue(), {
                outputEncoding: 'Base64'
              });
            this.log(`Fragment ${input[0] || 'untitled'} is ready!`);
          } else {
            this.lastCommit = input[0];
            this.log(`Package ${input[0] || 'untitled'} is ready!`);
          }
        }
        break;
      case 'FRAG':
      case 'FRAGMENT':
        {
          this.fileCache.clear();
          this.tempFiles.clear();
          this.clearFileOptions();
          this.clearInputs();
        }
        break;
      case 'IGNORE_EXCEPT':
        {
          const files = input[0]
            ?.trim()
            .split(',')
            .map(f => this.convertToRelativePath(f));
          this.fileCache.clear();
          this.tempFiles.clear();
          this.clearFileOptions();
          this.clearInputs();
          files.forEach(f => this.tempFiles.add(f));
          this.createFileSelect();
        }
        break;
      case 'CREATE':
        {
          const current = input[0]?.trim();
          if (current) {
            this.saveFile(this.correctFilePath(current));
          }
        }
        break;
      case 'COMPRESS':
      case 'COMP':
        this.editor.setValue(
          LZUTF8.compress(input[0]?.trim() || this.editor.getValue(), {
            outputEncoding: 'Base64'
          })
        );
        break;
      case 'DECOMP':
      case 'DECOMPRESS':
        this.editor.setValue(
          LZUTF8.decompress(input[0]?.trim() || this.editor.getValue(), {
            inputEncoding: 'Base64',
            outputEncoding: 'String'
          })
        );
        break;
      case 'ZIP':
        this.zipFolder();
        this.tempFiles.add('/package.zip');
        this.clearFileOptions();
        this.createFileSelect();
        break;
      case 'SHARE_FOLDER':
      case 'SHARE_PORTAL':
        {
          let out = '';
          let sub = input[0]?.trim() ?? '';
          this.tempFiles.forEach(
            file => (out += `LOAD ${this.userId} ${file} IN ${sub}${file}\n`)
          );

          this.editor.setValue(out);
        }
        break;
      case 'FROM_FOLDER':
        {
          const upload = document.createElement('input');
          upload.setAttribute('webkitdirectory', true);
          upload.setAttribute('multiple', true);

          this.elements.container.appendChild(upload);
          upload.style.display = 'none';
          upload.type = 'file';
          upload.name = 'creds';

          upload.addEventListener(
            'change',
            e => {
              const files = [...e.currentTarget.files].filter(
                file =>
                  !this.ignoredFiles.some(
                    x =>
                      file.webkitRelativePath.includes(x) ||
                      file.name.includes(x)
                  )
              );
              for (let i = 0; i < files.length; i++) {
                const reader = new FileReader();
                reader.onload = async e => {
                  let filePath = files[i].webkitRelativePath.split('/');
                  filePath.shift();
                  filePath = filePath.join('/');
                  let data;
                  try {
                    data = window.atob(e.target.result.split('base64,')[1]);
                  } catch (err) {
                    data = e.target.result;
                  }
                  this.saveFile(this.convertToRelativePath(filePath), data);
                };
                reader.readAsDataURL(files[i]);
              }
            },
            false
          );

          upload.click();
        }
        break;
      case 'FROM_FOLDER_SCRIPT':
        {
          const upload = document.createElement('input');
          upload.setAttribute('webkitdirectory', true);
          upload.setAttribute('multiple', true);

          this.elements.container.appendChild(upload);
          upload.style.display = 'none';
          upload.type = 'file';
          upload.name = 'creds';

          const convert = this.convertToRelativePath;
          upload.addEventListener(
            'change',
            e => {
              const files = e.currentTarget.files;
              for (let i = 0; i < files.length; i++) {
                const reader = new FileReader();
                reader.onload = async e => {
                  let filePath = files[i].webkitRelativePath.split('/');
                  filePath.shift();
                  filePath = filePath.join('/');
                  this.editor.addValue(
                    '\n' +
                      `DECOMPRESS ${
                        e.target.result.split('base64,')[1]
                      }\nSAVE ${convert(filePath)}`
                  );
                };
                reader.readAsDataURL(files[i]);
              }
            },
            false
          );

          upload.click();
        }
        break;
      case 'DOWNLOAD':
      case 'DL':
        {
          const file = this.correctFilePath(input[0]?.trim());
          if (file) this.downloadFile(file);
        }
        break;
      case 'SAVE':
      case 'MAKE':
        {
          const current = input[0]?.trim();
          this.selectedFile = current
            ? this.correctFilePath(current)
            : this.selectedFile;
          this.saveFile();
          this.changeMode(this.selectedFile);
        }
        break;
      case 'PUSH':
        this.FSM_lock();
        fetch(`${API}/${this.selectedStorage}/push`, {
          method: 'POST',
          headers: {
            credentials: 'same-origin',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: this.lastCommit,
            userId: this.userId,
            files: [...this.tempFiles],
            secret: input[0]?.trim().toLowerCase() === 'secret' ? 1 : 0
          })
        })
          .then(() => {
            this.log(`${this.lastCommit} deployed!`);
            this.lastCommit = 'untitled';
          })
          .catch(err => this.log(err.message, 'error', err.status))
          .finally(() => this.FSM_unlock());
        break;
      case 'DELETE':
      case 'DEL':
        {
          const file = input[0]?.trim() || this.selectedFile;
          this.deleteFile(file);
          this.log(`Deleting ${file}!`);
        }
        break;
      case 'PUBLIC':
        {
          this.FSM_lock();
          this.clearInputs();
          this.editor.setValue('');
          this.changeMode('text/plain');
          let prefix = 'ADD ';
          let sufix = ' CX';
          fetch(
            `${API}/${this.selectedStorage}/list?find=${
              input[0]?.trim() || ''
            }&page=${parseInt(input[1]) || 0}&filter=${this.userId}`,
            { headers: { credentials: 'same-origin' } }
          )
            .then(res => res.json())
            .then(res => {
              this.editor.setValue(
                `${
                  res.items?.length > 0
                    ? res.items.map(i => prefix + i + sufix).join('\n')
                    : 'FOUND 0 SCRIPTS'
                }`
              );
            })
            .catch(err => this.log(err.message, 'error', err.status))
            .finally(() => this.FSM_unlock());
        }
        break;
      case 'PRIVATE':
        {
          this.FSM_lock();
          this.clearInputs();
          this.editor.setValue('');
          this.changeMode('text/plain');
          let prefix = 'ADD ';
          let sufix = ' CX';
          fetch(
            `${API}/${this.selectedStorage}/list?find=${
              input[0]?.trim() || ''
            }&secret=1&page=${parseInt(input[1]) || 0}&filter=${this.userId}`,
            { headers: { credentials: 'same-origin' } }
          )
            .then(res => res.json())
            .then(res => {
              this.editor.setValue(
                `${
                  res.items?.length > 0
                    ? res.items.map(i => prefix + i + sufix).join('\n')
                    : 'FOUND 0 SCRIPTS'
                }`
              );
            })
            .catch(err => this.log(err.message, 'error', err.status))
            .finally(() => this.FSM_unlock());
        }
        break;
      case 'RESTORE':
        this.getSnippet(input[0], undefined, 'archive');
        break;
      case 'ARCHIVE':
        {
          this.FSM_lock();
          this.clearInputs();
          this.editor.setValue('');
          this.changeMode('text/plain');
          let prefix = 'RESTORE ';
          fetch(
            `${API}/${this.selectedStorage}/archive?find=${
              input[0]?.trim() || ''
            }&page=${parseInt(input[1]) || 0}&filter=${this.userId}`,
            { headers: { credentials: 'same-origin' } }
          )
            .then(res => res.json())
            .then(res => {
              this.editor.setValue(
                `${
                  res.items?.length > 0
                    ? res.items.map(i => prefix + i).join('\n')
                    : 'FOUND 0 SCRIPTS'
                }`
              );
            })
            .catch(err => this.log(err.message, 'error', err.status))
            .finally(() => this.FSM_unlock());
        }
        break;
      case 'FIND':
        {
          this.FSM_lock();
          this.clearInputs();
          this.editor.setValue('');
          this.changeMode('text/plain');
          let prefix = '';
          let sufix = '';
          const prefixCMD = input[2]?.trim()?.toUpperCase();
          const sufixCMD = input[3]?.trim()?.toUpperCase();
          if (sufixCMD) {
            sufix = ' ' + sufixCMD;
          }
          switch (prefixCMD) {
            case 'ADD':
              prefix = 'ADD ';
              break;
            case 'EXEC':
              prefix = 'EXEC X ';
              break;
            case 'THEME':
              prefix = 'THEME ';
              break;
            default:
              prefix = '';
              break;
          }
          fetch(
            `${API}/${this.selectedStorage}/list?find=${
              input[0]?.trim() || ''
            }&page=${parseInt(input[1]) || 0}`,
            { headers: { credentials: 'same-origin' } }
          )
            .then(res => res.json())
            .then(res => {
              this.editor.setValue(
                `${
                  res.items?.length > 0
                    ? res.items.map(i => prefix + i + sufix).join('\n')
                    : 'FOUND 0 SCRIPTS'
                }`
              );
            })
            .catch(err => this.log(err.message, 'error', err.status))
            .finally(() => this.FSM_unlock());
        }
        break;
      case '.':
      case '+':
      case 'DIR':
        {
          this.editor.setValue('');
          this.editor.focus();
          const dir = input[0]?.trim()
            ? this.convertToRelativePath(input[0].trim())
            : '';
          fetch(`${API}/${this.selectedStorage}/lsdir`, {
            method: 'POST',
            headers: {
              credentials: 'same-origin',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              dir: this.userId + dir
            })
          })
            .then(res => res.json())
            .then(res => {
              this.clearInputs();
              this.changeMode('text/plain');
              const prev = dir.split('/');
              prev.pop();
              this.editor.setValue(
                `. ${prev.join('/')}\n${res.items
                  .map(i =>
                    i.split('.')[1]
                      ? '- ' + dir + '/' + i
                      : '+ ' + dir + '/' + i
                  )
                  .join('\n')}`
              );
              this.editor.setCursor(0);
            })
            .catch(err => this.log(`Directory does not exist!`, 'error'));
        }
        break;
      case 'SCRIPT':
        {
          const filename = input?.[0]?.trim();
          if (!filename) return;
          const tag = `<script type="text/javascript" src=".${this.convertToRelativePath(
            filename
          )}"></script>`;
          const arr = this.editor.getValue().split('</body>');
          const result = arr[0] + tag + '\n' + '</body>\n' + arr[1];
          this.elements.consoleInputField.value = '';
          this.changeMode('.html');
          this.editor.setValue(result);
        }
        break;
      case 'SHOW':
        if (!this.isAppOpened) {
          this.openAppWindow();
        }
        break;
      case 'HIDE':
        if (this.isAppOpened) {
          this.openAppWindow();
        }
        break;
      case 'MODULE':
        {
          const filename = input?.[0]?.trim();
          if (!filename) return;
          const tag = `<script type="module" src=".${this.convertToRelativePath(
            filename
          )}"></script>`;
          const arr = this.editor.getValue().split('</body>');
          const result = arr[0] + tag + '\n' + '</body>\n' + arr[1];
          this.elements.consoleInputField.value = '';
          this.changeMode('.html');
          this.editor.setValue(result);
          this.saveFile();
        }
        break;
      case 'HTML':
      case 'HTML_WITH_MODULE':
      case 'SS':
        {
          const temp = input?.[0] || this.selectedFile;
          this.saveFile(
            `/${this.index}`,
            `<script type="module" src=".${temp}"></script>`
          );
          this.loadFileFromCache(temp);
        }
        break;
      case 'CLEAR':
        if (input[0]?.trim()) {
          const inp = this.convertToRelativePath(input[0].trim());
          if (this.tempExecVariables['folder_names']) {
            this.tempExecVariables['folder_names'] = this.tempExecVariables[
              'folder_names'
            ].filter(x => x !== inp);
          }
          this.tempFiles.forEach(file => {
            const predicate = file.includes(inp);
            if (predicate) {
              this.fileCache.delete(file);
              this.tempFiles.delete(file);
            }
          });
          this.clearFileOptions();
          this.createFileSelect();
          this.elements.appWindow.src = '';
          this.emptyFolder(this.userId + inp, false);
        } else {
          if (this.isAppOpened) {
            this.openAppWindow();
          }
          delete this.tempExecVariables['folder_names'];
          this.editor.setValue('');
          this.fileCache.clear();
          this.tempFiles.clear();
          this.dirCache.clear();
          this.emptyFolder();
          this.clearFileOptions();
          this.clearInputs();
          this.elements.saveIndex.textContent = 0;
          if (instance.runButton?.parentNode) {
            instance.runButton.parentNode.removeChild(instance.runButton);
            delete instance.runButton;
          }
          [...document.getElementsByClassName('label')].forEach(x =>
            x.parentNode.removeChild(x)
          );
          this.changeMode('t.txt');

          this.editor.switchInstance('');
        }
        break;
      case 'SETTINGS':
        {
          const settings = { ...this.StorageProvider };
          for (const key in settings) {
            if (
              !key.includes('hyper_light_scripter') ||
              key.includes('quine')
            ) {
              delete settings[key];
            } else {
              settings[key.split('hyper_light_scripter_')[1]] = settings[key];
              delete settings[key];
            }
          }
          this.editor.setValue(JSON.stringify(settings, null, 4));
        }
        break;
      case 'SET_SETTINGS':
        {
          const settings = JSON.parse(this.editor.getValue());
          for (const key in settings) {
            const current = 'hyper_light_scripter_' + key;
            if (this.StorageProvider.getItem(current)) {
              this.StorageProvider.setItem(current, settings[key]);
            }
          }
          this.reload(res => this.log('Settings applied', 'info', res.status));
        }
        break;
      case 'THEME':
        {
          this.setTheme(input[0]?.trim());
        }
        break;
      case 'SWITCH':
      case 'NEXT':
        {
          const filename = input[1]?.trim();
          this.fileCache.clear();
          this.tempFiles.clear();
          this.emptyFolder();
          this.clearFileOptions();
          this.clearInputs();
          this.getSnippet(input[0]?.trim())?.then(() => {
            if (filename) {
              this.loadFileFromCache(
                this.convertToRelativePath(filename),
                content => {
                  this.changeMode(filename);
                  this.editor.focus();
                }
              );
            }
            if (this.isAppOpened) {
              this.elements.appWindow.src = '';
              this.elements.appWindow.src = `../../portals/${this.userId}/${this.index}`;
            }
          });
        }
        break;
      case 'ADD':
        {
          const secondCMD = input[1]?.trim().toUpperCase();
          const thirdCMD = input[3]?.trim().toUpperCase();
          const filename =
            secondCMD === 'OPEN'
              ? input[2]?.trim()
              : thirdCMD === 'OPEN'
              ? input[4]?.trim()
              : '';
          let secondParam = '';
          switch (secondCMD) {
            case 'IN':
              {
                const folder = input[2]?.trim();
                if (folder) {
                  switch (folder) {
                    case '?':
                      secondParam = '/' + new Date().getTime();
                      break;
                    case ':':
                    case '/':
                    case '\\':
                    case '|':
                    case '>':
                    case '<':
                      return this.log("Can't use ': /  | > <' as folder names");
                    default:
                      secondParam = this.convertToRelativePath(input[2]);
                      break;
                  }
                  if (!this.tempExecVariables['folder_names']) {
                    this.tempExecVariables['folder_names'] = [];
                  }
                  this.tempExecVariables['folder_names'].push(secondParam);
                }
              }
              break;
            case 'C':
              this.editor.setValue('');
              break;
            case 'CX':
              this.editor.setValue('');
              this.fileCache.clear();
              this.tempFiles.clear();
              this.emptyFolder();
              this.clearFileOptions();
              this.clearInputs();
              break;
            case 'SHOW':
              this.onLoadCallback(() => {
                const src = this.elements.appWindow.src;
                this.elements.appWindow.src = '';
                this.elements.appWindow.src = src;
              });
              break;
            default:
              // if (this.fileCache.get('/index.html')) {
              //  this.fileCache.delete('/index.html');
              // this.tempFiles.delete('/index.html');
              // }
              break;
          }
          this.getSnippet(input[0], secondParam)?.then(() => {
            if (filename)
              this.loadFileFromCache(
                this.convertToRelativePath(filename),
                () => {
                  this.changeMode(filename);
                  this.editor.focus();
                }
              );
          });
        }
        break;

      case 'NEW_LINE':
        this.editor.replaceSelection('\n');

        break;
      case 'SPACE': {
        const text = ' ';
        this.editor.replaceSelection(text);
      }
      case 'ERASE':
        this.editor.replaceSelection('');
        break;
      case 'COPY':
        this.tempExecVariables['COPY'] = this.editor.getSelection();
        break;
      case 'PASTE':
        this.editor.addValue(this.tempExecVariables['COPY']);
        break;
      case 'WRITE':
        {
          const text = input.join(' ').trim();
          if (text) {
            this.editor.replaceSelection(text);
          }
        }
        break;
      case 'PEEK':
        {
          this.FSM_lock();
          const folderInput = input[0]?.trim();
          const temp = this.tempExecVariables['folder_names'];
          if (!temp) return this.log('There are 0 folders!');
          const folderName =
            temp[
              folderInput === undefined || folderInput === '-1'
                ? temp.length - 1
                : +folderInput
            ];
          if (!folderName) return this.log('Foler index out of bounds!');
          const entry = input[1]?.trim()
            ? this.convertToRelativePath(input[1]?.trim())
            : this.convertToRelativePath(this.index);
          const path = folderName
            ? this.convertToRelativePath(folderName) + entry
            : `/${entry}`;
          this.selectedFile = '';
          if (!this.tempFiles.has(`/${this.index}`)) {
            this.clearFileOptions();
            this.tempFiles.add(`/${this.index}`);
            this.createFileSelect();
          }
          fetch(`${API}/${this.selectedStorage}/check`, {
            method: 'POST',
            headers: {
              credentials: 'same-origin',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              file: path,
              entry: this.index,
              userId: this.userId
            })
          })
            .catch(err => this.log(err.message, 'error', err.status))
            .finally(() => {
              this.FSM_unlock();
              this.fileCache.delete(`/${this.index}`);
              if (this.isAppOpened) {
                this.elements.appWindow.src = '';
                this.elements.appWindow.src = `../../portals/${this.userId}/${this.index}`;
              }
            });
        }
        break;
      case 'C':
      case 'CHECK':
      case 'CHECKOUT':
        {
          this.FSM_lock();
          const folderName = input[0]?.trim();
          const entry = input[1]?.trim()
            ? this.convertToRelativePath(input[1]?.trim())
            : this.convertToRelativePath(this.index);
          const path = folderName
            ? this.convertToRelativePath(folderName) + entry
            : `/${entry}`;
          this.selectedFile = '';
          if (!this.tempFiles.has(`/${this.index}`)) {
            this.clearFileOptions();
            this.tempFiles.add(`/${this.index}`);
            this.createFileSelect();
          }
          fetch(`${API}/${this.selectedStorage}/check`, {
            method: 'POST',
            headers: {
              credentials: 'same-origin',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              file: path,
              entry: this.index,
              userId: this.userId
            })
          })
            .catch(err => this.log(err.message, 'error', err.status))
            .finally(() => {
              this.FSM_unlock();
              this.fileCache.delete(`/${this.index}`);
              if (this.isAppOpened) {
                this.elements.appWindow.src = '';
                this.elements.appWindow.src = `../../portals/${this.userId}/${this.index}`;
              }
            });
        }
        break;
      case 'I':
        {
          const folderName = input[0]?.trim();
          if (!folderName) {
            this.loadFileFromCache(`/${this.index}`, () => {
              this.changeMode('.html');
              this.unsaved = false;
              // this.editor.clearHistory();
              this.elements.saveIndex.textContent = 0;
              return content;
            });
            this.selectedFile = `/${this.index}`;
          } else {
            const filename =
              this.convertToRelativePath(folderName) + '/' + this.index;
            this.loadFileFromCache(filename, () => {
              this.changeMode('.html');
              this.unsaved = false;
              // this.editor.clearHistory();
              this.elements.saveIndex.textContent = 0;
              return content;
            });
            this.selectedFile = filename;
          }
        }
        break;
      case 'INDEX':
      case 'SI':
        this.fileCache.delete(`/${this.index}`);
        this.saveFile(
          `/${this.index}`,
          `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
</body>
</html>`
        );
        break;
      case 'LINK':
        {
          const script = input[0]?.trim() || '';
          if (script[0] !== '>' && script[1] !== '_')
            return this.log('scripts should start with >_');
          const link =
            API + '/data/storage/root/editor/?script=' + script.split('>_')[1];
          this.clearInputs();
          this.editor.setValue(link);
          this.editor.focus();
          this.changeMode('text/plain');
        }
        break;
      case 'HYPER':
      case 'HYPER_LIGHT':
        {
          const script = input[0]?.trim() || '';
          const lifespan = +input[1]?.trim() || 10;
          const maxLifeSpan = 30 * 60;
          if (script[0] !== '>' && script[1] !== '_')
            return this.log('scripts should start with >_', 'error');
          if (lifespan > maxLifeSpan)
            return this.log(
              `lifespan can't be bigger than ${maxLifeSpan}`,
              'error'
            );
          const line = '\n-------------------------------------------\n';
          const promptMessage = `The visitors of this link will be able to access:
      
${script}
      
Without the need of this editor! However it will live for only ${lifespan} seconds!
This does not mean that the app will vanish after ${lifespan} seconds,
it means that if the page is refreshed it will no longer be available 
unless regenerated by the same link!
${line}`;
          const link = `${API}/${this.selectedStorage}/temp?script=${
            script.split('>_')[1]
          }&lifespan=${lifespan}&portal=${this.userId}`;
          this.clearInputs();
          this.editor.setValue(promptMessage + '\n' + link + '\n' + line);
          this.editor.focus();
          this.changeMode('text/plain');
          this.elements.consoleInputField.value = link;
          this.elements.consoleInputField.select();
        }
        break;
      case '//':
        if (!this.codeSelection) {
          const rest = input.join(' ');
          this.editor.addValue(`\n/* ${rest} */`);
        } else {
          this.editor.replaceSelection(`/* ${this.codeSelection} */`);
        }
        break;
      case '/':
        if (
          (this.codeSelection && this.codeSelection.includes('//')) ||
          this.codeSelection.includes('/*')
        ) {
          this.editor.replaceSelection(
            this.codeSelection
              .replaceAll('/* ', '')
              .replaceAll(' */', '')
              .replaceAll('//', '')
          );
        } else {
          this.log('No code selected', 'error');
        }
        break;
      case 'DEBUG':
        this.debug();
        break;
      case 'BEAUTIFY':
        {
          this.editor.setValue(this.beautify(this.editor.getValue()));
        }
        break;
      case 'SWYPE':
        if (instance.runButton?.parentNode) {
          instance.runButton.parentNode.removeChild(instance.runButton);
          delete instance.runButton;
        }
        [...document.getElementsByClassName('label')].forEach(x =>
          x.parentNode.removeChild(x)
        );
        break;
      default:
        this.CMD_HISTORY.pop();
        this.CMD_HISTORY_POINTER--;
        {
          if (command) {
            if (command.substring(0, 3) === '>>>') return this.exec('X ' + raw);
            else if (command.substring(0, 3) === '...')
              return this.exec('ADD ' + raw + ' C');
            else if (command.substring(0, 2) === '>_')
              return this.exec('SWITCH ' + raw);
            else return this.log(`Command ${command} does not exist!`, 'error');
          }
          if (!this.tempFiles.has(`/${this.index}`))
            return this.log(`${this.index} does not exist!`, 'error');
          const errorCount = this.getLintErrors().length;
          if (errorCount === 0) {
            this.elements.appWindow.src = '';
            this.elements.appWindow.src = `../../portals/${
              this.userId
            }/${'index'}.html`;
          } else {
            return this.log('Failed to run due to syntax errors!', 'error');
            // this.debug();
          }
        }
        break;
    }
  };
};
