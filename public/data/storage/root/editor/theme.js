import { API, QUINE } from './common.js';

export default (instance) => {
  instance.changeStyleProp = function (css) {
    const style = document.documentElement.style;
    const props = css.split(';');
    instance.themeColors = Object.fromEntries(props.map(x => x.split(':').map(y => y.trim())));
      for(const color in instance.themeColors) {
      style.setProperty(color, instance.themeColors[color]);
    }
  }
instance.setTheme = function (theme) {
    if (theme) {
      this.FSM_lock();
      const link = `${API}/${this.selectedStorage}/snippets`;
      return fetch(link, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: theme,
          prefix:'',
          userId: this.userId
        })
      })
        .then(response => response.json())
        .then(data => {
        const pallete = LZUTF8.decompress(data.code, { inputEncoding: 'Base64', outputEncoding: 'String' });
        this.changeStyleProp(pallete);
        this.StorageProvider.setItem(
          'hyper_light_scripter_default_theme'+QUINE,
           theme
        );
      
        })
        .catch(err => {
          this.log('Theme does not exist or is broken!');
        }).finally(()=>this.FSM_unlock())
    } else this.log('There is no such theme');
}
}