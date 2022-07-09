'use strict';

const fs = require('fs');
const { Readable } = require('stream');
const {
  isCredentialValid,
  registerUser,
  loginUser,
  sanitizeId,
  isValidHash,
  cookieJar,
  cookieRecepie
} = require('../common/validator.js');
const {
  mongoScripts,
  mongoPortals,
  mongoArchive
} = require('../modules/model.js');
const { fork } = require('child_process');
// const cron = require('node-cron');
const cpu = require('os');
const path = './public/data/storage/portals/';
const cores = cpu.cpus().length;
const coreThirds = Math.floor(cores / 3);
const coresMap = {
  packeging: Math.max(coreThirds - 2, 1),
  unpackaging: coreThirds + 1,
  fs: coreThirds + 2
};

const createForkPool = (N, module) =>
  Array.from({ length: N })
    .fill(null)
    .map((_, index) => ({ index, pending: false, fork: fork(module), module }));

const createForkListeners = (pool, callback = () => {}) =>
  pool.map((child, index) => {
    child.fork.on('message', (...args) => {
      callback(...args);
      pool[index].pending = false;
    });
    child.fork.on('close', () => {
      pool[index] = { index, pending: false, fork: fork(child.module) };
    });
  });

const findFreeFork = pool => {
  const freeFork = pool.find(f => !f.pending);
  if (freeFork) {
    return freeFork;
  } else if (!freeFork) {
    return pool[0];
  }
};

const assingTaskToFreeFork = (pool, { fork, index }, ...args) => {
  pool[index].pending = true;
  fork.send(...args);
};

const packagerForkPool = createForkPool(
  coresMap.packeging,
  __dirname + '/../modules/packager.js'
);

createForkListeners(packagerForkPool, ({ data, userId, secret, filename }) =>
  mongoScripts.saveScript({ name: filename, userId, secret, data })
);

const unpackerForkPool = createForkPool(
  coresMap.unpackaging,
  __dirname + '/../modules/unpacker.js'
);

createForkListeners(unpackerForkPool);

const fileOperationsForkPool = createForkPool(
  coresMap.fs,
  __dirname + '/../modules/fileOperations.js'
);

createForkListeners(fileOperationsForkPool);

const { htmlBuilder } = require('../common/htmlBuilder.js');
// const { msToTime } = require('../common/helpers.js');
// const getRealIp = req =>
//   req.header('x-forwarded-for') || req.connection.remoteAddress;

const initQuine = async (quine, dir) => {
  quine.forEach(async quine => {
    const query = { name: quine };
    try {
      const data = await mongoScripts.findOneFromScripts(query);
      if (data?.script) {
        const { code, files } = data.script;
        const free = findFreeFork(unpackerForkPool);
        assingTaskToFreeFork(
          unpackerForkPool,
          free,
          { dir, path: './public/data/storage/root/', prefix: '', code, files },
          () => {
            free.pending = false;
          }
        );
      }
    } catch (error) {
      if (error) {
        console.log(error);
      }
    }
  });
};

exports.getSnippet = async (req, res) => {
  const { name, prefix, userId } = req.body;
  const dir = userId + '/';
  const query = { name };
  try {
    const data = await mongoScripts.findOneFromScripts(query);
    if (data?.script) {
      if (
        data.secret === 1 &&
        !isCredentialValid(
          cookieJar.get(data.userId),
          data.userId,
          req.cookies[data.userId]
        )
      ) {
        res.code(401).send();
        return;
      }
      const { code, files } = data.script;
      if (files.length === 0) {
        return res.code(200).send({ code: code[0], files: [] });
      } else {
        const free = findFreeFork(unpackerForkPool);
        assingTaskToFreeFork(
          unpackerForkPool,
          free,
          { dir, path, prefix, code, files },
          () => {
            free.pending = false;
            res.code(200).send({ files: files.map(f => prefix + f) });
          }
        );
      }
    } else return res.code(500).send({ error: 'script not found!' });
  } catch (error) {
    if (error) {
      console.log(error);
      return res.code(500).send({ error });
    }
    res.code(200).send();
  }
};

