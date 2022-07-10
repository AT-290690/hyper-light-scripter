export const urlParams = new URLSearchParams(window.location.search);
export const isIncognito = urlParams.has('incognito');
const currentIncognitoCount =
  sessionStorage.getItem('hyper_light_incognito_counts') ?? 0;
sessionStorage.setItem(
  'hyper_light_incognito_counts',
  +currentIncognitoCount + 1
);
const href = window.location.href.split('/').filter(Boolean);
const envi = href.slice(1, 2);
const protocol = envi[0].includes('localhost') ? 'http://' : 'https://';
export const API = protocol + envi.join('/');
export const QUINE = !isIncognito
  ? href[href.length - 2] !== 'root'
    ? '_quine_' + href[href.length - 2]
    : ''
  : '_incognito_' + currentIncognitoCount;

const UI = {
  parent: document.body,
  setParent: function (handler) {
    this.parent = handler;
  },
  create: function (type = '', parent, params) {
    let parentEl;
    if (parent instanceof HTMLElement) {
      parentEl = parent;
    } else {
      parentEl = this.parent;
      params = parent;
    }
    switch (type) {
      default:
        {
          const element = document.createElement(type);
          parentEl?.appendChild(element);
          if (params) {
            for (const i in params) {
              if (i != 'textContent' && i != 'innerHTML') {
                element.setAttribute(i, params[i]);
              } else {
                element[i] = params[i];
              }
            }
          }
          return element;
        }
        break;
    }
  },
  css: css => {
    document.head.appendChild(document.createElement('style'));
    document.createElement('style').type = 'text/css';
    if (document.createElement('style').styleSheet) {
      document.createElement('style').styleSheet.cssText = css;
    } else {
      document.createElement('style').appendChild(document.createTextNode(css));
    }
  }
};

const resizer = (resizer, mousemove, cursor) => {
  resizer.style.cursor = cursor;
  resizer.mousemove = mousemove;

  resizer.onmousedown = function (e) {
    try {
      document.documentElement.addEventListener(
        'mousemove',
        resizer.doDrag,
        false
      );
      document.documentElement.addEventListener(
        'mouseup',
        resizer.stopDrag,
        false
      );
    } catch (e) {
      ErrorMessage(
        'resizer.onmousedown(...) failed! Your browser does not support this feature. ' +
          e.message
      );
    }
  };

  resizer.doDrag = e => {
    if (e.which != 1) {
      resizer.stopDrag(e);
      return;
    }
    resizer.mousemove(e);
  };

  resizer.stopDrag = e => {
    document.documentElement.removeEventListener(
      'mousemove',
      resizer.doDrag,
      false
    );
    document.documentElement.removeEventListener(
      'mouseup',
      resizer.stopDrag,
      false
    );
  };
};

const resizerX = (resizerID, mousemove) => {
  resizer(resizerID, mousemove, 'ew-resize');
};

const dragElement = (elmnt, header) => {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;

  if (header) {
    // if present, the header is where you move the DIV from:
    header.onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    if (elmnt.getAttribute('drag') === 'true') {
      document.onmouseup = null;
      document.onmousemove = null;
      return;
    }

    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = elmnt.offsetTop - pos2 + 'px';
    elmnt.style.left = elmnt.offsetLeft - pos1 + 'px';
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
};

export { UI, resizerX, resizer, dragElement };
