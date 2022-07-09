const fs = require('fs');
const LZUTF8 = require('lzutf8');
const { decompress } = LZUTF8;
const unpacker = ({ dir, path, prefix, code, files }) => {
  const payload = [];
  const dirCache = new Set();
  code.forEach((code, index) => {
    const dirs = files[index].split('/');
    if (dirs.length > 0) {
      dirs.pop();
      dirCache.add(dirs.join('/'));
    }
    payload.push({
      data: decompress(code, {
        inputEncoding: 'Base64',
        outputEncoding: 'String'
      }),
      filename: prefix ? prefix + files[index] : files[index]
    });
  });
  let count = 0;
  [...dirCache].forEach(directory => {
    fs.mkdir(
      `${path}${dir.split('/')[0]}${prefix}/${directory}`,
      { recursive: true },
      err => {
        if (err) {
          console.log(error);
        } else {
          if (count === dirCache.size - 1) {
            payload.map(file => {
              fs.writeFile(`${path}${dir}${file.filename}`, file.data, err => {
                if (err) {
                  console.log(err);
                  return;
                }
              });
            });
          }
          count++;
        }
      }
    );
  });
};

process.on('message', data => unpacker(data));
