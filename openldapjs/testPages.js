'use strict'
const LDAPWrap = require('./modules/ldapAsyncWrap.js');
const host = 'ldap://localhost:389';
const dnAdmin = 'cn=admin,dc=demoApp,dc=com';
const dnUser = 'cn=cghitea,ou=users,o=myhost,dc=demoApp,dc=com';
const searchBase = 'dc=demoApp,dc=com';
const password = 'secret';
let clientLDAP = new LDAPWrap(host);


clientLDAP.initialize()
  .then(() => {
    clientLDAP.bind(dnAdmin, password)
      .then(() => {
        let searchID = 1;
        clientLDAP.pagedSearch('dc=demoApp,dc=com', 2, 'objectClass=*', 2,searchID)
          .then((result) => {
         
            return clientLDAP.pagedSearch('dc=demoApp,dc=com', 2, 'objectClass=*', 2,searchID);  

          })
          .then( (result) => {
          
            return clientLDAP.pagedSearch('dc=demoApp,dc=com', 2, 'objectClass=*', 2,searchID);
          })
          .then( (result) => {
            const count = (result.result.match(/\ndn:/g) || []).length;
            console.log('-----------2- result number:------'+count );
          //  console.log('-------2-------'+result.result);
            console.log('-----2-----------------'+searchID);
          })
      });

  });

  