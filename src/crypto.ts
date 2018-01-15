export class Crypto {
  public privateKey: any;
  public publicKey: any;

  constructor() {

  }

  public async createKeys(): Promise<string> {
    const {privateKey, publicKey} = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256", //can be "P-256", "P-384", or "P-521"
      },
      false, //whether the key is extractable (i.e. can be used in exportKey)
      ["sign", "verify"] //can be any combination of "sign" and "verify"
    );
    this.privateKey = privateKey;
    this.publicKey = publicKey;

    const {x, y} = await window.crypto.subtle.exportKey(
      "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
      publicKey //can be a publicKey or privateKey, as long as extractable was true
    );
    return x + y;
  }

  public async sign(buffer: any) {
    // turn transaction into uint8Array
    const signature = await window.crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: {name: "SHA-256"},
      },
      this.privateKey,
      buffer
    );
    return signature;
  }

  public async verify(sender: string, buffer: Uint8Array, signature: Uint8Array) {
    const x = sender.slice(0, 43);
    const y = sender.slice(43, 86);
    const publicKeyParams = {
      crv: 'P-256',
      ext: true,
      key_ops: ['verify'],
      kty: 'EC',
      x: x,
      y: y
    };
    const publicKey = await window.crypto.subtle.importKey(
      "jwk",
      publicKeyParams,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false,
      ["verify"]
    );
    const isValid = await window.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: {name: "SHA-256"},
      },
      publicKey,
      signature,
      buffer
    );
    return isValid;
  }
}
