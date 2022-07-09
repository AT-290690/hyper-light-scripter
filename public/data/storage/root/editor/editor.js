import { API, QUINE, UI, resizer, urlParams, isIncognito } from './common.js';
import { CodeMirror } from './editor.bundle.js';

const dmp = new diff_match_patch();
class StorageProvider {
  constructor() {
    this._safeStorage;
    this._unsafeStorage = localStorage;
  }
  getItem(id) {
    return this._unsafeStorage.getItem(id);
  }
  setItem(id, value) {
    return this._unsafeStorage.setItem(id, value);
  }
  removeItem(id) {
    return this._unsafeStorage.removeItem(id);
  }
}
export class Interface {
  constructor(element, options) {
    this.options = options;
    this.editor = CodeMirror(element, this.options);
    this.beautifySettings = {
      js: {
        indent_size: '2',
        indent_char: ' ',
        max_preserve_newlines: '-1',
        preserve_newlines: false,
        keep_array_indentation: true,
        break_chained_methods: true,
        indent_scripts: 'keep',
        brace_style: 'none,preserve-inline',
        space_before_conditional: true,
        unescape_strings: false,
        jslint_happy: true,
        end_with_newline: false,
        wrap_line_length: '64',
        indent_inner_html: false,
        comma_first: false,
        e4x: true,
        indent_empty_lines: false
      }
    };
    this.beautifySettings.css = { ...this.beautifySettings.js };
    this.beautifySettings.html = { ...this.beautifySettings.js };
    this.index = 'index.html';
    this.output = '';
    this.cacheOn = true;
    this.dirCache = new Set();
    this.tempFiles = new Set();
    this.fileCache = new Map();
    this.fileModes = new Map();
    this.isAppOpened = false;
    this.initialResize = window.innerWidth;
    this.width = 0;
    this.height = 0;
    this.elements = {};
    this.selectedFile = '';
    this.selectedStorage = 'storage';
    this.lastStdnInput = '';
    this.userId = '';
    this.loadAttempts = 0;
    this._timeout = {};
    this.unsaved = true;
    this.lastCommit = 'untitled';
    this.callback = () => {};
    this.StorageProvider = new StorageProvider();
    this.logLineCap = 1000;
    this.logThrotInterval = 500;
    this.reloadCount = 0;
    this.reloadLimit = 8;
    this.lockedLogger = false;
    this.onInitCallback = () => {};
    this.FSM_isLocked = false;
    this.ignoredFiles = [
      'DS_Store',
      '.git',
      '.log',
      '.png',
      '.jpg',
      '.gif',
      'node_modules',
      '.env'
    ];
    this.labelStyles = { fontSize: '12px' };
    this.defaultColors = {
      '--gutters': '#292e2eeb',
      '--comment': '#546a90',
      '--linenumbers': '#546a90',
      '--border': '#546a90',
      '--background-primary': '#000000',
      '--background-secondary': '#a875ff60',
      '--color-primary': '#fbf5f3',
      '--color-secondary': '#42c6ff',
      '--color-thirdly': '#a875ff',
      '--color-fourtly': '#ffce2e',
      '--font-family': 'Hermit-Regular',
      '--gutters-border': '1px solid transparent',
      '--border-width': '1px',
      '--error': '#ff0000',
      '--warning': '#ffed2b',
      '--success': '#00ff00',
      '--icons': '#fbf5f3',
      '--progress': '#42c6ff',
      '--def': '#42c6ff',
      '--atom': '#fc3e77',
      '--number': '#fc3e77',
      '--string': '#fc3e77'
    };
    this.themeColors = { ...this.defaultColors };
    this.progressBarUtils = {
      height: 3,
      strokeWidth: 1,
      trailWidth: 1
    };
    this.progressBar = new ProgressBar.Line('.app_container', {
      strokeWidth: this.progressBarUtils.strokeWidth,
      easing: 'easeInOut',
      color: this.themeColors['--progress'],
      trailColor: this.themeColors['--background-primary'],
      trailWidth: this.progressBarUtils.trailWidth,
      svgStyle: {
        width: '100%',
        height: this.progressBarUtils.height + 'px',
        position: 'absolute',
        bottom: '35px',
        left: 0,
        zIndex: 4
      }
    });
    this.MAXIMUM_CACHE_SIZE = 10;
  }
  animateProgressStart(time) {
    this?.progressBar?.destroy();
    this.progressBar = new ProgressBar.Line('.app_container', {
      strokeWidth: this.progressBarUtils.strokeWidth,
      easing: 'easeInOut',
      color: this.themeColors['--progress'],
      trailColor: this.themeColors['--background-primary'],
      trailWidth: this.progressBarUtils.trailWidth,
      svgStyle: {
        width: '100%',
        height: this.progressBarUtils.height + 'px',
        position: 'absolute',
        bottom: '35px',
        left: 0,
        zIndex: 4
      }
    });
    this.progressBar.animate(1.0, { duration: time });
  }
  animateProgressEnd(time) {
    if (this.progressBar) {
      this.progressBar.destroy();
      this.progressBar = new ProgressBar.Line('.app_container', {
        strokeWidth: this.progressBarUtils.strokeWidth,
        easing: 'easeIn',
        color: this.themeColors['--background-primary'],
        trailColor: this.themeColors['--progress'],
        trailWidth: this.progressBarUtils.trailWidth,
        svgStyle: {
          width: '100%',
          height: this.progressBarUtils.height + 'px',
          position: 'absolute',
          left: 0,
          bottom: '35px',
          zIndex: 4
        }
      });
      this.progressBar.animate(1.0, { duration: time });
    }
  }
  showErrorPopup(errorMessage) {
    const line = UI.create('textarea', {
      class: 'error_line',
      textContent: errorMessage,
      rows: 2,
      cols: 22,
      style: 'position: absolute; top:45px; left: 16px;z-index:5'
    });
    UI.parent.appendChild(line);
    setTimeout(() => line?.parentNode?.removeChild(line), 4000);
  }
  onLoadCallback(callback) {
    this.callback = callback;
  }
  invokeCallback() {
    this.callback();
    this.callback = () => {};
  }
  hashCode(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }
  FSM_lock() {
    this.animateProgressStart(100);
    return (this.FSM_isLocked = true);
  }
  FSM_unlock() {
    this.animateProgressEnd(100);
    return (this.FSM_isLocked = false);
  }

