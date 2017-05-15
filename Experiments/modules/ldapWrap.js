'use strict';

//Import the addon function and openLdap libraries
const client = require('../addonFile/build/Release/binding');
/* Just for Testing ErrorHandling */
//const ErrorHandling = require('./ErrorHandling');
//const LdapError = require('./LdapError');
const ErrorHandler = require('./NewErrorHandler/ErrorHandler');

const myClient = new client.LDAPClient();
const myClient2 = new client.LDAPClient();

const hostAddress = '10.16.0.194';
const portAddress = 389;
const Host = `ldap://${hostAddress}:${portAddress}`;
let bindDN = 'cn=rmaxim,ou=users,o=myhost,dc=demoApp,dc=com';
const passwordUser = 'secret';
const searchBase = 'ou=users,o=myhost,dc=demoApp,dc=com';
const searchFilter = '(objectclass=*)';
const scope = 2;
const cnValue = `bandrei`;
const NewUser = `cn=${cnValue},ou=users,o=myhost,dc=demoApp,dc=com`;
const snValue = 'Belei Andrei';
const email = 'beleiandrei@yahoo.com';
const password = 'secret';


function testError() {
  return new Promise((resolve, reject) => {
    reject (new ErrorHandler(53));
  })
}

function callError() {
  testError()
  .then(() => {
    console.log('success');
  })
  .catch((err) => {
    console.log('Error: ' + err._errorText);
    console.log('Error: ' + err._errorClass);
    console.log('Error: ' + err._error);
  })
}

callError();


const initialization = myClient.initialize(Host);
const initialization2 = myClient2.initialize(Host);

if (initialization === 0 || initialization2 === 0) {
    console.log('The initialization was not ok');
    return;
}
else {
    const binding = myClient.bind(bindDN,passwordUser);
    if (binding === 0 || binding === false) {
      console.log('The binding was not ok');
      return;
    }
   const search = myClient.search(searchBase,scope,searchFilter);
   console.log(search);
   console.log('\n\n\n\n\n\n');
   let bindDN2 = 'cn=cghitea,ou=users,o=myhost,dc=demoApp,dc=com';
   const binding2 = myClient2.bind(bindDN2,passwordUser);
   if (binding2 === 0 || binding2 === false) {
      console.log('The binding was not ok');
      return;
    }
   const search2 = myClient2.search(searchBase,scope,searchFilter);
   const searchMax = myClient.search(searchBase,scope,searchFilter);
   console.log(search2);
   console.log('\n\n\n\n\n\n');
   console.log(searchMax);
}



