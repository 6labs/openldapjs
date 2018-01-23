'use strict';

const configFile = require('../config.json');
const Client = require('../../index').Client;
const Promise = require('bluebird');


/**
 * Helper script that is used to make tests without dependence.
 */

const rdn = configFile.ldapAdd.rdnUser;
const dn = configFile.ldapAdd.dnNewEntry;


const ldapClient = new Client(configFile.ldapAuthentication.host);

ldapClient.initialize()
  .then(() => {
    return ldapClient.bind(
      configFile.ldapAuthentication.dnAdmin,
      configFile.ldapAuthentication.passwordAdmin);
  })
  .then(() => {
    const args = [];
    const operationRes = [];
    for (let i = 0; i < 10; i += 1) {
      args.push(`${rdn}${i}${dn}`);
    }

    /* For LDAP rename operation */
    const deleteOp = ldapClient.delete(`${configFile.ldapRename.newrdn},${configFile.ldapRename.newparent}`);
    /* For LDAP add operation */
    const promiseRes = Promise.map(args, (arg) => {
      return ldapClient.delete(arg);
    });

    return Promise.all([deleteOp, promiseRes]
      .map((p) => {
        return p.catch((e) => {
          return e;
        });
      }));
  });

