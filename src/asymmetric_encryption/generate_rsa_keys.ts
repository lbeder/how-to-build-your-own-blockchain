const PromiseA = require("bluebird").Promise;
const ursa = require("ursa");
const fs = PromiseA.promisifyAll(require("fs"));
const path = require("path");
const mkdirpAsync = PromiseA.promisify(require("mkdirp"));

const keyDirRelativePath = `../../RSAKeys/`;

const keypair = (pathname: string) => {
  const key = ursa.generatePrivateKey(1024, 65537);
  const privpem = key.toPrivatePem();
  const pubpem = key.toPublicPem();
  const privkey = path.join(pathname, "privkey.pem");
  const pubkey = path.join(pathname, "pubkey.pem");

  return mkdirpAsync(pathname)
    .then(() => {
      return PromiseA.all([
        fs.writeFileAsync(privkey, privpem, "ascii"),
        fs.writeFileAsync(pubkey, pubpem, "ascii")
      ]);
    })
    .then(() => {
      return key;
    });
};

export const generateAccountKeys = (accountName: string): Promise<any> => {
  return PromiseA.all([keypair(`${keyDirRelativePath}${accountName}Keys`)]);
};
