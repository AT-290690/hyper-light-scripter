const fs = require('fs');
const LZUTF8 = require('lzutf8');
const { compress } = LZUTF8;
const packager = ({ userId, files, path, filename, secret }) => {
  const data = { files: files, code: [] };
  if (files.length === 0) {
    const fragmentArr = filename.split('_' + userId + '_fragment_');
    data.code[0] = fragmentArr[1];
    let fragmentSymbol;
    switch (fragmentArr[0].substr(0, 3)) {
      case '>>>':
        fragmentSymbol = '';
        break;
      default:
        fragmentSymbol = '...';
        break;
    }
    process.send({
      filename: fragmentSymbol + fragmentArr[0] + '_' + userId,
      userId,
      secret,
      data: data.code[0] ? data : null
    });
  } else {
    let count = 0;

    files.forEach((file, index) => {
      fs.readFile(path + userId + file, 'utf8', (error, buffer) => {
        if (error) {
          console.log(error);
          return;
        }
        data.code[index] = compress(buffer, {
          inputEncoding: 'String',
          outputEncoding: 'Base64'
        });

        if (count === files.length - 1) {
          process.send({
            filename: '>_' + filename + '_' + userId,
            userId,
            secret,
            data
          });
        }
        count++;
      });
    });
  }
};
process.on('message', data => packager(data));
