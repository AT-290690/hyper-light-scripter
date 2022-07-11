exports.policy = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'https://*'],
      fontSrc: ['*'],
      styleSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", '*'],
      workerSrc: ["'self'", 'data:', 'blob:'],
      frameSrc: ["'self'"],
      mediaSrc: ['*'],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'http://cdnjs.cloudflare.com/',
        'https://cdn.jsdelivr.net/',
        'https://unpkg.com/',
        'https://kit.fontawesome.com/'
      ],
      objectSrc: ["'none'"],
      imgSrc: ["'self'", 'data: *'],
      upgradeInsecureRequests: []
    },
    reportOnly: false
  }
};