exports.getArhivedSnippet = async (req, res) => {
  const { name, userId } = req.body;
  const dir = userId + '/';
  const query = { name };
  try {
    const data = await mongoArchive.findOneFromArchive(query);
    if (
      !isCredentialValid(
        cookieJar.get(data.userId),
        data.userId,
        req.cookies[data.userId]
      )
    ) {
      res.code(401).send();
      return;
    }
    if (data?.script) {
      const { code, files } = data.script;
      if (files.length === 0) {
        return res.code(200).send({ code: code[0], files: [] });
      } else {
        const prefix = '';
        const free = findFreeFork(unpackerForkPool);
        assingTaskToFreeFork(
          unpackerForkPool,
          free,
          { dir, path, prefix, code, files },
          () => {
            free.pending = false;
            res.code(200).send({ files: files.map(f => prefix + f) });
          }
        );
      }
    } else return res.code(500).send({ error: 'script not found!' });
  } catch (error) {
    if (error) {
      console.log(error);
      return res.code(500).send({ error });
    }
    res.code(200).send();
  }
};

exports.deleteScript = async (req, res) => {
  const { name, userId } = req.body;
  const query = { name, userId };
  try {
    const result = await mongoScripts.deleteOneFromScripts(query);
    if (
      !isCredentialValid(
        cookieJar.get(userId),
        result?.value?.userId,
        req.cookies[userId]
      )
    ) {
      res.code(401).send({ success: false });
      return;
    }
    res.code(200).send({ success: !!result?.value });
  } catch (error) {
    if (error) {
      console.log(error);
      return res.code(500).send({ error });
    }
  }
};

exports.buildTempApp = async (req, res) => {
  const { script, lifespan, portal, sleep } = req.query;
  if (script && isValidHash(portal)) {
    const prefix = '';
    const userId = portal;
    const query = { name: '>_' + script };
    const data = await mongoScripts.findOneFromScripts(query);
    const folderName = `${userId}_${script}`;
    const folderPath = `../data/storage/portals/${folderName}/`;
    const createApp = () => {
      const duration = sleep ? 0 : Math.min(30 * 60, +lifespan || 10) * 1000;
      const now = new Date().getTime();
      const end = new Date(now + duration).getTime();
      const index = htmlBuilder(`<div >
      <br/>
    <span id="lifespanDisplay" style="color: var(--error);font-size: 30px"> </span>
    <div style="text-align: center;display:flex;">
    <img title="Open script" class="shake" style="cursor:pointer;display:block;" id="existing"  onClick="window.location.href='${folderPath}'"   src="../../../../assets/images/app.svg" width="100%" height="150vh" />
    <img title="Wake up!" style="cursor:pointer;display:none;fill:var(--comment)" onClick="wakeUp()" id="vanished"  src="../../../../assets/images/app-sleeping.svg" width="100%" height="150vh" />
    </div>
    <h1 class="title">${script}</h1>
    <div  class="description" style="font-size:10px"><p>by <a href="${
      process.env.API
    }/data/storage/root/editor/?script=${script}">Hyper Light Scripter</a></p></div> 
      <p class="description" style="font-size:14px;" id="info">This script is awake!</p>
     </div>
    <script>
      const wakeUp = () => {
        const url = window.location.href;
        const r = new URL(url);
        r.searchParams.delete("sleep");
        const newUrl = r.href;
        window.history.pushState({ path: newUrl }, '', newUrl);
        window.location.reload();
      }
      const lifespanDisplay = document.getElementById('lifespanDisplay');
      const info = document.getElementById('info');
      const msToTime = ms => {
        const seconds = (ms / 1000).toFixed(0);
        const minutes = (ms / (1000 * 60)).toFixed(1);
        const hours = (ms / (1000 * 60 * 60)).toFixed(1);
        const days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
        if (seconds < 60) return seconds + ' Sec';
        else if (minutes < 60) return minutes + ' Min';
        else if (hours < 24) return hours + ' Hrs';
        else return days + ' Days';
      };
      const updateDuration = (end) => {
        const current = new Date().getTime();
        const diff = end - current;
        setTimeout(() => {
          if (end <= current) {
            lifespanDisplay.textContent = 'Sleeping';
            info.textContent = 'This script is sleeping! Wake it up!';
            document.getElementById('existing').style.display = 'none';
            document.getElementById('vanished').style.display = 'block';
            return;
          }
          lifespanDisplay.textContent = msToTime(diff)
          updateDuration(end);
        }, 1000)
      }
      lifespanDisplay.textContent = msToTime(${end - new Date().getTime()})
      updateDuration(${end - 1000});
    </script>
  </div>`);
      res.code(200).type('text/html').send(Readable.from(index));
      setTimeout(
        () =>
          fs.rm(
            `${path}${folderName}`,
            { recursive: true, force: true },
            err => err && console.log(err)
          ),
        duration
      );
    };
    sleep
      ? createApp()
      : fs.access(`${path}${folderName}`, isMissing =>
          isMissing
            ? createUserFolder(folderName, error => {
                if (
                  error ||
                  !data ||
                  data.secret === 1 ||
                  !data.script.files.length
                ) {
                  return res.code(500).send({ error: error });
                }
                const dir = folderName + '/';
                const { code, files } = data.script;
                const free = findFreeFork(unpackerForkPool);
                assingTaskToFreeFork(
                  unpackerForkPool,
                  free,
                  { dir, path, prefix, code, files },
                  () => {
                    free.pending = false;
                    createApp();
                  }
                );
                //  cron.schedule('* * * * *', () =>    console.log('running a task every minute'));
              })
            : res.redirect(folderPath)
        );
  } else res.code(404).redirect('/data/storage/root/404/index.html');
};

