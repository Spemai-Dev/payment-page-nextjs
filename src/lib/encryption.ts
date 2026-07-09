import CryptoJS from "crypto-js";

const KEY = "ddfbccae-b4c4-11";
const IV = "ddfbccae-b4c4-11";

export function aesEncrypt(plaintext: string): string {
  const keyHex = CryptoJS.enc.Utf8.parse(KEY);
  const ivHex = CryptoJS.enc.Utf8.parse(IV);
  const srcs = CryptoJS.enc.Utf8.parse(plaintext);
  const encrypted = CryptoJS.AES.encrypt(srcs, keyHex, {
    iv: ivHex,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.ciphertext.toString();
}

export function aesDecrypt(ciphertext: string): string {
  const keyHex = CryptoJS.enc.Utf8.parse(KEY);
  const ivHex = CryptoJS.enc.Utf8.parse(IV);
  const hexString = CryptoJS.enc.Hex.parse(ciphertext);
  const srcs = CryptoJS.enc.Base64.stringify(hexString);
  const decrypted = CryptoJS.AES.decrypt(srcs, keyHex, {
    iv: ivHex,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

export function replaceAll(str: string, find: string, replace: string): string {
  const escapedFind = find.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  return str.replace(new RegExp(escapedFind, "g"), replace);
}

export function repairJson(data: string): any {
  let str = data;
  str = replaceAll(str, "True", "true");
  str = replaceAll(str, "False", "false");
  str = replaceAll(str, "(", "");
  str = replaceAll(str, ")", "");

  try {
    const doubleQuoted = str.replace(/'/g, '"');
    return JSON.parse(doubleQuoted);
  } catch (e) {
    try {
      // Fallback to eval-like JSON parse if it's not strictly formatted
      return (0, eval)("(" + str + ")");
    } catch (err) {
      return {};
    }
  }
}

export function responseDecrypt(responseText: string): any {
  try {
    const plaintext = aesDecrypt(responseText);
    return repairJson(plaintext);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
}

export function requestEncrypt(jsonObj: any): string {
  try {
    const jsonStr = JSON.stringify(jsonObj);
    return aesEncrypt(jsonStr);
  } catch (error) {
    console.error("Encryption failed:", error);
    return "";
  }
}

export function getJsonHash(jsonObj: any): string {
  try {
    let jsonString = JSON.stringify(jsonObj);
    jsonString = jsonString.replace(/'/g, '"');
    jsonString = jsonString.replace(/\s+/g, ""); // strip whitespace (spaces and tabs)
    jsonString = jsonString.replace(/[\r\n\x0B\x0C\u0085\u2028\u2029]+/g, "");

    return CryptoJS.SHA256(jsonString).toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error("Hash generation failed:", error);
    return "";
  }
}

export function jsonToShaValidator(jsonObj: any, hash: string): boolean {
  const generatedHash = getJsonHash(jsonObj);
  return generatedHash === hash;
}
