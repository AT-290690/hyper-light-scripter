const fs = require('fs');
const zipper = require('zip-local');
const { zip } = zipper;
const correctPath = path => path.split('/').filter(Boolean).join('/');

const bulkEdit = (obj, ...props) => {
  props.forEach(prop => {
    if (obj[prop]) {
      obj[prop] = correctPath(obj[prop]);
    }
  });
  return obj;
};

const fileOperations = args => {
  const { type, filePath, folderPath, tempFilePath } = bulkEdit(
    args,
    'filePath',
    'folderPath',
    'tempFilePath'
  );

  const handleChanges = (data = [], buffer = '') => {
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
  };

  switch (type) {
    case 'create_file':
      {
        const { data } = args;
        fs.writeFile(filePath, data, err => err);
      }
      break;

    case 'erase_file':
      {
        fs.unlink(filePath, err => err);
      }
      break;

    case 'empty_folder':
      {
        const { isRoot } = args;
        fs.readdir(folderPath, (err, files) => {
          if (files?.length > 0) {
            fs.rm(folderPath, { recursive: true }, () => {
              if (isRoot)
                fs.mkdir(`${folderPath}`, { recursive: true }, () => {});
            });
          }
        });
      }
      break;
    case 'zip_folder':
      {
        zip(folderPath, (error, zipped) => {
          if (error) return console.log(error);
          zipped.save(folderPath + '/package.zip', error => {
            if (error) console.log(error);
          });
        });
      }
      break;

    case 'save_file_changes':
      {
        const { data } = args;
        fs.readFile(filePath, 'utf8', (error, buffer) => {
          if (error) return console.log(error);
          fs.writeFile(filePath, handleChanges(data, buffer), err => err);
        });
      }
      break;

    case 'eval_change':
      {
        const { selection, from, method } = args;
        const tempFilePath = filePath + '_temp';

        fs.access(tempFilePath, fs.F_OK, err => {
          if (err) {
            fs.readFile(filePath, 'utf8', (error, buffer) => {
              if (buffer) {
                if (method === 'inline') {
                  const splittedFile = buffer.split('\n');
                  for (let i = 0; i < selection.length; i++) {
                    splittedFile[from + i] = selection[i];
                  }
                  fs.writeFile(
                    filePath,
                    splittedFile.join('\n'),
                    err =>
                      err &&
                      console.log('File Operation Error at "eval_change"', err)
                  );
                } else if (method === 'diff') {
                  fs.writeFile(
                    filePath,
                    handleChanges(selection, buffer),
                    err =>
                      err &&
                      console.log('File Operation Error at "eval_change"', err)
                  );
                }
                fs.writeFile(
                  filePath + '_temp',
                  buffer,
                  err =>
                    err &&
                    console.log('File Operation Error at "eval_change"', err)
                );
              }
            });
          } else {
            fs.readFile(tempFilePath, 'utf8', (error, buffer) => {
              if (error) return;
              else if (buffer)
                fs.writeFile(filePath, buffer, err =>
                  fs.unlink(tempFilePath, err => err)
                );
            });
          }
        });
      }
      break;

    case 'eval_revert':
      {
        fs.readFile(tempFilePath, 'utf8', (error, buffer) => {
          if (error) return;
          else if (buffer)
            fs.writeFile(filePath, buffer, err =>
              fs.unlink(tempFilePath, err => err)
            );
        });
      }
      break;

    case 'checkout':
      {
        const { folderPath, entry, userId, file } = args;
        const directory = folderPath?.trim() ? file.split('/' + entry)[0] : '';

        fs.readFile(filePath, 'utf8', (error, buffer) => {
          if (buffer) {
            if (directory) {
              fs.readdir(folderPath + directory, (err, files) => {
                if (files) {
                  buffer = buffer.split(`='/`).join(`='.`);
                  buffer = buffer.split(`="/`).join(`=".`);
                  files.forEach(file => {
                    if (file !== entry) {
                      buffer = buffer
                        .split(`="./${file}`)
                        .join(`=".${directory}/${file}`);
                      buffer = buffer
                        .split(`="${file}`)
                        .join(`=".${directory}/${file}`);
                      buffer = buffer
                        .split(`='./${file}`)
                        .join(`='.${directory}/${file}`);
                      buffer = buffer
                        .split(`='${file}`)
                        .join(`='.${directory}/${file}`);
                    }
                  });
                }
                if (err) return;
                fs.writeFile(folderPath + '/' + entry, buffer, err => {});
              });
            } else {
              fs.writeFile(folderPath + '/' + entry, buffer, err => {});
            }
          }
        });
      }
      break;

    default:
      break;
  }
};

process.on('message', data => fileOperations(data));