exports.listScripts = async (req, res) => {
  const query = { secret: 0 };
  const page = +req.query.page;
  if (req.query.filter) {
    query.userId = req.query.filter;
  }
  if (req.query.find) {
    query.name = { $regex: `.*${req.query.find}.*` };
  }
  if (+req.query.secret === 1) {
    if (
      !isCredentialValid(
        cookieJar.get(query.userId),
        query.userId,
        req.cookies[query.userId]
      )
    ) {
      res.code(401).send();
      return;
    } else {
      query.secret = 1;
    }
  }
  try {
    const data = await mongoScripts.findManyFromScripts(query, {
      skip: page,
      limit: 25
    });
    res.code(200).send({ items: data.map(file => file.name) });
  } catch (error) {
    console.log(error);
    if (error) {
      return res.code(500).send({ error });
    }
  }
};

exports.listArchive = async (req, res) => {
  const query = {};
  if (req.query.filter) {
    query.userId = req.query.filter;
  }
  if (
    !isCredentialValid(
      cookieJar.get(query.userId),
      query.userId,
      req.cookies[query.userId]
    )
  ) {
    res.code(401).send();
    return;
  }
  const page = +req.query.page;

  if (req.query.find) {
    query.name = { $regex: `.*${req.query.find}.*` };
  }
  try {
    const data = await mongoArchive.findManyFromArchive(query, {
      skip: page,
      limit: 25
    });
    res.code(200).send({ items: data.map(file => file.name) });
  } catch (error) {
    console.log(error);
    if (error) {
      return res.code(500).send({ error });
    }
  }
};

exports.listFiles = async (req, res) => {
  const userId = req.body.dir?.split('/')[0];
  if (!isCredentialValid(cookieJar.get(userId), userId, req.cookies[userId])) {
    res.code(401).send();
    return;
  }
  fs.readdir(path + req.body.dir, (err, files) => {
    if (err) {
      return res.code(500).send({ error: err });
    }
    const items = [];
    if (files) {
      files.forEach(file => {
        items.push(file);
      });
    }
    res.code(200).send(JSON.stringify({ items }));
  });
};

exports.createFolder = async (req, res) => {
  const { dir } = req.body;
  const userId = dir?.split('/')[0];
  if (!isCredentialValid(cookieJar.get(userId), userId, req.cookies[userId])) {
    res.code(401).send();
    return;
  }
  fs.mkdir(`${path}/${dir}`, { recursive: true }, err => {
    if (err) {
      console.log(err);
      return res.code(500).send({ error: err });
    } else {
      return res.code(200).send(dir + ' directory created');
    }
  });
};

exports.runCode = async (req, res) => {
  const { file, from, selection, userId, method } = req.body;
  if (!isCredentialValid(cookieJar.get(userId), userId, req.cookies[userId])) {
    res.code(401).send();
    return;
  }
  const filePath = path + userId + '/' + file;
  const free = findFreeFork(fileOperationsForkPool);
  assingTaskToFreeFork(
    fileOperationsForkPool,
    free,
    { type: 'eval_change', filePath, from, selection, method },
    () => {
      free.pending = false;
      res.code(200).send();
    }
  );
};

