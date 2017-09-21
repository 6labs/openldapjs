'use strict';

const LDAP = require('../modules/ldapAsyncWrap.js');
const should = require('should');
const Promise = require('bluebird');
const config = require('./config.json');
const errList = require('./errorlist.json');

describe('Testing the async LDAP delete operation', () => {

  const host = config.ldapAuthentification.host;
  const dnAdmin = config.ldapAuthentification.dnAdmin;
  let dnUser;
  const password = config.ldapAuthentification.passwordAdmin;
  let personNr = 1;

  const controlOperation = [
    {
      oid: config.ldapControls.ldapModificationControlPostRead.oid,
      value: config.ldapControls.ldapModificationControlPostRead.value,
      iscritical:
          config.ldapControls.ldapModificationControlPostRead.iscritical,
    },
    {
      oid: config.ldapControls.ldapModificationControlPreRead.oid,
      value: config.ldapControls.ldapModificationControlPreRead.value,
      iscritical: config.ldapControls.ldapModificationControlPreRead.iscritical,
    },
  ];

  let clientLDAP = new LDAP(host);

  beforeEach(() => {
    clientLDAP = new LDAP(host);

    return clientLDAP.initialize()
        .then(() => { return clientLDAP.bind(dnAdmin, password); })
        .then(() => {
          dnUser =
              `${config.ldapDelete.rdnUser}${personNr}${config.ldapDelete.dn}`;
        });
  });
  afterEach(() => { return clientLDAP.unbind(); });

  /* trying to delete with an invalid dn syntax => ldap error code 34 */
  it('should reject the request with invalidDN error code', () => {
    return clientLDAP.delete('garbage')
    .catch(
        (err) => { err.should.be.deepEqual(errList.invalidDnSyntax); });
  });

  it('should reject the request for passing an empty DN', () => {
    return clientLDAP.delete('')
    .catch(
        (err) => { err.should.be.deepEqual(errList.unwillingToPerform); });
  });

  it('should reject the request for passing a null DN', () => {
    return clientLDAP.delete(null)
    .catch(
        (err) => { err.message.should.be.deepEqual(errList.typeErrorMessage); });
  });

  it('should reject the request with no such object error code', () => {
    const rdnUser = 'cn=a1User32,cn=no12DD';
    return clientLDAP.delete(`${rdnUser}${config.ldapDelete.dn}`)
        .catch((err) => { err.should.be.deepEqual(errList.ldapNoSuchObject); });
  });

  it('should delete the given leaf entry', () => {
    return clientLDAP.delete(dnUser)
    .then((result) => {
      should.deepEqual(result, errList.resultSucces);
      personNr += 1;
    });
  });

  it('should reject the request to delete non-leaf node', () => {
    const stringLength = config.ldapDelete.dn.length;
    const parentDn = config.ldapDelete.dn.slice(1, stringLength);
    return clientLDAP.delete(parentDn)
    .catch((err) => { err.should.be.deepEqual(errList.notAllowedOnNonLeaf); });
  });


  it('should reject because BOUND state is required', () => {
    return clientLDAP.unbind()
        .then(() => { return clientLDAP.delete(dnUser); })
        .catch((err) => { should.deepEqual(err.message, errList.bindErrorMessage); });
  });

  it('should delete sequential requests with one error', () => {
    return clientLDAP.delete(dnUser)
        .then((res1) => {
          should.deepEqual(res1, errList.resultSucces);
          return clientLDAP.delete(dnUser);
        })
        .catch((err) => {
          personNr += 1;
          dnUser =
              `${config.ldapDelete.rdnUser}${personNr}${config.ldapDelete.dn}`;
          should.deepEqual(err, errList.ldapNoSuchObject);
          return clientLDAP.delete(dnUser);
        })
        .then((res3) => {
          personNr += 1;
          should.deepEqual(res3, errList.resultSucces);
        });
  });


  it('should delete in paralel requests with one error', () => {
    const first = clientLDAP.delete(dnUser);
    personNr += 1;
    dnUser = `${config.ldapDelete.rdnUser}${personNr}${config.ldapDelete.dn}`;
    const second = clientLDAP.delete(dnUser);
    personNr += 1;
    dnUser = `${config.ldapDelete.rdnUser}${personNr}${config.ldapDelete.dn}`;
    const third = clientLDAP.delete(dnUser);
    personNr += 1;
    dnUser = `${config.ldapDelete.rdnUser}${personNr}${config.ldapDelete.dn}`;
    const four = clientLDAP.delete(dnUser);
    personNr += 1;

    return Promise.all([first, second, third, four])
    .then((values) => {
      should.deepEqual(values[0], errList.resultSucces);
      should.deepEqual(values[1], errList.resultSucces);
      should.deepEqual(values[2], errList.resultSucces);
      should.deepEqual(values[3], errList.resultSucces);
    });
  });

  it('should delete an exist entry and return the control', () => {
    return clientLDAP.delete(dnUser, controlOperation)
    .then((result) => {
      let resultOperation;
      resultOperation = result.split('\n');
      resultOperation = resultOperation[1].split(':');
      resultOperation = resultOperation[1];
      should.deepEqual(resultOperation, ` ${dnUser}`);
    });
  });

});