  async startup() {
    if (isIncognito) {
      this.StorageProvider.removeItem('hyper_light_scripter_id' + QUINE);
    }

    this.elements.saveIndex.textContent = 0;
    this.elements.saveIndex.title = 'File has no changes';

    const id = this.StorageProvider.getItem('hyper_light_scripter_id' + QUINE);

    const response = await fetch(`${API}/storage/createId`, {
      method: 'POST',
      headers: {
        credentials: 'same-origin',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id
      })
    }).catch(err => this.log(err.message, 'error', err.status));
    this.StorageProvider.removeItem('hyper_light_scripter_temp' + QUINE);
    const data = await response.json();
    if (response.status === 401) {
      if (data.id) {
        this.userId = data.id;
        this.dirCache.add(this.convertToRelativePath(data.id));
        this.StorageProvider.setItem(
          'hyper_light_scripter_id' + QUINE,
          data.id
        );
      }
      this.log(response.message);
      this.temporal = true;
      this.elements.getKeyButton.classList.add('shake');
      return;
    } else {
      this.temporal = false;
      this.userId = data.id;
      this.StorageProvider.setItem('hyper_light_scripter_id' + QUINE, data.id);
      this.dirCache.add(this.convertToRelativePath(data.id));
      const theme = this.StorageProvider.getItem(
        'hyper_light_scripter_default_theme' + QUINE
      );
      const font = this.StorageProvider.getItem(
        'hyper_light_scripter_default_font' + QUINE
      );
      if (theme) {
        if (theme === 'default') {
          this.setTheme('...theme_default_kOXJQb9NFubgdEx9YsYE1').then(() =>
            this.StorageProvider.removeItem(
              'hyper_light_scripter_default_theme' + QUINE
            )
          );
        } else {
          this.setTheme(theme);
        }
      }
      this.setFontSize(font || 18);
      this.onInitCallback();
      if (urlParams.has('script')) {
        this.onLoadCallback(() => {
          setTimeout(() => {
            if (urlParams.has('file')) {
              this.selectFile(urlParams.get('file'));
            }
            if (urlParams.has('open')) {
              setTimeout(() => this.openAppWindow(), 1000);
            }
          }, 1000);
        });
        this.getSnippet('>_' + urlParams.get('script'));
      }
    }
  }
  getFileType() {
    return this.selectedFile.split('.').pop();
  }
  setElements(elements) {
    this.elements = elements;
  }
  fadeOut(el, int = 25, onEnd = () => {}) {
    const fade = op => {
      const f = op - 2;
      if (el.style.opacity > 0) {
        this._timeout['fadeout'] = setTimeout(() => {
          fade(f);
        }, int);
      } else {
        el.style.display = 'none';
        onEnd();
      }
      el.style.opacity = f + '%';
    };
    fade(100);
  }
  indicateEndOfSession() {
    this.elements.getKeyButton.classList.add('shake');
    this.temporal = true;
  }
  log(value, type = 'info', status) {
    this.output.style.display = 'block';
    this.output.style.opacity = 100 + '%';
    if (type === 'error') {
      this.output.style.color = 'var(--error)';
    }
    if (status === 401) {
      this.indicateEndOfSession();
    }
    clearTimeout(this._timeout['fadeout']);
    if (value?.trim()) {
      this._timeout['fadeout'] = setTimeout(() => {
        this.fadeOut(this.output, 25, () => {
          this.output.style.color = 'var(--color-secondary)';
          this.output.textContent = '';
        });
      }, 1000);
      this.output.textContent = value
        .split(' ')
        .map(s => {
          if (s.length >= 20) {
            s = s.substr(0, 20) + '...';
          }
          return s;
        })
        .join(' ');
    }
  }
  setSize(x, y) {
    this.editor.setSize(x, y);
    this.width = x;
    this.height = y;
  }
  convertToRelativePath(filename) {
    return filename[0] !== '/' ? '/' + filename : filename;
  }
  beautify(value = this.editor.getValue()) {
    const type = this.getFileType() ?? 'html';
    const settings = this.beautifySettings[type];
    switch (type) {
      case 'html':
        return html_beautify(value, settings);
      case 'js':
        return js_beautify(value, settings);
      case 'css':
        return css_beautify(value, settings);
      default:
        return value;
    }
  }

  applyDiff(data = [], buffer = '') {
    const characters = buffer.split('');
    const result = [];
    let pointer = 0;
    data.forEach(change => {
      if (change[0] === 0) {
        for (let i = pointer; i < pointer + change[1]; i++) {
          result.push(characters[i]);
        }
        pointer += change[1];
      } else if (change[0] === -1) {
        pointer += change[1];
      } else if (change[0] === 1) {
        result.push(...change[1]);
      }
    });
    return result.join('');
  }
  matchDiff(a, b) {
    const diff = [];
    const diff_obj = dmp.diff_main(a, b, true);
    for (const change in diff_obj) {
      if (diff_obj[change][0] === 0 || diff_obj[change][0] === -1)
        diff_obj[change][1] = diff_obj[change][1].length;
      diff.push([diff_obj[change][0], diff_obj[change][1]]);
    }
    return diff_obj;
  }
  uploadFile(filename, data, clear, dir = '') {
    this.FSM_lock();
    const pref = dir?.split(this.userId)[1];
    const fullPath = pref ? pref.substring(1) + '/' + filename : filename;
    const key = this.convertToRelativePath(fullPath);
    let body;
    if (this.fileCache.has(key)) {
      const diff = this.matchDiff(this.fileCache.get(key), data);
      body = JSON.stringify({
        filename,
        data: diff,
        dir,
        userId: this.userId
      });
    } else {
      body = JSON.stringify({
        filename,
        data,
        dir,
        userId: this.userId
      });
    }
    return fetch(`${API}/${this.selectedStorage}/upload`, {
      method: 'POST',
      headers: {
        credentials: 'same-origin',
        'Content-Type': 'application/json'
      },
      body
    })
      .then(res => {
        if (clear) {
          this.tempFiles.add(key);
          this.clearFileOptions();
          this.createFileSelect();
          const el = [...this.elements.fileSelector.childNodes].find(
            x => x.textContent === this.selectedFile
          );
          el?.classList.add('fileselected');
        }
        if (this.cacheOn) {
          this.fileCache.set(key, data);
        }
        this.unsaved = false;
        this.elements.saveIndex.textContent = 0;
        this.elements.saveIndex.title = 'File has no changes';
        this.log(this.selectedFile + ' file saved!', 'info', res.status);
        this.invokeCallback();
      })
      .catch(err => this.log(err.message, 'error', err.status))
      .finally(() => this.FSM_unlock());
  }
  saveFile(
    path = this.selectedFile,
    data = this.editor.getValue(),
    clear = true
  ) {
    if (this.fileCache.get(path) === data) {
      this.elements.saveIndex.textContent = 0;
      this.elements.saveIndex.title = 'File has no changes';
      return;
    }
    if (path) {
      path = path.split(' ').join('_');
      const folders = path.split('/').filter(Boolean);
      if (folders.length > 1) {
        const filename = folders.pop();
        const link = this.userId + '/' + folders.join('/');
        if (this.dirCache.has(this.convertToRelativePath(link))) {
          return this.uploadFile(filename, data, clear, link);
        } else {
          fetch(`${API}/storage/dir`, {
            method: 'POST',
            headers: {
              credentials: 'same-origin',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dir: link })
          })
            .then(() => {
              this.dirCache.add(this.convertToRelativePath(link));
              this.uploadFile(filename, data, clear, link);
            })
            .catch(err => this.log(err.message, 'error', err.status));
        }
      } else {
        this.uploadFile(path, data, clear, this.userId);
      }
    }
  }
  setFontSize(size) {
    this.editor.changeFontSize(size + 'px');
    // document.getElementsByClassName('CodeMirror')[0].style.fontSize =
    //   size + 'px';
    this.labelStyles.fontSize = size + 'px';
    this.StorageProvider.setItem(
      'hyper_light_scripter_default_font' + QUINE,
      size
    );
  }
  correctFilePath(filename) {
    if (!filename) return this.log('No filename provided!');
    return '/' + filename.split('/').filter(Boolean).join('/');
  }
  getSnippet(filename, prefix = '', source = 'snippets') {
    if (filename) {
      this.FSM_lock();
      const link = `${API}/${this.selectedStorage}/${source}`;
      return fetch(link, {
        method: 'POST',
        headers: {
          credentials: 'same-origin',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: filename,
          prefix,
          userId: this.userId
        })
      })
        .then(response => response.json())
        .then(data => {
          if (data?.files?.length > 0) {
            data.files.map(file => {
              const filename = this.correctFilePath(file);
              if (this.tempFiles.has(filename)) {
                this.fileCache.delete(filename);
              }
              this.tempFiles.add(filename);
            });
            this.clearInputs();
            this.clearFileOptions();
            this.createFileSelect();
            this.invokeCallback();
            this.log(filename + ' imported!', 'info', data.status);
          } else if (data?.code) {
            const decoded = LZUTF8.decompress(data.code, {
              inputEncoding: 'Base64',
              outputEncoding: 'String'
            });
            this.editor.addValue('\n' + decoded);
            // this.editor.scrollIntoView({
            //   line: this.editor.lastLine(),
            //   char: 0
            // });
            this.log(filename + ' pasted!', 'info', data.status);
          } else {
            this.log('Failed to find snippet!', 'error');
          }
        })
        .catch(err => this.log(err.message, 'error', err.status))
        .finally(() => this.FSM_unlock());
    }
  }
  mobileAppWindowSize() {
    return document.body.clientWidth <= 600 ? 0 : this.initialResize;
  }
  clearInputs() {
    this.deSelect();
  }
  json(
    value = this.editor.getValue(),
    title = 'untitled',
    files = [...this.tempFiles]
  ) {
    const data = `{
        "title": "${title}",
        "files":${JSON.stringify(files)},
        "code":${JSON.stringify(value)}
}`;
    return data;
  }
  OpenExternalResource(resource, search) {
    let link;
    switch (resource) {
      case 'mdn':
        link = `https://developer.mozilla.org/en-US/search?q=${search}`;
        break;
      case 'stackoverflow':
        link = `https://stackoverflow.com/search?q=${search}`;
        break;
      case 'app':
        link = `${API}/data/${this.selectedStorage}/portals/${this.userId}/${this.index}`;
        break;
    }
    window.open(
      link,
      'External Resource',
      `toolbar=no,width=600,height=${this.height},left=1300,top=150,status=no,scrollbars=no,resize=no`
    );
  }
  openAppWindow(src = `../../portals/${this.userId}/${this.index}`) {
    if (!this.isAppOpened) {
      if (!this.tempFiles.has(`/${this.index}`)) {
        this.saveFile(
          `/${this.index}`,
          `<body style="background: black;margin:0;padding:15px;outline:none;">
  <div><img src="../../../../assets/images/404.svg" width="100%" height="100%" /></div>
</body>`
        );
        this.onLoadCallback(() => {
          let count = 0;
          const retry = () => {
            const iframeDoc =
              this.elements.appWindow.contentDocument ||
              this.elements.appWindow.contentWindow.document;
            if (iframeDoc.readyState === 'complete' || count > 10) {
              this.openAppWindow(src);
            } else
              setTimeout(() => {
                count++;
                retry();
              }, 100);
          };
          retry();
        });
        return;
      }
      this.elements.appWindow.style.height = this.height + 'px';
      this.resizeX(this.mobileAppWindowSize());
      this.elements.resizerElement.style.display = 'block';
      this.elements.appWindow.style.display = 'block';
      this.elements.appWindow.src = src;
    } else {
      this.elements.appWindow.style.display = 'none';
      this.resizeX(window.innerWidth, false);
      this.elements.resizerElement.style.display = 'none';
      this.elements.appWindow.src = '';
    }
    this.isAppOpened = !this.isAppOpened;
  }
  getFileList() {
    return [...this.elements.fileSelector.childNodes];
  }
  deleteFile(f = this.selectedFile) {
    const file = this.convertToRelativePath(f);
    fetch(`${API}/${this.selectedStorage}/erase`, {
      method: 'DELETE',
      headers: {
        credentials: 'same-origin',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filename: file,
        dir: this.userId,
        data: ''
      })
    }).then(() => {
      this.fileCache.delete(file);
      this.tempFiles.delete(file);
      if (file === this.selectedFile) {
        this.selectedFile = '';
        this.editor.setValue('');
      }
      this.clearFileOptions();
      this.createFileSelect();
    });
  }
  changeMode(filename) {
    // this.editor.setOption('lint', false);
    if (filename) {
      const type = this.fileModes.has(filename)
        ? this.fileModes.get(filename)
        : filename.split('.').pop();
      if (type === 'html') {
        this.editor.changeMode('htmlmixed');
      } else if (type === 'css') {
        this.editor.changeMode('css');
      } else if (type === 'js') {
        this.editor.changeMode('javascript');
        // this.editor.setOption('lint', { esversion: 12 });
      } else {
        this.editor.changeMode('txt');
      }
    }
  }
  manageCacheMemory() {
    if (this.fileCache.size >= this.MAXIMUM_CACHE_SIZE) {
      let minSize = Infinity;
      let recordKey = null;
      this.fileCache.forEach((value, key) => {
        if (minSize > value.length) {
          minSize = value.length;
          recordKey = key;
        }
      });
      this.fileCache.delete(this.convertToRelativePath(recordKey));
    }
  }
  loadSelectedFile(filename, callback = r => r) {
    if (!filename) return;
    this.FSM_lock();
    fetch(
      `${API}/data/${this.selectedStorage}/portals/${this.userId}/${filename}`,
      { headers: { credentials: 'same-origin' } }
    )
      .then(res => res.text())
      .then(res => {
        const doc = callback(res);
        if (this.cacheOn) {
          this.manageCacheMemory();
          this.fileCache.set(this.convertToRelativePath(filename), doc);
        }
        this.editor.switchInstance({
          ...this.options,
          doc,
          callback: () => this.changeMode(filename)
        });

        this.unsaved = false;
        // this.editor.clearHistory();
        this.elements.saveIndex.textContent = 0;
        this.elements.saveIndex.title = 'File has no changes';
      })
      .finally(() => this.FSM_unlock());
  }
  createFileSelect(files = this.tempFiles) {
    [...files].map(file => {
      if (file) {
        const child = UI.create('button', {
          class: 'fileselect',
          textContent: this.correctFilePath(file)
        });
        child.addEventListener('click', e => {
          [...document.getElementsByClassName('fileselect')].forEach(node =>
            node.classList.remove('fileselected')
          );
          e.currentTarget.classList.add('fileselected');
          this.loadFileFromCache(e.currentTarget.textContent);
        });
        this.elements.fileSelector.appendChild(child);
      }
    });
  }
  selectFile(file) {
    file = this.convertToRelativePath(file);
    const el = [...this.elements.fileSelector.childNodes].find(
      x => x.textContent === this.convertToRelativePath(file)
    );
    if (el) {
      el.focus();
      [...document.getElementsByClassName('fileselect')].forEach(node =>
        node.classList.remove('fileselected')
      );
      el.classList.add('fileselected');
      this.loadFileFromCache(el.textContent, source => {
        // this.editor.setValue(source);
        this.changeMode(el.textContent);
        this.unsaved = false;
        // this.editor.clearHistory();
        this.elements.saveIndex.textContent = 0;
        this.editor.focus();
        return source;
      });
    }
  }
  deSelect() {
    this.selectedFile = '';
    [...document.getElementsByClassName('fileselect')].forEach(node =>
      node.classList.remove('fileselected')
    );
  }
  loadFileFromCache(filename, callback = r => r) {
    const filePath = this.convertToRelativePath(filename);
    this.selectedFile = filePath;

    if (this.fileCache.has(filePath)) {
      const doc = callback(this.fileCache.get(filePath));
      this.editor.switchInstance({
        ...this.options,
        doc,
        callback: () => this.changeMode(filename)
      });

      this.unsaved = false;
      //this.editor.clearHistory();
      this.elements.saveIndex.textContent = 0;
      this.elements.saveIndex.title = 'File has no changes';
    } else {
      this.loadSelectedFile(filename, callback);
    }
  }
  disconnect() {
    if (QUINE) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = this.StorageProvider.key(i);
        if (key.includes('_incognito_') || key.includes('_quine_')) {
          this.StorageProvider.removeItem(key);
        }
      }
    }
    navigator.sendBeacon(
      `${API}/${this.selectedStorage}/disconnect?userId=${this.userId}&files=${[
        ...this.tempFiles
      ]}`
    );
  }
  emptyFolder(folder = this.userId) {
    this.FSM_lock();
    return fetch(`${API}/${this.selectedStorage}/empty`, {
      method: 'DELETE',
      headers: {
        credentials: 'same-origin',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ dir: folder })
    })
      .then(res => {
        if (this.userId !== folder) {
          this.log('Directory ' + folder + ' cleared!', 'info', res.status);
          this.dirCache.delete(this.convertToRelativePath(folder));
        } else {
          this.log('Project cleared!', 'info', res.status);
        }
      })
      .catch(err => this.log(err.message, 'error', err.status))
      .finally(() => this.FSM_unlock());
  }
  zipFolder(folder = this.userId) {
    this.FSM_lock();
    fetch(`${API}/${this.selectedStorage}/zip`, {
      method: 'POST',
      headers: {
        credentials: 'same-origin',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ dir: folder })
    })
      .catch(err => this.log(err.message, 'error', err.status))
      .finally(() => this.FSM_unlock());
  }
  downloadFile(filename) {
    this.FSM_lock();
    const a = document.createElement('a');
    a.href = `${API}/data/${this.selectedStorage}/portals/${this.userId}/${filename}`;
    a.setAttribute('download', filename);
    a.click();
    this.FSM_unlock();
  }
  unpackBundle(bundle, prefix) {
    this.clearFileOptions();
    const { code, files } = bundle;
    for (const index in code) {
      this.tempFiles.add(
        this.convertToRelativePath(
          prefix ? prefix + '/' + files[index] : files[index]
        )
      );
    }
  }
  clearFileOptions() {
    this.elements.fileSelector.innerHTML = '';
  }
  reload(callback = () => {}) {
    this.startup()
      .then(() => {
        if (this.fileCache.size) {
          this.dirCache.clear();
          this.tempFiles.clear();
          const copyCache = new Map(this.fileCache);
          this.fileCache.clear();
          this.clearFileOptions();
          this.clearInputs();
          copyCache.forEach((content, filename) => {
            this.saveFile(filename, content);
          });
        }
      })
      .finally(() => callback());
  }
  resizeX(x, cache = true) {
    this.setSize(x, this.height);
    this.elements.resizerElement.style.left = x + 'px';
    this.elements.appWindow.style.left = x + 5 + 'px';
    this.elements.appWindow.style.width =
      this.elements.container.clientWidth +
      this.elements.container.offsetLeft -
      x -
      9 +
      'px';
    this.elements.appWindow.style.height = this.height - 2 + 'px';
    if (cache) this.initialResize = x;
  }
  resizerX(resizerElement, mousemove) {
    resizer(resizerElement, mousemove, 'ew-resize');
  }
}
