const app = require('fastify')({
  logger: false,
  // logger: { prettyPrint: true },
  maxParamLength: 200,
  caseSensitive: true,
  bodyLimit: 262144 // 256 kb - about 4800 lines of html
  // bodyLimit: 1048576  // 1 mb
  // bodyLimit: 524288 // 512 kb
});
const v8 = require('v8');
const { htmlBuilder } = require('./common/htmlBuilder.js');
const { Readable } = require('stream');

app.register(require('under-pressure'), {
  maxEventLoopDelay: 5000,
  maxHeapUsedBytes: v8.getHeapStatistics().heap_size_limit,
  maxRssBytes: v8.getHeapStatistics().total_available_size,
  pressureHandler: (req, res, type, value) => {
    res
      .code(503)
      .type('text/html')
      .send(
        Readable.from(
          htmlBuilder(`<p><span id="lifespanDisplay" style="color: var(--error);font-size: 40px">Under Siege!</span>
      <p><div style="text-align: center;">
      <br/>
      <div class="card" style="text-align:center;width: 100%; max-width: 600px; margin: auto; padding: 20px 0">
        <p class="description" id="info">Hyper Light Scripter is under a heavy load. Pleasy retry in a bit.</p>
       </div>
       </div>`)
        )
      );
  }
});

const helmet = require('fastify-helmet');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { init } = require('./modules/model.js');

app.register(helmet, require('./security-policy.js').policy);
// app.use(express.json({ limit: '1mb' }));
// app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.register(require('fastify-rate-limit'), {
  max: 256,
  timeWindow: '1 minute'
});

app.register(require('fastify-cookie'));
app.register(require('fastify-compress'));
app.register(require('fastify-static'), {
  root: path.join(__dirname, 'public')
});

app.get('/', (req, res) => res.redirect('/data/storage/root/editor/'));

app.register(require('./routes/storage.js'), { prefix: '/storage' });

app.decorate('notFound', (req, res) => {
  res
    .code(404)
    .type('text/html')
    .send(
      fs.createReadStream(
        __dirname + '/public/data/storage/root/404/index.html'
      )
    );
});
app.setNotFoundHandler(app.notFound);
init.register(() => {
  app.listen(process.env.PORT || 0, process.env.HOST || '::', err => {
    // setInterval(() => {
    //   console.clear();
    //   console.log(app.memoryUsage());
    // }, 2000);
    if (err) console.log(err);
    else console.log(`Listening on port ${app.server.address().port}`);
  });
});
