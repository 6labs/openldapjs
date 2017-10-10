'use strict';

const binding = require('../lib/bindings/build/Release/binding.node');
const Promise = require('bluebird');
const SearchStream = require('./streamInterface.js');
const checkParameters = require('./checkVariableFormat/checkVariableFormat');


const E_STATES = {
  CREATED: 0,
  INITIALIZED: 1,
  BOUND: 2,
  UNBOUND: 5,
};

const scopeObject = {
  BASE: 0,
  ONE: 1,
  SUBTREE: 2,
};

const INITIALIZATION_ERROR_MESSAGE = 'Initialize failed!';
const BIND_ERROR_MESSAGE =
    'The operation failed. It could be done if the state of the client is BOUND';


/**
 * @module LDAPTransition
 * @class LDAPAsyncWrap
 */
class LDAPAsyncWrap {

  constructor(host, password) {
    this._hostAddress = host;
    this._binding = new binding.LDAPClient();
    this._stateClient = E_STATES.CREATED;
  }


  /**
        * Initialize to an LDAP server.
        *
        * @method initialize
        * @return {Promise} That resolves with the initialize state code(1) if
        *the
        * LDAP
        ** initialize succeeds
        ** Rejects if the address is incorrect or the client was not created.
        * */
  initialize() {
    return new Promise((resolve, reject) => {
      if (this._stateClient === E_STATES.CREATED) {
        this._binding.initialize(this._hostAddress, (err, result) => {
          if (result) {
            this._binding.startTls((errTls, stateTls) => {
              if (errTls) {
                reject(new Error(errTls));
              } else {
                this._stateClient = E_STATES.INITIALIZED;
                resolve();
              }
            });
          } else {
            reject(err);
          }
        });
      } else {
        reject(new Error(INITIALIZATION_ERROR_MESSAGE));
      }
    });
  }

  /**
        * Authenticate to LDAP server.
       *
       * @method bind
        * @param {String} bindDn The client user DN.
        * @param {String} passwordUser The client's password.
       * @return {Promise} That resolves if the credentials are correct.
        * Rejects if dn or password are incorrect or the client did not
       * initialize.
        * */

  bind(bindDn, passwordUser) {
    return new Promise((resolve, reject) => {
      if (this._stateClient === E_STATES.INITIALIZED) {
        this._binding.bind(bindDn, passwordUser, (err, state) => {
          if (err) {
            this._stateClient = E_STATES.INITIALIZED;
            reject(err);
          } else {
            this._stateClient = E_STATES.BOUND;
            resolve();
          }
        });
      } else {
        reject(new Error(BIND_ERROR_MESSAGE));
      }
    });
  }
  /**
       * Search operation.
       *
       * @method search
       * @param {string} base the base for the search.
       * @param {int} scope scope for the search, can be 0(BASE), 1(ONE) or
       * 2(SUBTREE)
       * @param {string} filter  search filter.
       * @return {Promise} That resolve and return the a string with search
       * result.
       * Reject if an error will occure.
       */

