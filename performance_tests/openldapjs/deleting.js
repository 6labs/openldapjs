'use strict';

const Client = require('../../index.js').Client;
const Promise = require('bluebird');

const rdn = 'cn=testUser';
const dn = 'cn=newPoint,ou=users,o=myhost,dc=demoApp,dc=com';

const control = [
  {
    oid: 'preread',
    value: ['cn'],
    isCritical: false,

  },
  {
    oid: 'postread',
    value: ['cn'],
    isCritical: false,
  },
];


const t0 = process.hrtime();
const ldapClient = new Client('ldap://localhost:389');

ldapClient.initialize()
  .then(() => {
    return ldapClient.bind('cn=admin,dc=demoApp,dc=com', 'secret');
  })
  .then(() => {
    const args = [];
    for (let i = 0; i < 100; i++) {
      args.push(`${`${rdn + i}`},${dn}`);
    }

    Promise.map(args, (arg) => {
      return ldapClient.delete(arg);
    }, {concurrency: 4})
      .then(() => {
        const end = process.hrtime(t0);
        console.log('Deleting took: %ds %dms', end[0], end[1] / 1e6);
        ldapClient.delete(dn);
      });
  });
