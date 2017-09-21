'use strict';

const LdapAsyncWrap = require('../modules/ldapAsyncWrap.js');
const should = require('should');
const config = require('./config.json');
const errList = require('./errorlist.json');

describe('Testing the Compare functionalities', () => {
  const hostAddress = config.ldapAuthentication.host;
  const dn = config.ldapAuthentication.dnAdmin;
  const password = config.ldapAuthentication.passwordAdmin;
  let ldapAsyncWrap = new LdapAsyncWrap(hostAddress);

  /* Attributes and Values */
  const attr = config.ldapCompare.attribute;
  const val = config.ldapCompare.value;

  beforeEach(() => {
    ldapAsyncWrap = new LdapAsyncWrap(hostAddress);

    return ldapAsyncWrap.initialize().then(
        () => { return ldapAsyncWrap.bind(dn, password); });
  });

  afterEach(() => { return ldapAsyncWrap.unbind(); });


  it('should reject if dn is not string', () => {
    return ldapAsyncWrap.compare(1, attr, val).catch((error) => {
      should.deepEqual(error.message, errList.typeErrorMessage);
    });
  });

  it('should compare existing attribute', () => {
    return ldapAsyncWrap.compare(dn, attr, val).then((result) => {
      should.deepEqual(result, errList.comparisonResTrue);
    });
  });


  it('should compare not existing value for attribute', () => {
    const nonVal = 'nonExistingValue';
    return ldapAsyncWrap.compare(dn, attr, nonVal).then((result) => {
      should.deepEqual(result, errList.comparisonResFalse);
    });
  });


  it('should compare not existing attribute', () => {
    const nonAttr = 'nonExistingAttr';
    return ldapAsyncWrap.compare(dn, nonAttr, val).catch((err) => {
      should.deepEqual(err, errList.undefinedType);
    });
  });


  it('should compare not existing object', () => {
    const nonObj = config.ldapCompare.invalidUser;
    return ldapAsyncWrap.compare(nonObj, attr, val).catch((err) => {
      should.deepEqual(err, errList.ldapNoSuchObject);
    });
  });


  it('should not compare with denied access', () => {
    const noAccessDn = config.ldapAuthentication.dnUser;
    ldapAsyncWrap = new LdapAsyncWrap(hostAddress);

    return ldapAsyncWrap.initialize()
        .then(() => { return ldapAsyncWrap.bind(noAccessDn, password); })
        .then(() => { return ldapAsyncWrap.compare(dn, attr, val); })
        .catch((err) => { should.deepEqual(err, errList.ldapNoSuchObject); });
  });

  it('should not compare if the binding failed', () => {
    ldapAsyncWrap = new LdapAsyncWrap(hostAddress);

    return ldapAsyncWrap.initialize()
        .then(() => {
          const noPass = config.ldapCompare.invalidPassword;
          return ldapAsyncWrap.bind(dn, noPass);
        })
        .catch(() => { return ldapAsyncWrap.compare(dn, attr, val); })
        .catch((err) => { should.deepEqual(err, errList.bindErrorMessage); });
  });

  it('should throw an error if the binding was not done before comparing',
     () => {
       ldapAsyncWrap = new LdapAsyncWrap(hostAddress);

       return ldapAsyncWrap.initialize()
           .then(() => { return ldapAsyncWrap.compare(dn, attr, val); })
           .catch(
               (err) => { should.deepEqual(err, errList.bindErrorMessage); });
     });


  it('should not compare if the client is unbound', () => {
    return ldapAsyncWrap.unbind()
        .then(() => { return ldapAsyncWrap.compare(dn, attr, val); })
        .catch((err) => { should.deepEqual(err, errList.bindErrorMessage); });
  });

  it('should compare several identical sequential compares', () => {
    return ldapAsyncWrap.compare(dn, attr, val)
        .then((result1) => {
          should.deepEqual(result1, errList.comparisonResTrue);
          return ldapAsyncWrap.compare(dn, attr, val);
        })
        .then((result2) => {
          should.deepEqual(result2, errList.comparisonResTrue);
          return ldapAsyncWrap.compare(dn, attr, val);
        })
        .then((result3) => {
          should.deepEqual(result3, errList.comparisonResTrue);
        });
  });


  it('should compare several different sequential compares with error cases',
     () => {
       const nonVal = 'nonExistingValue';
       const nonAttr = 'nonExistingAttr';
       return ldapAsyncWrap.compare(dn, attr, val)
           .then((result1) => {
             should.deepEqual(result1, errList.comparisonResTrue);
             return ldapAsyncWrap.compare(dn, nonAttr, val);
           })
           .catch((err) => {
             should.deepEqual(err, errList.undefinedType);
             return ldapAsyncWrap.compare(dn, attr, nonVal);
           })
           .then((result3) => {
             should.deepEqual(result3, errList.comparisonResFalse);
           });
     });

  it('should compare several parallel compares', () => {
    const firstCompare = ldapAsyncWrap.compare(dn, attr, val);
    const secondCompare = ldapAsyncWrap.compare(dn, attr, val);
    const thirdCompare = ldapAsyncWrap.compare(dn, attr, val);

    return Promise.all([firstCompare, secondCompare, thirdCompare])
        .then((values) => {
          should.deepEqual(values[0], errList.comparisonResTrue);
          should.deepEqual(values[1], errList.comparisonResTrue);
          should.deepEqual(values[2], errList.comparisonResTrue);
        });
  });
});
