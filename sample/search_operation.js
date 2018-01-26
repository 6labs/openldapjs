'use strict';

const LdapClientLib = require('../libs/ldap_async_wrap.js');

const ldif = require('ldif');

const config = require('./config.json');

const newClient = new LdapClientLib(config.ldapAuthentication.host);

newClient.initialize()
  .then(() => {
    console.log('Init successfully');
    return newClient.startTLS(config.ldapAuthentication.pathFileToCert);
  })
  .then(() => {
    console.log('TLS successfully');
    return newClient.bind('cn=admin,dc=demoApp,dc=com', config.ldapAuthentication.passwordUser);
  })
  .then(() => {
    console.log('Bind successfully');
    return newClient.search(config.ldapSearch.searchBase, config.ldapSearch.scope.one,
      config.ldapSearch.filter);
  })
  .then((result) => {
    const resultJson = ldif.parse(result);
    const outputOptions = {};
    const JSONstructure = resultJson.toObject(outputOptions);
    console.log(`LDIF structure: ${result}`);
    console.log('\n\n');
    JSONstructure.entries.forEach((element) => {
      console.log(element);
    });
  })
  .catch((err) => {
    console.log(`${err.name} ${err.constructor.description}`);
  });
