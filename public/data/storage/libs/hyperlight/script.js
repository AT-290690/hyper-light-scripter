(() => {
  const hyperLight = (self, src, style) => {
    if (self.getAttribute('toggled') == '1') {
      const child = [...document.getElementsByTagName('iframe')].find(
        e => e.attributes.src.value === src
      );
      if (child) {
        self.removeChild(child);
      }
      self.setAttribute('toggled', '0');
      return;
    }
    const frame = document.createElement('iframe');
    frame.src = src;
    frame.style = style;
    self.appendChild(frame);
    self.setAttribute('toggled', '1');
  };
  [...document.getElementsByTagName('HyperLightScript')].forEach(e => {
    const container = document.createElement('div');
    const butt = document.createElement('button');
    butt.classList.add('hyper-button');
    const openFile = e.getAttribute('file');
    const openFileQuery = openFile ? `&file=${openFile}` : '';
    const openWindow = e.getAttribute('open') ? '&open="1"' : '';

    butt.title = 'open/close embeded hyper light scripter';
    container.appendChild(butt);
    const inner = document.createElement('div');
    inner.style = 'display: flex;text-align:right';
    butt.appendChild(inner);
    const img = document.createElement('img');
    img.src = '../../../../assets/images/logo.svg';
    img.classList.add('hyper-icon');
    inner.appendChild(img);

    butt.addEventListener('click', () => {
      if (container.getAttribute('toggled') == 1) {
        img.classList.remove('hyper-spin');
        img.classList.add('hyper-shake');
      } else {
        img.classList.add('hyper-spin');
        img.classList.remove('hyper-shake');
      }
      hyperLight(
        container,
        `${e.getAttribute(
          'host'
        )}/data/storage/root/editor/?incognito=1&script=${e.getAttribute(
          'script'
        )}${openFileQuery}${openWindow}`,
        e.getAttribute('iframe')
      );
    });
    e.parentNode.replaceChild(container, e);
  });
  const createUniqueId = () => {
    let time = Date.now().toString();
    for (let i = time.length; time.length < 21; i++) {
      time += Math.floor(Math.random() * 9);
    }
    return time;
  };
  [...document.getElementsByTagName('HyperLightFrame')].forEach(e => {
    const container = document.createElement('div');
    hyperLight(
      container,
      `${e.getAttribute('host')}/storage/temp?script=${e.getAttribute(
        'script'
      )}&lifespan=${e.getAttribute(
        'lifespan'
      )}&portal=${createUniqueId()}&sleep=true`,
      e.getAttribute('iframe')
    );
    e.parentNode.replaceChild(container, e);
  });
})();
