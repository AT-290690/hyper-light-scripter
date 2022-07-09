import { API, UI, dragElement } from './common.js';
export default instance => {
  globalThis.__evalJSFN = (callback, ...args) => callback(...args);
  instance.saveChangedLine = (
    selection,
    from,
    to,
    method = 'inline',
    callback = () => {}
  ) => {
    instance.FSM_lock();
    fetch(`${API}/${instance.selectedStorage}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        selection,
        from,
        to,
        method,
        file: instance.selectedFile,
        userId: instance.userId
      })
    })
      .then(res => {
        instance.log('Running code!', 'info', res.status);
        callback();
      })
      .finally(() => instance.FSM_unlock())
      .catch(err => instance.log(err.message, 'error', err.status));
  };
  instance.restoreSavedChangedLine = () => {
    fetch(`${API}/${instance.selectedStorage}/restore_temp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: instance.selectedFile,
        userId: instance.userId
      })
    })
      .then(() => {
        instance.lockedLogger = false;
        globalThis.__errorEvalJS = null;
        globalThis.__resultEvalJS = [];
        instance.elements.saveIndex.textContent = 0;
        if (!instance.isAppOpened) instance.elements.appWindow.src = '';
      })
      .catch(err => this.log(err.message, 'error', err.status));
  };
  instance.run_retries_count = 1;
  instance.execLabel = () => {
    instance.tempExecVariables['exec_history'] = instance.editor
      .getSelection()
      .split('\n')
      .filter(Boolean);
    return instance.exec('EXEC');
  };
  instance.debugLabel = (parent, callback = s => JSON.stringify(s)) => {
    if (instance.unsaved === true) {
      return instance.log('Save file first.');
    } else if (instance.lockedLogger) return;
    clearInterval(instance._timeout['evalJS']);
    const selection = instance.editor.getSelection();
    if (selection) {
      instance.run_retries_count = 1;
      const retryWith = (prefix = '') => {
        globalThis.__errorEvalJS = null;
        globalThis.__resultEvalJS = [];
        const lines = selection.split('\n').filter(Boolean);
        const lastLine = lines[lines.length - 1];
        lines[lines.length - 1] =
          lastLine[lastLine.length - 1] === ';'
            ? lastLine.substr(0, lastLine.length - 1)
            : lastLine;
        if (lines.length > 1) {
          lines[0] =
            'globalThis.parent.__evalJSFN(()=>{try{' +
            (lines[0].includes('return')
              ? lines[0]
              : 'return ' + lines[0].replace('return', ''));
          lines[lines.length - 1] =
            lines[lines.length - 1] +
            '}catch(err){globalThis.parent.__errorEvalJS = err.message}})';
        } else {
          lines[0] =
            'globalThis.parent.__evalJSFN(()=>{try{' +
            (lines[0].includes('return')
              ? lines[0]
              : 'return ' + lines[0].replace('return', '')) +
            '}catch(err){globalThis.parent.__errorEvalJS = err.message}})';
        }
        // if(globalThis.parent.__resultEvalJS.length <= ${
        //   instance.logLineCap
        // })
        // const transformerLogic = `typeof sel === 'object' ? JSON.parse(JSON.stringify(sel)) : sel`;
        const transform = `sel`;
        const format = `JSON.parse(JSON.stringify(${transform}))`;
        const transformerFn = `(sel)=>{globalThis.parent.__resultEvalJS.push(${format}); return sel}`;
        const resultSelection = `${prefix}globalThis.parent.__evalJSFN(${transformerFn}, ${lines.join(
          '\n'
        )})`;
        const start = instance.editor.offsetToPos(instance.lastSelection.from);
        const end = instance.editor.offsetToPos(instance.lastSelection.to);
        // Edge case if you are at the end of the doc - I need this last line to get last char
        if (end.line + 1 >= instance.editor.lineCount()) {
          instance.editor.addValue('\n');
        }
        const startOffset = instance.editor.posToOffset({
          line: start.line,
          ch: 0
        });
        const endOffset = instance.editor.posToOffset({
          line: end.line + 1,
          ch: -1
        });
        const range = instance.editor.getRange(startOffset, endOffset);
        let part1 = '';
        let part2 = '';
        for (let i = 0; i < range.length; i++) {
          if (i < start.ch) {
            part1 += range[i];
          } else if (i >= end.ch) {
            part2 += range[i];
          }
        }
        if (!part1.trim() || !part2.trim()) {
          part1 = '';
          part2 = '';
        }
        const result = part1 + resultSelection + part2;

        instance.unsaved = false;
        clearInterval(instance._timeout['evalJS']);
        instance.reloadCount = 0;
        instance.saveChangedLine(
          result.split('\n'),
          start.line,
          end.line,
          'inline',
          () => {
            if (instance.lockedLogger) return;
            instance.lockedLogger = true;
            clearInterval(instance._timeout['evalJS']);
            instance.runCode();
            instance._timeout['evalJS'] = setInterval(() => {
              instance.reloadCount++;
              const iframeDoc =
                instance.elements.appWindow.contentDocument ||
                instance.elements.appWindow.contentWindow.document;
              if (iframeDoc.readyState === 'complete') {
                const lintErrors = instance.getLintErrors();
                if (lintErrors.length)
                  globalThis['__errorEvalJS'] = 'There are errors in the code.';
                if (
                  lintErrors ||
                  globalThis['__errorEvalJS'] ||
                  globalThis['__resultEvalJS']?.length
                ) {
                  if (globalThis.__errorEvalJS) {
                    [...document.getElementsByClassName('log_line')].map(x =>
                      x.parentNode.removeChild(x)
                    );
                    instance.logLine(
                      globalThis.__errorEvalJS,
                      'error_line',
                      parent
                      // {
                      //   x: 80,
                      //   y: 0
                      // }
                    );
                    globalThis.__errorEvalJS = null;
                    globalThis.__resultEvalJS = [];
                    instance.lockedLogger = false;
                  } else if (
                    !globalThis.__errorEvalJS &&
                    globalThis.__resultEvalJS
                  ) {
                    if (globalThis.__resultEvalJS.length > 1) {
                      const lines = globalThis.__resultEvalJS
                        .map(line => JSON.stringify(line))
                        .join('\n');
                      instance.logLine(
                        lines,
                        'log_line',
                        parent
                        // {
                        //   x: 80,
                        //   y: 0
                        // }
                      );
                    } else {
                      globalThis.__resultEvalJS.length === 0
                        ? instance.logLine(
                            'Unreachable code!',
                            'info_line',
                            parent
                          )
                        : instance.logLine(
                            callback(globalThis.__resultEvalJS[0]),
                            'log_line',
                            parent
                            // { x: 80, y: 0 }
                          );
                    }
                    globalThis.__resultEvalJS = [];
                  }
                  instance.reloadCount = 0;
                  clearInterval(instance._timeout['evalJS']);
                  instance.restoreSavedChangedLine();
                } else {
                  if (instance.reloadCount >= instance.reloadLimit) {
                    clearInterval(instance._timeout['evalJS']);
                    instance.restoreSavedChangedLine();
                    if (
                      globalThis.__resultEvalJS.length === 0 &&
                      instance.run_retries_count === 1
                    ) {
                      instance.run_retries_count = 0;
                      //  return retryWith(';');
                    }
                    globalThis.__resultEvalJS.length === 0
                      ? instance.logLine(
                          'Unreachable code!',
                          'info_line',
                          parent
                        )
                      : instance.logLine(
                          callback(globalThis.__resultEvalJS[0]),
                          'log_line',
                          parent
                          // { x: 80, y: 0 }
                        );
                    instance.run_retries_count = 0;
                    instance.reloadCount = 0;
                  }
                }
              }
            }, instance.logThrotInterval);
          }
        );
      };
      if (instance.run_retries_count === 1) {
        retryWith();
      }
    } else {
      [...document.getElementsByClassName('log_line')].map(x =>
        x.parentNode.removeChild(x)
      );
      instance.lockedLogger = false;
    }
  };
  instance.getLintErrors = () => {
    const errors = instance.editor.getLintState();
    if (errors && errors.diagnostics.size) {
      instance.elements.saveIndex.textContent = errors.diagnostics.size + '!';
      instance.elements.saveIndex.title = 'File has errors!';
      return Array.from({ length: errors.diagnostics.size });
    }
    return [];
  };
  instance.logLine = (
    res,
    type = 'log_line',
    parent
    // position = { x: 30, y: 0 },
    // cursor = {
    //   line: instance.editor.getCursor(false).line,
    //   ch: Infinity
    // },
    // scroll = false
  ) => {
    const isUndefined = res === undefined;
    const pos = parent.getBoundingClientRect();
    const div = UI.create('div', {
      class: type + ' label',
      style: `border:none;background:transparent;padding:2px; position:absolute; top: ${Math.max(
        pos.top,
        36
      )}px; left: ${pos.left + 40}px`
    });
    const toolbar = UI.create('div', div, {
      style: `display: flex; gap: 5px; padding: 5px;border:var(--border-width) solid var(--border);background: var(--background-primary);`
    });
    const move = UI.create('div', toolbar, {
      style: `cursor:move; background: var(--color-secondary); height: 15px; width: 15px;`
    });
    const expand = UI.create('div', toolbar, {
      expanded: 'false',
      style: `cursor:nwse-resize; background: var(--color-thirdly); height: 15px; width: 15px;`
    });
    const x = UI.create('div', toolbar, {
      style: `cursor:pointer; background: var(--error); height: 15px; width: 15px;`
    });
    const logEl = UI.create('textarea', div, {
      class: isUndefined ? 'warn_line' : type,
      textContent: isUndefined ? 'undefined' : res,
      style: `position:absolute;font-size:${instance.labelStyles.fontSize};`,
      rows: 1,
      cols: isUndefined ? 7 : 4
    });
    const expandCommand = () => {
      if (expand.getAttribute('expanded') === 'false') {
        expand.setAttribute('expanded', 'true');
        logEl.style.cols = null;
        logEl.style.rows = null;
        logEl.style.width = '';
        logEl.style.height = '';
        const { x, y } = logEl.getBoundingClientRect();
        logEl.style.width = `${instance.width - x - 32}px`;
        logEl.style.height = `${instance.height - y - 32}px`;
      } else {
        logEl.style.height = '';
        logEl.style.width = '';
        logEl.style.cols = 4;
        logEl.style.rows = 1;
        expand.setAttribute('expanded', 'false');
      }
    };
    expand.addEventListener('click', expandCommand);
    const removeCommand = () => div.parentNode.removeChild(div);
    x.addEventListener('click', removeCommand);
    dragElement(div, move);
    UI.parent.appendChild(div);
    //instance.addWidget(cursor, div, scroll);
    if (document.body.clientWidth <= 600) {
      div.style.left = '8px';
      div.style.top = '36px';
    }
    return { container: div, expand: expandCommand, close: removeCommand };
  };

  instance.runCode = () => {
    if (instance.isAppOpened && instance.tempFiles.has(`/${instance.index}`)) {
      instance.isAppOpened = false;
      instance.openAppWindow(
        `../../portals/${instance.userId}/${instance.index}`
      );
      return;
    } else {
      if (instance.selectedFile) {
        const type = instance.getFileType();
        if (type === 'js' || type === 'html' || type === 'css')
          instance.elements.appWindow.src = `../../portals/${instance.userId}/${instance.index}`;
      }
    }
  };

  const getErrorLines = () =>
    globalThis.__resultEvalJS.length
      ? globalThis.__resultEvalJS[0]
          .split('\n')
          .find(L => L.includes(instance.selectedFile + ':'))
          ?.split(instance.selectedFile + ':')[1]
          .split(':')
          .map(e => (isNaN(+e) ? 0 : +e))
      : [0, 0];
  const showRuntimeErrors = () => {
    [...document.getElementsByClassName('label')].map(x =>
      x.parentNode.removeChild(x)
    );
    instance.editor.focus();
    const errorLine = getErrorLines();
    // const offset = instance.editor.posToOffset({ line: 7, ch: 1 });
    instance.editor.setCursor(
      instance.editor.posToOffset({
        line: Math.max(errorLine[0] - 1, 0),
        ch: Math.max(errorLine[1] - 1, 0)
      }),
      true
    );
    const { container, expand } = instance.logLine(
      globalThis.__resultEvalJS[1]
        ? globalThis.__resultEvalJS[1] + ': ' + globalThis.__errorEvalJS
        : 'Error at : ' + globalThis.__errorEvalJS,
      'error_line',
      UI.parent
      // {
      //   x: 0,
      //   y: 0
      // },
      // {
      //   line: errorLine[0] - 1,
      //   ch: errorLine[1]
      // },
      // true
    );
    container.style.top = '75vh';
    container.style.zIndex = '1000';
    container.style.left = '0';

    expand();
  };
  const showLintErrors = lintErrors => {
    if (!lintErrors.length) return;
    [...document.getElementsByClassName('label')].map(x =>
      x.parentNode.removeChild(x)
    );
    const line = UI.create('textarea', {
      class: 'error_line label',
      textContent: `Found ${lintErrors.length} errors in this file!`,
      rows: 2,
      cols: 22,
      style: 'position: absolute; top:45px; right: 16px;z-index:5'
    });
    UI.parent.appendChild(line);
    instance.log(`Bug search completed - ${lintErrors.length} errors found!`);
    setTimeout(() => line?.parentNode?.removeChild(line), 4000);
  };
  // bug analizer
  instance.debug = () => {
    if (!instance.options.lint) {
      instance.options.lint = true;
      instance.editor.switchInstance({
        ...instance.options,
        doc: instance.editor.getValue(),
        callback: () => {
          instance.changeMode(instance.selectedFile);
          setTimeout(() => instance.debug(), 2000);
        }
      });
      return;
    }
    const currentFileType = instance.getFileType()?.trim();
    if (currentFileType === 'js' || currentFileType === 'html') {
      globalThis.__errorEvalJS = null;
      globalThis.__resultEvalJS = [];
      const lintErrors = instance.getLintErrors();
      if (lintErrors.length) {
        showLintErrors(lintErrors);
        globalThis.__errorEvalJS = null;
        globalThis.__resultEvalJS = [];
        return;
      }
      instance.unsaved = false;
      clearInterval(instance._timeout['evalJS']);
      instance.reloadCount = 0;

      const source = instance.editor.getValue();
      let string = '';
      if (source.includes('import') || source.includes('export')) {
        const { imports, body, exports, defaultExport } = source
          .split('\n')
          .reduce(
            (acc, item) => {
              if (item.includes('export')) {
                const does = item.split(' ').filter(Boolean).join(' ');
                acc.inlineType = does.includes('export {')
                  ? 'export '
                  : does.includes('export default {')
                  ? 'export default '
                  : acc.inlineType;
              }
              if (acc.inlineType && !acc.inline) {
                if (item.includes('}')) {
                  acc.inline += item.trim().replace('}', '').replace('{', '');
                  acc.arr.push(acc.inline.split(' ').filter(Boolean).join(' '));
                  acc.inline = '';
                  acc.inlineType = '';
                } else {
                  acc.inline += item.trim().replace('}', '').replace('{', '');
                }
              } else if (acc.inline) {
                if (item.includes('}')) {
                  acc.inline += item.trim().replace('}', '').replace('{', '');
                  acc.arr.push(acc.inline.split(' ').filter(Boolean).join(' '));
                  acc.inline = '';
                  acc.inlineType = '';
                } else {
                  acc.inline += item.trim().replace('}', '').replace('{', '');
                }
              } else {
                acc.arr.push(item);
              }
              return acc;
            },
            { arr: [], inline: '', inlineType: '' }
          )
          .arr.reduce(
            (acc, line, index) => {
              const isImportStart = line.includes('import ');
              if (isImportStart || acc.inlineImports) {
                acc.inlineImports += line + '\n';
                const isImportEnd = line.includes(' from ');
                if (isImportEnd) {
                  acc.imports += acc.inlineImports;
                  acc.inlineImports = '';
                }
              } else {
                if (line.includes('export ')) {
                  line = line.replace('export ', '');
                  let hasDefault = false;
                  if (line.includes('default ')) {
                    hasDefault = true;
                    line = line.replace(
                      'default ',
                      '__temp_default_export__ = '
                    );
                  }
                  const removeKeywords = line
                    .split(' ')
                    .filter(
                      x =>
                        x &&
                        x !== 'const' &&
                        x !== 'let' &&
                        x !== 'class' &&
                        x !== 'function' &&
                        x !== 'export'
                    )
                    .join(' ')
                    .replace(';', '');
                  const declarationToken = removeKeywords
                    .split('(')[0]
                    .split('{')[0];
                  const filteredLine = declarationToken.split('=')[0];
                  if (hasDefault) {
                    acc.defaultExport = filteredLine;
                  } else {
                    acc.exports.push(filteredLine);
                  }
                }
                acc.body.push(line);
              }
              return acc;
            },
            {
              imports: '',
              body: [],
              exports: [],
              defaultExport: '',
              inlineImports: ''
            }
          );
        const exportWraperHelper = exports =>
          exports
            .map(e =>
              e.includes(',') || e.includes('}') || e.includes('{')
                ? exportWraperHelper(e.split(','))
                : 'export const ' + e + '=' + '__temp_result__?.' + e + ';'
            )
            .join('\n')
            .trim();
        string =
          imports +
          ';' +
          (exports.length || defaultExport ? 'const __temp_result__ = ' : '') +
          'globalThis.parent.__evalJSFN(()=>{try{let __temp_default_export__;' +
          body.join('\n') +
          ';' +
          (defaultExport
            ? '__temp_default_export__ = ' + defaultExport + ';'
            : '') +
          (exports.length || defaultExport
            ? ';return {' +
              exports.join(',') +
              (exports.length ? ',' : '') +
              '__temp_default_export__ }'
            : '') +
          '}catch(err){globalThis.parent.__errorEvalJS = err.message; globalThis.parent.__resultEvalJS.push(err.stack, err.constructor.name)}})\n' +
          (exports.length ? exportWraperHelper(exports) + '\n' : '') +
          (defaultExport
            ? 'export default __temp_result__?.__temp_default_export__'
            : '');
      } else {
        string =
          'globalThis.parent.__evalJSFN(()=>{try{' +
          source +
          '}catch(err){globalThis.parent.__errorEvalJS = err.message; globalThis.parent.__resultEvalJS.push(err.stack, err.constructor.name)}})';
      }
      const isCached = instance.fileCache.get(instance.selectedFile);
      const formattedContent = isCached
        ? instance.matchDiff(
            instance.fileCache.get(instance.selectedFile),
            string
          )
        : string.split('\n');
      const method = isCached ? 'diff' : 'inline';
      instance.saveChangedLine(
        formattedContent,
        0,
        formattedContent.length,
        method,
        () => {
          instance.runCode();
          instance.run_retries_count = 1;
          instance._timeout['evalJS'] = setInterval(() => {
            instance.reloadCount++;
            const iframeDoc =
              instance.elements.appWindow.contentDocument ||
              instance.elements.appWindow.contentWindow.document;
            if (iframeDoc.readyState === 'complete') {
              if (globalThis.__errorEvalJS) {
                showRuntimeErrors();
                globalThis.__errorEvalJS = null;
                globalThis.__resultEvalJS = [];
                instance.lockedLogger = false;
                instance.reloadCount = 0;
                clearInterval(instance._timeout['evalJS']);
                instance.restoreSavedChangedLine();
              } else {
                if (
                  !globalThis['__errorEvalJS'] &&
                  !lintErrors.length &&
                  instance.run_retries_count
                ) {
                  [...document.getElementsByClassName('error_line')].map(x =>
                    x.parentNode.removeChild(x)
                  );
                  instance.run_retries_count = 0;
                  const line = UI.create('textarea', {
                    class: 'success_line',
                    textContent: 'No runtime errors caught in this file!',
                    rows: 2,
                    cols: 12,
                    style: 'position: absolute; top:45px; right: 16px;z-index:5'
                  });
                  UI.parent.appendChild(line);
                  instance.log('Bug search completed - 0 errors found!');
                  setTimeout(() => line.parentNode.removeChild(line), 2000);
                }
                if (instance.reloadCount >= instance.reloadLimit) {
                  clearInterval(instance._timeout['evalJS']);
                  instance.restoreSavedChangedLine();
                  instance.run_retries_count = 0;
                  instance.reloadCount = 0;
                }
                globalThis.__errorEvalJS = null;
                globalThis.__resultEvalJS = [];
                instance.lockedLogger = false;
                instance.reloadCount = 0;
                clearInterval(instance._timeout['evalJS']);
                instance.restoreSavedChangedLine();
              }
            }
          }, instance.logThrotInterval);
        }
      );
    } else return instance.log('Debugger only works with html or js files.');
  };
};
