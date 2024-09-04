#!/usr/bin/node

const sha1 = require('sha1');

/**
 * Hashes a password using SHA-1.
 * @param {string} pwd - The password to hash.
 * @returns {string} The hashed password.
 */
function pwdHashed(pwd) {
  return sha1(pwd);
}

/**
 * Retrieves the Authorization header from the request.
 * @param {object} req - The request object.
 * @returns {string|null} The Authorization header or null if not present.
 */
function getAuthzHeader(req) {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }
  return header;
}

/**
 * Extracts the token from the Authorization header.
 * @param {string} authzHeader - The Authorization header.
 * @returns {string|null} The token or null if the header is not Basic.
 */
function getToken(authzHeader) {
  const tokenType = authzHeader.substring(0, 6);
  if (tokenType !== 'Basic ') {
    return null;
  }
  return authzHeader.substring(6);
}

/**
 * Decodes a Base64 encoded token.
 * @param {string} token - The Base64 encoded token.
 * @returns {string|null} The decoded token or null if the format is incorrect.
 */
function decodeToken(token) {
  const decodedToken = Buffer.from(token, 'base64').toString('utf8');
  if (!decodedToken.includes(':')) {
    return null;
  }
  return decodedToken;
}

/**
 * Extracts credentials from the decoded token.
 * @param {string} decodedToken - The decoded token.
 * @returns {object|null} An object with email and password or null if not valid.
 */
function getCredentials(decodedToken) {
  const [email, password] = decodedToken.split(':');
  if (!email || !password) {
    return null;
  }
  return { email, password };
}

module.exports = {
  pwdHashed,
  getAuthzHeader,
  getToken,
  decodeToken,
  getCredentials
};
