'use strict';

const client = require('../addonFile/build/Release/binding');
const Promise = require('bluebird');

const newClient = new client.LDAPClient();

/**
 * @module LDAPtranzition
 * @class LDAPWrapAsync
 */

module.exports = class LDAPWrapAsync {

 /**
   * Initialize to an LDAP server.
   *
   * @method initialize
   * @param {string} host The host address of server LDAP.
   * @return {Promise} That resolves if the LDAP initialize the structure to a specific server.
   * Reject if the address is incorect.
   */

  initialize(host) {
    return new Promise((resolve, reject) => {
      const status = newClient.initialize(host);
      if(status == 0) {
        reject('ERROR:Initialization');
      } else {
        resolve('Initialized');
      }
    });
  }

  /**
   * Authentificate to LDAP server.
   *
   * @method bind
   * @param {string} username The username of specific client.
   * @param {string} password The password for authentification.
   * @return {Promise} That resolves if the credentials are correct.
   * Reject dn or password are incorect.
   */

  bind(username, password) {
    return new Promise((resolve, reject) => {
      const status = newClient.bind(username, password, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }, (progress) => {
        console.log('Bind in progress');
      });
    });
  }

};
