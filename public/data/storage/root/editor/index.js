import { Interface } from './editor.js';
import { margin, UI } from './common.js';
export default (
  container,
  addons = [],
  relativeTo = () => [
    window.innerWidth,
    window.innerHeight,
    margin.x,
    margin.y
  ],
  storageProvider = window.localStorage
) => {
  UI.setParent(container);
  const toolsContainer = UI.create('div', { class: 'tools_container' });
  const appContainer = UI.create('div', { class: 'app_container' });
  const resizerElement = UI.create('div', { class: 'handle' });
  UI.setParent(appContainer);
  const appWindow = UI.create('iframe', { class: 'app_window' });
  const Code = new Interface(UI.parent, {
    onExec: () => Code.execLabel(),
    onRun: e => {
      if (e.target) {
        Code.unsaved = false;
        Code.debugLabel(e.target);
      }
    },
    onUpdate: update => {
      if (update.selectionSet) {
        const selection = update.state.selection.ranges[0];
        if (selection && selection.from < selection.to) {
          Code.lastSelection = selection;
        }
      }
      if (update.docChanged) {
        Code.unsaved = true;
        if (Code.selectedFile) {
          saveIndex.textContent = 1;
          Code.elements.saveIndex.title = 'File has changes!';
        }
      }
    }
  });
  addons.map(addon => addon(Code));
  Code.StorageProvider = storageProvider;
  Code.resizerX(resizerElement, e => Code.resizeX(e.pageX));
  const responsiveResize = () => {
    const [WIDTH, HEIGHT, WIDHT_OFFSET, HEIGHT_OFFSET] = relativeTo();
    Code.setSize(WIDTH - WIDHT_OFFSET, HEIGHT - HEIGHT_OFFSET);
    resizerElement.style.left = WIDTH + 'px';
    appWindow.style.height = HEIGHT - HEIGHT_OFFSET + 'px';
    Code.initialResize = WIDTH / 2;
    if (Code.isAppOpened) {
      Code.resizeX(Code.mobileAppWindowSize());
    }
  };

  const interfaceContainer = UI.create('div', toolsContainer, {
    class: 'interafaceContainer'
  });
  // const indexButton = UI.create('button', interfaceContainer, {
  //   class: 'svgIcon',
  //   title: 'Manual'
  // });
  const windowModeButt = UI.create('button', interfaceContainer, {
    class: 'svgIcon',
    title: 'Application'
  });
  const getKeyButton = UI.create('button', interfaceContainer, {
    state: '0',
    cache: '',
    class: 'svgIcon',
    title: 'Account'
  });
  // const foldButton = UI.create('button', interfaceContainer, {
  //   toggled: '0',
  //   class: 'svgIcon',
  //   title: 'Fold'
  // });
  const sparkleButt = UI.create('button', interfaceContainer, {
    class: 'svgIcon',
    title: 'Format'
  });
  const debugButt = UI.create('button', interfaceContainer, {
    class: 'svgIcon',
    title: 'Bugs'
  });

  const saveButton = UI.create('button', interfaceContainer, {
    class: 'svgIcon',
    title: 'Save file'
  });
  const saveIndex = UI.create('span', interfaceContainer, {
    class: 'ui',
    style: 'user-select: none;',
    title: 'File has no changes',
    textContent: 0
  });
  const consoleInputField = UI.create('input', {
    class: 'ui console_input_field ',
    autocomplete: 'off',
    spellcheck: 'false',
    autocorrect: 'off'
  });
  // const consoleButton = UI.create('button', {
  //   class: 'svgIcon executeButton',
  //   title: 'Execute'
  // });
  const topPanelContainer = UI.create('div');
  document.addEventListener('keydown', e => {
    const activeElement = document.activeElement;
    if (e.ctrlKey && e.key === 'Shift') {
      if (activeElement === consoleInputField) {
        e.preventDefault();
        Code.editor.focus();
      } else {
        consoleInputField.focus();
      }
    } else if (e.key === 'Enter') {
      if (activeElement === consoleInputField) {
        Code?.exec(consoleInputField.value);
        consoleInputField.value = '';
      }
    } else if (e.key.toLowerCase() === 'f' && (e.ctrlKey || e.metaKey)) {
      if (activeElement === consoleInputField) {
        e.preventDefault();
        Code.editor.focus();
      }
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (activeElement === consoleInputField) {
        const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
        if (Code.CMD_HISTORY[Code.CMD_HISTORY_POINTER]) {
          consoleInputField.value = Code.CMD_HISTORY[Code.CMD_HISTORY_POINTER];
        } else if (Code.CMD_HISTORY_POINTER < 0) {
          Code.CMD_HISTORY_POINTER = 0;
        } else if (Code.CMD_HISTORY_POINTER >= Code.CMD_HISTORY.length) {
          Code.CMD_HISTORY_POINTER = Code.CMD_HISTORY.length;
        }
        Code.CMD_HISTORY_POINTER = Code.CMD_HISTORY_POINTER + dir;
      }
    } else if (e.key.toLowerCase() === 'q' && (e.ctrlKey || e.metaKey)) {
      e = e || window.event;
      e.preventDefault();
      e.stopPropagation();
      if (Code.getFileType() !== 'js') {
        Code.execLabel();
      } else {
        document.getElementById('currentRunButton').click();
      }
    } else if (e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
      e = e || window.event;
      e.preventDefault();
      e.stopPropagation();
      Code.saveFile();
      if (Code.isAppOpened) Code.onLoadCallback(() => Code.runCode());
    }
  });
  window.addEventListener(
    'beforeunload',
    e =>
      (e.returnValue = `Before leaving make sure you save your work (if it's worth). Otherwise it will be secretly stored as >_last_script***YOUR_KEY***`)
  );
  const unloadSupportHandler = () => {
    if (unloadSupportHandler._hasUnloaded) return;
    unloadSupportHandler._hasUnloaded = true;
    Code.disconnect();
  };
  window.addEventListener('pagehide', unloadSupportHandler);
  window.addEventListener('unload', unloadSupportHandler);
  const fileSelector = UI.create('div', interfaceContainer, {
    multiple: true,
    class: 'ui fileSelector'
  });
  const elements = {
    // consoleButton,
    debugButt,
    sparkleButt,
    getKeyButton,
    // indexButton,
    windowModeButt,
    consoleInputField,
    toolsContainer,
    interfaceContainer,
    container: UI.parent,
    appWindow,
    resizerElement,
    fileSelector,
    saveButton,
    saveIndex,
    selectStorage: { value: 'storage' }
  };
  Code.output = UI.create('p', {
    disabled: true,
    class: 'ui console'
  });
  topPanelContainer.style.display = 'none';
  consoleInputField.style.display = 'inline-block';
  Code.setElements(elements);
  windowModeButt.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 118.2 116.32"><rect class="a" x="34.72" y="35.83" width="46.99" height="45.48"/><rect class="a" x="53.72" y="-22.24" width="10.13" height="86.65" transform="translate(37.7 79.87) rotate(-90)"/><rect class="a" x="77.47" width="9.57" height="24.51" transform="translate(164.5 24.51) rotate(180)"/><rect class="a" x="54.79" width="9.57" height="24.51" transform="translate(119.15 24.51) rotate(180)"/><rect class="a" x="32.12" width="9.57" height="24.51" transform="translate(73.81 24.51) rotate(180)"/><rect class="a" x="15.57" y="18.46" width="10.58" height="79.04" transform="translate(41.72 115.97) rotate(180)"/><rect class="a" x="7.47" y="22.79" width="9.57" height="24.51" transform="translate(47.3 22.79) rotate(90)"/><rect class="a" x="7.47" y="45.46" width="9.57" height="24.51" transform="translate(69.98 45.46) rotate(90)"/><rect class="a" x="7.47" y="68.14" width="9.57" height="24.51" transform="translate(92.65 68.14) rotate(90)"/><rect class="a" x="53.15" y="52.42" width="10.9" height="86.4" transform="translate(154.22 37.03) rotate(90)"/><rect class="a" x="31.49" y="91.81" width="9.57" height="24.51"/><rect class="a" x="54.16" y="91.81" width="9.57" height="24.51"/><rect class="a" x="76.83" y="91.81" width="9.57" height="24.51"/><rect class="a" x="92.05" y="18.51" width="9.87" height="79.04"/><rect class="a" x="101.16" y="68.71" width="9.57" height="24.51" transform="translate(24.98 186.91) rotate(-90)"/><rect class="a" x="101.16" y="46.04" width="9.57" height="24.51" transform="translate(47.65 164.24) rotate(-90)"/><rect class="a" x="101.16" y="23.37" width="9.57" height="24.51" transform="translate(70.32 141.56) rotate(-90)"/></svg>`;
  saveButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 90.64 108.68"><rect class="a" x="45.35" y="-34.66" width="10.27" height="79.6" transform="translate(45.35 55.62) rotate(-90)"/><rect class="a" x="78.52" y="9.3" width="11.71" height="98.93"/><rect class="a" x="0.18" width="10.56" height="105.11" transform="translate(10.92 105.11) rotate(180)"/><rect class="a" x="39.87" y="57.91" width="10.9" height="90.64" transform="translate(148.55 57.91) rotate(90)"/><rect class="a" x="16.47" y="25.34" width="29.71" height="8.1"/><rect class="a" x="16.12" y="40" width="57.09" height="8.1"/><rect class="a" x="16.53" y="54.65" width="56.69" height="8.1"/><rect class="a" x="16.22" y="75.87" width="14.05" height="8.1"/></svg>`;
  // foldButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 96.54 108.26"><rect class="a" x="69.62" y="58.52" width="13.69" height="40.97"/><rect class="a" x="85.36" y="47.35" width="9.12" height="13.23" transform="translate(35.96 143.89) rotate(-90)"/><rect class="a" x="67.33" y="-7.26" width="8.78" height="23.31" transform="translate(67.33 76.1) rotate(-90)"/><rect class="a" x="67.26" y="92.22" width="8.78" height="23.31" transform="translate(-32.22 175.53) rotate(-90)"/><rect class="a" x="69.62" y="8.55" width="13.69" height="40.97"/><rect class="a" x="13.23" y="58.52" width="13.69" height="40.97" transform="translate(40.15 158) rotate(-180)"/><rect class="a" x="2.05" y="47.35" width="9.12" height="13.23" transform="translate(-47.35 60.58) rotate(-90)"/><rect class="a" x="20.44" y="-7.26" width="8.78" height="23.31" transform="translate(20.44 29.21) rotate(-90)"/><rect class="a" x="20.5" y="92.22" width="8.78" height="23.31" transform="translate(-78.99 128.76) rotate(-90)"/><rect class="a" x="13.23" y="8.55" width="13.69" height="40.97" transform="translate(40.15 58.07) rotate(-180)"/></svg>`;
  getKeyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 55.94 112"><rect class="a" x="15.58" y="54.29" width="11.4" height="57.52"/><rect class="a" x="21.52" y="21.23" width="12.92" height="55.93" transform="translate(-21.22 77.16) rotate(-90)"/><rect class="a" x="24.12" y="68.84" width="11.4" height="27.86" transform="translate(-52.95 112.59) rotate(-90)"/><rect class="a" x="24.13" y="92.37" width="11.4" height="27.86" transform="translate(-76.46 136.13) rotate(-90)"/><rect class="a" y="0.01" width="12.92" height="55.61"/><rect class="a" x="42.84" y="12.92" width="12.92" height="42.69"/><rect class="a" x="15.04" y="-14.87" width="12.92" height="42.66" transform="translate(15.04 27.96) rotate(-90)"/></svg>`;
  // indexButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" transform="rotate(45)" width="18" height="18" viewBox="0 0 118.2 116.32"><rect class="a" x="34.72" y="35.83" width="46.99" height="45.48"/><rect class="a" x="53.72" y="-22.24" width="10.13" height="86.65" transform="translate(37.7 79.87) rotate(-90)"/><rect class="a" x="77.47" width="9.57" height="24.51" transform="translate(164.5 24.51) rotate(180)"/><rect class="a" x="54.79" width="9.57" height="24.51" transform="translate(119.15 24.51) rotate(180)"/><rect class="a" x="32.12" width="9.57" height="24.51" transform="translate(73.81 24.51) rotate(180)"/><rect class="a" x="15.57" y="18.46" width="10.58" height="79.04" transform="translate(41.72 115.97) rotate(180)"/><rect class="a" x="7.47" y="22.79" width="9.57" height="24.51" transform="translate(47.3 22.79) rotate(90)"/><rect class="a" x="7.47" y="45.46" width="9.57" height="24.51" transform="translate(69.98 45.46) rotate(90)"/><rect class="a" x="7.47" y="68.14" width="9.57" height="24.51" transform="translate(92.65 68.14) rotate(90)"/><rect class="a" x="53.15" y="52.42" width="10.9" height="86.4" transform="translate(154.22 37.03) rotate(90)"/><rect class="a" x="31.49" y="91.81" width="9.57" height="24.51"/><rect class="a" x="54.16" y="91.81" width="9.57" height="24.51"/><rect class="a" x="76.83" y="91.81" width="9.57" height="24.51"/><rect class="a" x="92.05" y="18.51" width="9.87" height="79.04"/><rect class="a" x="101.16" y="68.71" width="9.57" height="24.51" transform="translate(24.98 186.91) rotate(-90)"/><rect class="a" x="101.16" y="46.04" width="9.57" height="24.51" transform="translate(47.65 164.24) rotate(-90)"/><rect class="a" x="101.16" y="23.37" width="9.57" height="24.51" transform="translate(70.32 141.56) rotate(-90)"/></svg>`;
  sparkleButt.innerHTML = `<svg width="18" height="18" viewBox="0 0 26 23"  xmlns="http://www.w3.org/2000/svg">
<path d="M15 1.90735e-06L16.4779 9.52215L26 11L16.4779 12.4779L15 22L13.5221 12.4779L4 11L13.5221 9.52215L15 1.90735e-06Z" />
<path d="M5 13L5.67175 17.3282L10 18L5.67175 18.6718L5 23L4.32825 18.6718L0 18L4.32825 17.3282L5 13Z" />
<path d="M8 1L8.40305 3.59695L11 4L8.40305 4.40305L8 7L7.59695 4.40305L5 4L7.59695 3.59695L8 1Z" />
</svg>`;
  debugButt.innerHTML = `<svg fill="none" stroke-width="4" width="18" height="18" viewBox="0 0 37 39" xmlns="http://www.w3.org/2000/svg">
<path d="M29 21H37"></path>
<path d="M0 21H7"></path>
<path d="M28.5496 13.9169L34.4504 9.49935"></path>
<path d="M14.1996 9.4231L8 1"></path>
<path d="M22.2938 9.6038L27.9057 0.819306"></path>
<path d="M7.97632 13.7724L2.20029 9.83392"></path>
<path d="M7.97501 27L2.5 36"></path>
<path d="M27.6426 28.3467L34.1216 35.6533"></path>
<path d="M30 29V13L23 7.50003H13L6.5 13V29L18 37L30 29Z"></path>
</svg>`;
  //   consoleButton.innerHTML = `<svg width="15" height="15" viewBox="0 0 18 18" transform="rotateZ(45)" xmlns="http://www.w3.org/2000/svg">
  //   <rect width="18" height="18" />
  // </svg>`;
  //   consoleButton.addEventListener('click', () => {
  //     Code?.exec(consoleInputField.value);
  //     consoleInputField.value = '';
  //   });
  windowModeButt.addEventListener('click', () => Code.openAppWindow());
  debugButt.addEventListener('click', () => Code.debug());
  sparkleButt.addEventListener('click', () => {
    const cursor = Code.editor.getCursor();
    Code.editor.setValue(Code.beautify(Code.editor.getValue()));
    Code.editor.setCursor(cursor);
  });
  getKeyButton.addEventListener('click', e => {
    Code.clearInputs();
    e.currentTarget.classList.remove('shake');
    Code.elements.consoleInputField.value = Code.userId;
    Code.expTime = null;
    const content = !Code.temporal
      ? `
 PUBIC KEY 
>>>>>>>>>>>>>>>>>>>>>>>>>>
${Code.userId}
>>>>>>>>>>>>>>>>>>>>>>>>>>

 DATA 
**************
PUBLIC . 0
PRIVATE . 0
**************
BUILDS . 0 10
**************
ARCHIVE . 0
**************`
      : `YOU ARE NOT SIGNED IN / SESSION HAS EXPIRED

LOGIN
REGISTER

OR continue with TEMPORARY_SESSION
(no ownership of your scripts)`;
    Code.editor.setValue(content);
    Code.changeMode('text/plain');
  });
  // foldButton.addEventListener('click', e => {
  //   if (e.currentTarget.getAttribute('toggled') === '0') {
  //     Code.editor.foldAll(Code.editor);
  //     e.currentTarget.setAttribute('toggled', '1');
  //   } else {
  //     Code.editor.unfoldAll(Code.editor);
  //     e.currentTarget.setAttribute('toggled', '0');
  //   }
  // });
  // indexButton.addEventListener('click', e => {
  //   if (Code.isAppOpened) Code.openAppWindow();
  //   Code.openAppWindow(`../../root/entry/index.html`);
  // });
  saveButton.addEventListener('click', e => {
    if (Code.isAppOpened) Code.onLoadCallback(() => Code.runCode());
    Code.saveFile();
  });

  Code.startup();
  window.addEventListener('resize', responsiveResize);
  //screen.orientation.addEventListener('change', responsiveResize);
  responsiveResize();
};
