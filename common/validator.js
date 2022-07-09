const { mongoPortals } = require('../modules/model.js');
const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');
const { randomBytes } = require('crypto');

const cookieRecepie = () => nanoid() + '.' + randomBytes(20).toString('hex');
class CookieJar {
  #cookies = new Map();
  set(id, cookie) {
    if (cookie.userId) {
      this.#cookies.set(id, cookie);
      setTimeout(
        () => this.#cookies.delete(id),
        this.#cookies.get(id).maxAge * 1000
      );
    }
  }
  get(id) {
    return this.#cookies.get(id);
  }
  destroy(id) {
    this.#cookies.delete(id);
  }
  keys() {
    return this.#cookies.keys();
  }
  values() {
    return [...this.#cookies.values()];
  }
}
const cookieJar = new CookieJar();
const isValidHash = hash =>
  hash &&
  typeof hash === 'string' &&
  hash.split('/')[0] === hash &&
  hash.split('/')[0].length === 21;

exports.sanitizeId = hash => {
  if (!hash) return nanoid();
  const id = hash.trim().split('/').join('');

  if (id.length === 21) {
    return id;
  } else {
    return nanoid();
  }
};

exports.registerUser = async (userId, pass) => {
  const secret = process.env.SECRET;
  const hash = await bcrypt.hash(secret + pass, 8);
  const user = await mongoPortals.findOneFromPortals({ name: userId });
  if (!user) {
    mongoPortals.registerPortal({
      name: userId,
      hash
    });
    return {
      public: userId
    };
  }
};
exports.loginUser = async (id, pass) => {
  const secret = process.env.SECRET;
  const user = await mongoPortals.findOneFromPortals({ name: id });
  if (!user?.hash) {
    return {
      success: 0
    };
  }
  const isValid = await bcrypt.compare(secret + pass, user.hash);
  if (isValid) {
    return {
      success: 1
    };
  } else {
    return { success: 0 };
  }
};
exports.isCredentialValid = (cookie, portal, value) => {
  if (!cookie) return false;
  const userId = cookie.userId;
  if (!userId || !isValidHash(userId)) return false;
  if (portal !== undefined && portal !== userId) return false;
  if (!value || value !== cookie.value) return false;
  return true;
};

exports.cookieJar = cookieJar;
exports.cookieRecepie = cookieRecepie;
exports.isValidHash = isValidHash;
