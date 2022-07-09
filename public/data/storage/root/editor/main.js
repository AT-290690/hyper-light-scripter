import HYPER from './index.js';
import EXEC from './exec.js';
import THEME from './theme.js';
import RUN from './run.js';
HYPER(document.getElementById('main-container'), [EXEC, THEME, RUN]);
