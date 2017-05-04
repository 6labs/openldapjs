'use strict';

const should = require('should');
const LDAPWrap = require('../modules/ldapAsyncWrap.js');
//const clientLDAP = new LDAPWrap();

describe('Testing the async LDAP search ', () => {
  const host = 'ldap://localhost:389';
  const dnAdmin = 'cn=admin,dc=demoApp,dc=com';
  const dnUser = 'cn=cghitea,ou=users,o=myhost,dc=demoApp,dc=com';

  const password = 'secret';
  let clientLDAP = new LDAPWrap(host);

  beforeEach((next) => {
    clientLDAP = new LDAPWrap(host);


    clientLDAP.initialize()
      .then(() => {
        clientLDAP.bind(dnAdmin, password)
          .then(() => {
            next();
          });

      });
  });
  afterEach(() => {
    clientLDAP.unbind()
      .then(() => {
        next();
      });
  });

  it('should return an empty search', (next) => {
    clientLDAP.search('dc=demoApp,dc=com', 2, 'objectclass=aliens')
      .then((result) => {
        console.log(result);
        //should.deepEqual(result,undefined);
        //next();
        should.deepEqual(result, undefined);
      }).then(() => {
        next();
      });
  });
  /**
   * case for search with non existing search base
   */
  it('should return the root node', (next) => {
    clientLDAP.search('', 0, 'objectclass=*')
      .then((result) => {
        //console.log('result is : '+ result);
        const baseDN = '\ndn:\nobjectClass:top\nobjectClass:OpenLDAProotDSE\n\n';
        console.log(baseDN);
        should.deepEqual(result, baseDN);

      }).then(() => {
        next();
      });

  });
  /**
   * test case for search with access denied
   */

  it('should return nothing', (next) => {
    clientLDAP.unbind()
      .then(() => {
        clientLDAP.bind(dnUser, password)
          .then(() => {
            clientLdap.search('dc=demoApp,cn=com', 2, 'objectClass=*')
              .then((result) => {
                console.log('the result is : ' + result);
                should.deepEqual(result, undefined);
              });
          });
      }).then(() => {
        next();
      });

  });

  /**
   * test case with a single result
   */

  it('should return a single result', (next) => {
    clientLDAP.search('dc=demoApp,dc=com', 2, 'objectClass=simpleSecurityObject')
      .then((result) => {
        //console.log('single result is: ' +result);
        const singleResult = '\ndn:cn=admin,dc=demoApp,dc=com\nobjectClass:simpleSecurityObject\nobjectClass:organizationalRole\ncn:admin\ndescription:LDAP administrator\nuserPassword:{SSHA}UU9JBg/X7r6HK/ARkYnmRTLTCNNisZFA\n\n';
        should.deepEqual(result, singleResult);
      }).then(() => {
        next();
      });
  });

  /**
   * test case with multiple results on the same level( scope argument 1?)
   * unfinished
   */
  it('should return multiple results located on the same level', (next) => {
    clientLDAP.search('dc=demoApp,dc=com', 1, 'objectClass=*')
      .then((result) => {
        console.log('multiple bla bla' + result);
      }).then(() => {
        next();
      });
  });

  /**
   * test case with sequential identical searches
   */

  it('should return the same result', (next) => {
    let firstResult;
    let secondResult;
    clientLDAP.search('dc=demoApp,dc=com', 2, 'objectClass=person')
      .then((result) => {
        firstResult = result;

      });
    clientLDAP.search('dc=demoApp,dc=com', 2, 'objectClass=person')
      .then((result) => {
        secondResult = result;
        should.deepEqual(firstResult, secondResult);
      }).then(() => {
        next();
      });

  });





});