const mongoDB = require('mongodb');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();
const uri = process.env.DB;
const { MongoClient } = mongoDB;
const init = {
  register: callback => (this.callback = callback),
  trigger: () => this.callback()
};
exports.init = init;
const mongoScripts = {
  collection: null
};

const mongoPortals = {
  collection: null
};

const mongoArchive = {
  collection: null
};

const mongoInstance = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoInstance.connect(error => {
  if (error) {
    console.log(error);
    return;
  }
  mongoPortals.collection = mongoInstance
    .db('hyper-light-scripter')
    .collection('portals');

  mongoScripts.collection = mongoInstance
    .db('hyper-light-scripter')
    .collection('scripts');

  mongoArchive.collection = mongoInstance
    .db('hyper-light-scripter')
    .collection('archive');

  mongoScripts.export = async () => {
    const data = await mongoScripts.collection.find({}).toArray();
    fs.writeFile(
      `./private/backup_${new Date().getTime()}.json`,
      JSON.stringify(data),
      err => err
    );
  };

  mongoScripts.import = async seed => {
    // seed -> ./private/seed.json
    if (seed) {
      fs.readFile(seed, 'utf8', (error, buffer) => {
        if (error) console.log(error);
        else {
          const data = JSON.parse(buffer);
          data.forEach(item => {
            delete item._id; // let mongo db create new ids
            mongoScripts.collection.insertOne(item);
          });
        }
      });
    }
  };
  // mongoScripts.import('./private/seed.json');
  mongoPortals.registerPortal = async ({ name, hash }) => {
    if (name && hash) {
      const query = { name };
      const update = { $set: { hash } };
      const options = { upsert: true };
      try {
        await mongoPortals.collection.findOneAndUpdate(query, update, options);
      } catch (error) {
        if (error) {
          console.log(error);
          return;
        }
      }
    }
  };

  mongoPortals.findOneFromPortals = async query =>
    await mongoPortals.collection.findOne(query);

  mongoPortals.findManyFromPortals = async query =>
    await mongoPortals.collection.find(query).project({ _id: 0 }).toArray();

  mongoScripts.saveScript = async ({ name, userId, secret, data }) => {
    if (data !== null) {
      const query = { name: name };
      const update = { $set: { script: data, userId, secret: secret ? 1 : 0 } };
      const options = { upsert: true };
      try {
        await mongoScripts.collection.findOneAndUpdate(query, update, options);
      } catch (error) {
        if (error) {
          console.log(error);
          return;
        }
      }
    }
  };

  mongoScripts.findOneFromScripts = async query =>
    await mongoScripts.collection.findOne(query);

  mongoScripts.findManyFromScripts = async (query, pagination) =>
    await mongoScripts.collection
      .find(query)
      .sort({ $natural: -1 })
      .limit(pagination.limit)
      .skip(pagination.skip * pagination.limit)
      .project({ _id: 0, script: 0, userId: 0, secret: 0 })
      .toArray();

  mongoArchive.findOneFromArchive = async query =>
    await mongoArchive.collection.findOne(query);
  mongoArchive.findManyFromArchive = async (query, pagination) =>
    await mongoArchive.collection
      .find(query)
      .sort({ $natural: -1 })
      .limit(pagination.limit)
      .skip(pagination.skip * pagination.limit)
      .project({ _id: 0, script: 0, userId: 0, secret: 0 })
      .toArray();

  mongoScripts.deleteOneFromScripts = async query => {
    try {
      const record = await mongoScripts.findOneFromScripts(query);
      if (record) {
        const timeStamp = new Date().getTime();
        const archived = {
          name: record.name + '_' + timeStamp,
          script: record.script,
          userId: record.userId
        };
        await mongoArchive.collection.insertOne(archived);
        return await mongoScripts.collection.findOneAndDelete(query);
      }
      return null;
    } catch (err) {
      console.log(err);
      return null;
    }
  };
  mongoScripts.deleteManyFromScripts = async query =>
    await mongoScripts.collection.deleteMany(query);
  // const currentStamp = new Date().getTime();
  // mongoPortals.findManyFromPortals().then(portals =>
  //   portals.forEach(({ name, hash, stamp }) => {
  //     if (stamp && stamp > currentStamp) usersCreds[name] = hash;
  //   })
  // );
  init.trigger();
});

exports.mongoInstance = mongoInstance;
exports.mongoPortals = mongoPortals;
exports.mongoScripts = mongoScripts;
exports.mongoArchive = mongoArchive;