exports.restoreCode = async (req, res) => {
  const { file, userId } = req.body;
  if (!isCredentialValid(cookieJar.get(userId), userId, req.cookies[userId])) {
    res.code(401).send();
    return;
  }
  const filePath = path + userId + '/' + file;
  const tempFilePath = filePath + '_temp';
  const free = findFreeFork(fileOperationsForkPool);
  assingTaskToFreeFork(
    fileOperationsForkPool,
    free,
    { type: 'eval_revert', filePath, tempFilePath },
    () => {
      free.pending = false;
      res.code(200).send();
    }
  );
};

exports.checkout = async (req, res) => {
  const { file, userId, entry } = req.body;
  if (!isCredentialValid(cookieJar.get(userId), userId, req.cookies[userId])) {
    res.code(401).send();
    return;
  }
  const filePath = path + userId + '/' + file;
  const free = findFreeFork(fileOperationsForkPool);
  assingTaskToFreeFork(
    fileOperationsForkPool,
    free,
    {
      type: 'checkout',
      filePath,
      folderPath: path + userId,
      entry,
      userId,
      file
    },
    () => {
      free.pending = false;
      res.code(200).send();
    }
  );
};

exports.createFile = async (req, res) => {
  const { filename, dir, data, userId } = req.body;
  const [portal, folders] = dir.split(userId);
  if (!isCredentialValid(cookieJar.get(userId), userId, req.cookies[userId])) {
    res.code(401).send();
    return;
  }
  const filePath = `${path}${userId}/${
    folders ? folders + '/' : ''
  }${filename}`;

  const free = findFreeFork(fileOperationsForkPool);
  assingTaskToFreeFork(
    fileOperationsForkPool,
    free,
    Array.isArray(data)
      ? { type: 'save_file_changes', filePath, data }
      : { type: 'create_file', filePath, data },
    () => {
      free.pending = false;
      res.code(200).send();
    }
  );
};

exports.eraseFile = async (req, res) => {
  const { filename } = req.body;
  const dir = req.body.dir ? '/' + req.body.dir + '/' : '';
  const userId = req.body.dir?.split('/')[0];
  if (!isCredentialValid(cookieJar.get(userId), userId, req.cookies[userId])) {
    res.code(401).send();
    return;
  }
  const filePath = `${path}${dir}${filename}`;
  const free = findFreeFork(fileOperationsForkPool);
  assingTaskToFreeFork(
    fileOperationsForkPool,
    free,
    { type: 'erase_file', filePath },
    () => {
      free.pending = false;
      res.code(200).send();
    }
  );
};

exports.emptyFolder = async (req, res) => {
  const dir = req.body.dir ? '/' + req.body.dir + '/' : '';
  const folders = req.body.dir?.split('/');
  const userId = folders[0];
  if (
    !isCredentialValid(cookieJar.get(userId), folders[0], req.cookies[userId])
  ) {
    res.code(401).send();
    return;
  }

  const folderPath = path + dir;
  if (folderPath.trim() !== path) {
    const free = findFreeFork(fileOperationsForkPool);
    assingTaskToFreeFork(
      fileOperationsForkPool,
      free,
      {
        type: 'empty_folder',
        folderPath,
        isRoot: dir === '/' + folders[0] + '/'
      },
      () => {
        free.pending = false;
        res.code(200).send();
      }
    );
  }
};

exports.zipFolder = async (req, res) => {
  const dir = req.body.dir ? '/' + req.body.dir + '/' : '';
  const userId = req.body.dir?.split('/')[0];
  if (!isCredentialValid(cookieJar.get(userId), userId, req.cookies[userId])) {
    res.code(401).send();
    return;
  }
  const folderPath = path + dir;
  if (folderPath.trim() !== path) {
    const free = findFreeFork(fileOperationsForkPool);
    assingTaskToFreeFork(
      fileOperationsForkPool,
      free,
      { type: 'zip_folder', folderPath },
      () => {
        free.pending = false;
        res.code(200).send();
      }
    );
  }
};

