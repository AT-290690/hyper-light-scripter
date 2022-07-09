const {
  listFiles,
  runCode,
  restoreCode,
  createUserId,
  getSnippet,
  listScripts,
  createFolder,
  createFile,
  eraseFile,
  emptyFolder,
  pushSnippet,
  disconnect,
  zipFolder,
  checkout,
  register,
  login,
  logout,
  buildTempApp,
  deleteScript,
  listArchive,
  getArhivedSnippet
} = require('../controllers/script-controller.js');

const storage = async route => {
  route.post('/snippets', getSnippet);
  route.post('/run', runCode);
  route.post('/restore_temp', restoreCode);
  route.get('/list', listScripts);
  route.get('/archive', listArchive);
  route.post('/lsdir', listFiles);
  route.post('/dir', createFolder);
  route.post('/upload', createFile);
  route.delete('/erase', eraseFile);
  route.delete('/empty', emptyFolder);
  route.post('/disconnect', disconnect);
  route.post('/push', pushSnippet);
  route.post('/createId', createUserId);
  route.post('/register', register);
  route.post('/login', login);
  route.post('/logout', logout);
  route.post('/zip', zipFolder);
  route.post('/check', checkout);
  route.get('/temp', buildTempApp);
  route.delete('/drop', deleteScript);
  route.post('/archive', getArhivedSnippet);
};

exports.default = storage;
