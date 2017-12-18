'use strict';

const LdapClientLib = require('../libs/ldap_async_wrap.js');

const ldif = require('ldif');

const config = require('./config.json');

const newClient = new LdapClientLib(config.ldapAuthentication.host);

newClient.initialize()
  .then(() => {
    return newClient.startTLS(config.ldapAuthentication.pathFileToCert);
  })
  .then(() => {
    return newClient.bind(config.ldapAuthentication.dnUser, config.ldapAuthentication.passwordUser);
  })
  .then(() => {

    return newClient.pagedSearch(config.ldapSearch.searchBase, config.ldapSearch.scope.one,
      config.ldapSearch.filter, config.ldapSearch.pageSize);
  })
  .then((result) => {
    let pageNumber = 0;
    result.on('data', (data) => {
      console.log('-----------------------------------');
      console.log(`The page number is ${pageNumber += 1}`);
      console.log('-----------------------------------');
      const resultJson = ldif.parse(data.toString());
      const outputOptions = {};

      const JSONstructure = resultJson.toObject(outputOptions);
      console.log(`LDIF structure: ${data.toString()}`);
      JSONstructure.entries.forEach((element) => {
        console.log(element);
      });
    });

    result.on('err', (err) => {
      console.log('-----------------');
      console.error(`Error name: ${err.name}`);
      console.error(`Error code: ${err.constructor.code}`);
      console.error(`Error description: ${err.constructor.description}`);
      console.log('-----------------');
    });

    result.on('end', () => {
      console.log('\nStream ends  here');
    });
  })
  .catch((err) => {
    console.log(`${err.name} ${err.constructor.description}`);
  });
