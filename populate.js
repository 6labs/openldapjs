
'use strict';

const fs = require('fs');
const configFile = require('./test/config.json');
const Client = require('./index.js').Client;
const Promise = require('bluebird');
const _ = require('underscore');


const rdn = 'cn=testUser';
const dn = 'cn=newPoint,o=myhost,dc=demoApp,dc=com';
const validEntryObject = [
  {
    attr: 'objectClass',
    vals: ['person'],
  },
  {
    attr: 'description',
    vals: ['testData'],
  },
  {
    attr: 'cn',
    vals: ['test'],
  },
  {
    attr: 'sn',
    vals: ['test'],
  },


];


const ldapClient = new Client(process.env.npm_package_config_domain);
const promiseArray = [];

ldapClient.initialize()
  .then(() => {
    return ldapClient.bind(
      process.env.npm_package_config_userDn,
      process.env.npm_package_config_userPassword);
  })
  .then(() => {
    ldapClient.add(dn, validEntryObject)
      .then(() => {
        const args = [];
        for (let i = 0; i < 10000; i++) {
          args.push(`${`${rdn + i}`},${dn}`);
        }

        Promise.map(args, (arg) => {
          return ldapClient.add(arg, validEntryObject);
        }, {concurrency: 10});
      });
  });