exports.pushSnippet = async (req, res) => {
  const { filename, userId, files, secret } = req.body;
  if (!isCredentialValid(cookieJar.get(userId), userId, req.cookies[userId])) {
    res.code(401).send();
    return;
  }

  const free = findFreeFork(packagerForkPool);
  assingTaskToFreeFork(
    packagerForkPool,
    free,
    {
      userId,
      files,
      path,
      secret,
      filename
    },
    () => {
      res.code(200).send();
    }
  );
};
const createUserFolder = (
  id,
  callback = (error, id) =>
    error ? console.log(erorr) : console.log(id + ' portal is created!')
) => {
  fs.mkdir(`${path}/${id}`, { recursive: true }, err => callback(err, id));
};

const onClose = (id, callback = () => {}) => {
  fs.access(`${path}${id}`, isMissing => {
    if (!isMissing) fs.rm(`${path}${id}`, { recursive: true }, callback);
  });
};

exports.register = async (req, res) => {
  const id = sanitizeId(req.body.id);
  const { pass } = req.body;
  if (!pass) {
    return res.code(403).send({ message: `Invalid credentials!` });
  }
  if (await mongoPortals.findOneFromPortals({ name: id })) {
    return res.code(403).send({ message: `User ${id} already exists!` });
  } else {
    const credentials = await registerUser(id, pass);
    if (!credentials) return res.code(401).send();
    const value = cookieRecepie();
    const maxAge = 60 * 60 * process.env.TOKEN_EXPIRE_HOURS;
    cookieJar.set(id, {
      userId: id,
      value,
      maxAge
    });

    createUserFolder(id);
    res
      .code(200)
      .setCookie(id, value, {
        path: '/',
        httpOnly: true,
        sameSite: true,
        maxAge
      })
      .send(credentials);
  }
};

exports.login = async (req, res) => {
  const id = sanitizeId(req.body.id);
  const { pass, oldId } = req.body;
  if (oldId && oldId !== id) {
    // if (req.session) {
    //   req.session.cookie.expires = new Date().getTime() - 60000;
    // }
    onClose(oldId);
  }
  if (!id || !pass) {
    return res.code(401).send({ message: 'Invalid credentials!' });
  }
  const { success } = await loginUser(id, pass);
  if (success === 1) {
    const maxAge = 60 * 60 * process.env.TOKEN_EXPIRE_HOURS;

    const value = cookieRecepie();
    cookieJar.set(id, {
      userId: id,
      value,
      maxAge
    });
    createUserFolder(id);

    return res
      .code(200)
      .setCookie(id, value, {
        path: '/',
        httpOnly: true,
        sameSite: true,
        maxAge
      })
      .send({
        message: 'Login successful!'
      });
  } else {
    return res.code(401).send({ message: 'Invalid credentials!' });
  }
};
exports.logout = async (req, res) => {
  onClose(req.id);
  res.send();
};
exports.createUserId = async (req, res) => {
  const hasId = !!req.body.id;
  const id = sanitizeId(req.body.id);
  if (hasId && isCredentialValid(cookieJar.get(id), id, req.cookies[id])) {
    createUserFolder(id);
    return res.code(200).send({ id });
  } else {
    const tempId = sanitizeId();
    const maxAge = 60 * 60 * process.env.TOKEN_EXPIRE_HOURS * 2;
    // console.log(cookieJar);
    const value = cookieRecepie();
    cookieJar.set(tempId, {
      userId: tempId,
      value,
      maxAge
    });

    createUserFolder(tempId);
    if (!hasId)
      res
        .code(200)
        .setCookie(tempId, value, {
          path: '/',
          httpOnly: true,
          sameSite: true,
          maxAge
        })
        .send({ id: tempId });
    else
      res
        .code(401)
        .setCookie(tempId, value, {
          path: '/data/storage/root/editor',
          httpOnly: true,
          sameSite: true,
          maxAge
        })
        .send({ id: tempId });
  }
};

exports.disconnect = async (req, res) => {
  const id = req.query.userId;
  if (
    !req.query.files?.trim() ||
    !isCredentialValid(cookieJar.get(id), id, req.cookies[id])
  ) {
    onClose(id);
    res.send();
  } else {
    const body = {
      userId: req.query.userId,
      secret: 1,
      filename: 'last_script',
      files: req.query.files.split(',')
    };
    const { filename, userId, files, secret } = body;
    const free = findFreeFork(packagerForkPool);
    assingTaskToFreeFork(
      packagerForkPool,
      free,
      {
        userId,
        files,
        path,
        secret,
        filename
      },
      () => {
        onClose(id);
        res.send();
      }
    );
  }
};
