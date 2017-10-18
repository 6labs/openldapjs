'use strict';

const should = require('should');
const LDAPWrap = require('../modules/ldapAsyncWrap.js');
const config = require('./config.json');
const errList = require('./errorList.json');
const errorHandler = require('../modules/errors/error_dispenser');

describe('Testing the async LDAP authentication', () => {
  const host = config.ldapAuthentication.host;
  const dn = config.ldapAuthentication.dnAdmin;
  const password = config.ldapAuthentication.passwordAdmin;
  let clientLDAP = new LDAPWrap(host);

  beforeEach(() => {
    clientLDAP = new LDAPWrap(host);
    return clientLDAP.initialize();
  });
  afterEach(() => {});

  it('should bind to the server with valid credentials', () => {
    return clientLDAP.bind(dn, password)
      .then((result) => {
        should.deepEqual(result, undefined);
      });
  });

  it('should not bind to the server using invalid credentials', () => {

    const CustomError = errorHandler(errList.invalidCredentials);
    return clientLDAP
      .bind(
        config.ldapCompare.invalidUser, config.ldapCompare.invalidPassword)
      .then(() => {
        should.fail('should not have succeeded');
      })
      .catch(CustomError, (err) => {
        should.deepEqual(err, new CustomError(errList.ldapBindErrorMessage));
      })
      .catch((err) => {
        should.fail('did not expect generic error');
      });
  });

  it('should unbind from the server', () => {
    return clientLDAP.unbind()
      .then(
        (result) => { should.deepEqual(result, undefined); });
  });

});
