'use strict';

const LdapAsyncWrap = require('../modules/ldapAsyncWrap.js');
const should = require('should');
const config = require('./config.json');
const errList = require('./errorlist.json');

describe('Testing multiple operations functionalities', () => {
  const hostAddress = config.ldapAuthentification.host;
  const dn = config.ldapAuthentification.dnAdmin;
  const password = config.ldapAuthentification.passwordAdmin;
  let ldapAsyncWrap = new LdapAsyncWrap(hostAddress);

  /* Attributes and Values */
  const attr = config.ldapCompare.attribute;
  const val = config.ldapCompare.value;
  const searchBase = config.ldapSearch.searchBase;

  const newEntry = 'cn=newPointChild111';

  const searchScope = {
    base: 0,
    oneLevel: 1,
    subtree: 2,
  };

  const validEntry = {
    objectClass: config.ldapAdd.objectClass,
    sn: config.ldapAdd.sn,
    description: config.ldapAdd.description,
  };

  const changeAttirbutes = [
    {
      op: config.ldapModify.ldapModificationReplace.operation,
      attr: config.ldapModify.ldapModificationReplace.attribute,
      vals: config.ldapModify.ldapModificationReplace.vals,
    },
    {
      op: config.ldapModify.ldapModificationAdd.operation,
      attr: config.ldapModify.ldapModificationAdd.attribute,
      vals: config.ldapModify.ldapModificationAdd.vals,
    },
    {
      op: config.ldapModify.ldapModificationDelete.operation,
      attr: config.ldapModify.ldapModificationDelete.attribute,
      vals: config.ldapModify.ldapModificationDelete.vals,
    },
  ];

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

  const dnUser = `${newEntry}${config.ldapAdd.dnNewEntry}`;

  let attributeEntry = newEntry.split('=');
  attributeEntry = attributeEntry[1];
  const searchResult =
      `\ndn:${newEntry}${config.ldapAdd.dnNewEntry}\nobjectClass:person\nsn:Entry\ndescription:Tesst\ncn:${attributeEntry}\n\n`;

  beforeEach(() => {
    ldapAsyncWrap = new LdapAsyncWrap(hostAddress);

    return ldapAsyncWrap.initialize()
    .then(() => { return ldapAsyncWrap.bind(dn, password); });
  });

  afterEach(() => { return ldapAsyncWrap.unbind(); });


  it('should add, search, comparte, modify and delete  in multiple times sequential',
     () => {
       return ldapAsyncWrap.add(dnUser, validEntry, controlOperation)
           .then((result1) => {
             let resultOperation;
             resultOperation = result1.split('\n');
             resultOperation = resultOperation[1].split(':');
             resultOperation = resultOperation[1];
             should.deepEqual(resultOperation, ` ${dnUser}`);
             return ldapAsyncWrap.search(
                 searchBase, searchScope.subtree, newEntry);
           })
           .then((result2) => {
             should.deepEqual(result2, searchResult);
             return ldapAsyncWrap.modify(
                 config.ldapModify.ldapModificationReplace.change_dn,
                 changeAttirbutes, controlOperation);
           })
           .then((result3) => {
             let resultOperation;
             resultOperation = result3.split('\n');
             resultOperation = resultOperation[1].split(':');
             resultOperation = resultOperation[1];
             should.deepEqual(
                 resultOperation,
                 ` ${config.ldapModify.ldapModificationReplace.change_dn}`);
             return ldapAsyncWrap.delete(dnUser, controlOperation);
           })
           .then((result4) => {
             let resultOperation;
             resultOperation = result4.split('\n');
             resultOperation = resultOperation[1].split(':');
             resultOperation = resultOperation[1];
             should.deepEqual(resultOperation, ` ${dnUser}`);
             return ldapAsyncWrap.compare(dn, attr, val);
           })

           .then((result5) => {
             should.deepEqual(result5, errList.comparationResTrue);
             return ldapAsyncWrap.add(dnUser, validEntry, controlOperation);
           })
           .then((result6) => {
             let resultOperation;
             resultOperation = result6.split('\n');
             resultOperation = resultOperation[1].split(':');
             resultOperation = resultOperation[1];
             should.deepEqual(resultOperation, ` ${dnUser}`);
             return ldapAsyncWrap.search(
                 searchBase, searchScope.subtree, newEntry);
           })
           .then((result7) => {
             should.deepEqual(result7, searchResult);
             return ldapAsyncWrap.delete(dnUser, controlOperation);
           })
           .then((result8) => {
             let resultOperation;
             resultOperation = result8.split('\n');
             resultOperation = resultOperation[1].split(':');
             resultOperation = resultOperation[1];
             should.deepEqual(resultOperation, ` ${dnUser}`);
             return ldapAsyncWrap.modify(
                 config.ldapModify.ldapModificationReplace.change_dn,
                 changeAttirbutes, controlOperation);
           })
           .then((result9) => {
             let resultOperation;
             resultOperation = result9.split('\n');
             resultOperation = resultOperation[1].split(':');
             resultOperation = resultOperation[1];
             should.deepEqual(
                 resultOperation,
                 ` ${config.ldapModify.ldapModificationReplace.change_dn}`);
             return ldapAsyncWrap.compare(dn, attr, val);
           })

           .then((result10) => {
             should.deepEqual(result10, errList.comparationResTrue);
           });
     });

  it('should make multiple operation in parallel', () => {
    const dnUserNew = `${newEntry}1${config.ldapAdd.dnNewEntry}`;
    let searchEntry = config.ldapAuthentification.dnUser.split(',');
    searchEntry = searchEntry[0];

    const addOP = ldapAsyncWrap.add(dnUser, validEntry, controlOperation)
                  .then(() => {
                    return ldapAsyncWrap.delete(dnUser, controlOperation);
                  });
    const searchOP =
        ldapAsyncWrap.search(searchBase, searchScope.subtree, searchEntry);
    const compareOP = ldapAsyncWrap.compare(dn, attr, val);
    const modifyOP = ldapAsyncWrap.modify(
        config.ldapModify.ldapModificationReplace.change_dn, changeAttirbutes,
        controlOperation);

    return Promise.all([addOP, searchOP, compareOP, modifyOP])
        .then((results) => {
          results.forEach((element) => {
            if (element === errList.comparationResTrue) {
              should.deepEqual(errList.comparationResTrue, element);
            } else {
              let resultOperation;
              resultOperation = element.split('\n');
              resultOperation = resultOperation[1].split(':');
              resultOperation = resultOperation[1];

              if (resultOperation === config.ldapAuthentification.dnUser) {
                should.deepEqual(
                    resultOperation, `${config.ldapAuthentification.dnUser}`);
              } else if (
                  resultOperation ===
                  ` ${config.ldapModify.ldapModificationReplace.change_dn}`) {
                should.deepEqual(
                    resultOperation,
                    ` ${config.ldapModify.ldapModificationReplace.change_dn}`);
              } else if (resultOperation === ` ${dnUser}`) {
                should.deepEqual(resultOperation, ` ${dnUser}`);
              } else {
                should.deepEqual(
                    resultOperation,
                    ` ${newEntry}1${config.ldapAdd.dnNewEntry}`);
              }
            }
          });
        });
  });
});