  search(searchBase, scope, searchFilter) {
    return new Promise((resolve, reject) => {
      if (this._stateClient === E_STATES.BOUND) {
        this._binding.search(searchBase, scope, searchFilter, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      } else {
        reject(
          new Error(
            'The Search operation can be done just in BOUND or SECURED state'));
      }
    });
  }


  /**
     * Search operation with reasults displayed page by page.
     *
     * @method pagedSearch
     * @param {string} searchBase the base for the search.
     * @param {int} scope scope for the search, can be 0(BASE), 1(ONE) or
       * 2(SUBTREE)
     * @param {string} searchFilter search filter.
     * @param {int} pageSize The number of entries per LDAP page
     * @return {Readable stream} that pushes search results page by page
     */
  pagedSearch(searchBase, scope, searchFilter, pageSize) {
    if (this._stateClient === E_STATES.BOUND) {
      this._searchID += 1;
      return new SearchStream(
        searchBase, scope, searchFilter, pageSize, this._searchID,
        this._binding);
    }
    return new Error('Client state is unbound');
  }

  /**
       * Compare operation.
       *
       * @method compare
       * @param {String} dn The dn of the entry to compare.
       * @param {String} attr The attribute given for comparison.
       * @param {String} value Value sent to compare.
       * @return {Promise} That resolves and returns True if the elements are
       * equal
       * or
       * False otherwise.
       * Rejects if an error occurs.
       */

  compare(dn, attr, value) {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.BOUND) {
        reject(new Error(BIND_ERROR_MESSAGE));
      } else {
        checkParameters.checkParametersIfString(dn, attr, value);

        this._binding.compare(dn, attr, value, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      }
    });
  }

  /**
        * Perform an LDAP modify operation
        *
        * @method modify
        * @param {String} dn The dn of the entry to modify
        * @param {Array} jsonChange The attribute and value to be changed
        * @return {Promise} That resolves if LDAP modified successfully the
       * entry.
        * Reject if  LDAP rejects the operation or the client's state is not
       * BOUND
        */
  modify(dn, jsonChange, controls) {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.BOUND) {
        reject(new Error(BIND_ERROR_MESSAGE));
      } else {
        const ctrls = controls !== undefined ? controls : null;
        checkParameters.checkParametersIfString(dn);
        checkParameters.checkModifyChangeArray(jsonChange);
        checkParameters.checkControlArray(controls);

        this._binding.modify(dn, jsonChange, ctrls, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      }
    });
  }

  /**
       * Perform an LDAP rename  operation
       *
       * @method rename
       * @param {String} dn The dn of the entry to rename
       * @param {String} newRdn The new rdn for the dn
       * @param {String} newParent New parent for the rdn
       * @param {Array} controls Control that is sent as a request to the
       * server
       * @return {Promise} Will fulfil with a result from a control if the
       * operation is successful, else will reject with an LDAP error number.
       * */
  rename(dn, newRdn, newParent, controls) {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.BOUND) {
        reject(new Error(BIND_ERROR_MESSAGE));
      } else {
        const ctrls = controls !== undefined ? controls : null;
        checkParameters.checkParametersIfString(dn, newRdn, newParent);
        checkParameters.checkControlArray(controls);

        this._binding.rename(dn, newRdn, newParent, ctrls, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      }
    });
  }

  /**
       * ldap delete operation
       * @param {String} dn the dn entry to be deleted.
       * @param {Array} controls Optional control array parameter, can be
       * NULL.
       * @return {Promise} promise that resolves if the element provided was
       * deleted
       * or rejects if not.
       * */
  delete(dn, controls) {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.BOUND) {
        reject(new Error(BIND_ERROR_MESSAGE));
      } else {
        const ctrls = controls !== undefined ? controls : null;
        checkParameters.checkParametersIfString(dn);
        checkParameters.checkControlArray(controls);

        this._binding.delete(dn, ctrls, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      }
    });
  }
  /**
       * ldap add operation
       * @param {String} dn  dn of the entry to add Ex: 'cn=foo, o=example..,
       * NOTE:every entry except the first one,cn=foo in this case, must already
       * exist'
       * @param {Object} entry ldif format to be added, needs to have a
       * structure that is mappable to a LDAPMod structure
       * @param {Array} controls client & sever controls, OPTIONAL parameter
       * @return {Promise} that fulfils if the add was successful, rejects
       * otherwise.
       * */
  add(dn, entry, controls) {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.BOUND) {
        reject(new Error(BIND_ERROR_MESSAGE));
      } else {
        const ctrls = controls !== undefined ? controls : null;
        checkParameters.checkParametersIfString(dn);
        checkParameters.checkEntryObject(entry);
        checkParameters.checkControlArray(controls);

        this._binding.add(dn, entry, ctrls, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      }
    });
  }

  /**
        * Unbind from a LDAP server.
        *
        * @method unbind
        * @return {Promise} That resolves if the LDAP structure was unbound.
        * Reject if the LDAP could not unbind.
        */
  unbind() {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== E_STATES.UNBOUND) {
        this._binding.unbind((err, state) => {
          if (err) {
            reject(err);
          } else {
            this._stateClient = E_STATES.UNBOUND;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

}

module.exports = LDAPAsyncWrap;
