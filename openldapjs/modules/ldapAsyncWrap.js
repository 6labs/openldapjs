'use strict';

const binding = require('../lib/bindings/build/Release/binding.node');
const Promise = require('bluebird');
const validator = require('./json_validator/json_validator');
const changeSchema = require('./schemas/change_schema');
const controlSchema = require('./schemas/control_schema');

/**
 * @module LDAPtranzition
 * @class LDAPWrapAsync
 */
module.exports = class LDAPWrapAsync {

  constructor(host, password) {
    this._hostAdress = host;
    this._E_STATES = {
      CREATED: 0,
      INITIALIZED: 1,
      BOUND: 2,
      UNBOUND: 5,
    };
    this._binding = new binding.LDAPClient();
    this._stateClient = this._E_STATES.CREATED;
  }

  set config(value) {
    this._hostAdress = value;
  }

  get config() {
    return this._hostAdress;
  }

  /**
    * Initialize to an LDAP server.
    *
    * @method initialize
    * @param {string} host The host address of server LDAP.
    * @return {Promise} That resolves if the LDAP initialize the structure to a specific server.
    * Reject if the address is incorect.
    */
  initialize() {
    return new Promise((resolve, reject) => {
      if (this._stateClient === this._E_STATES.CREATED) {
        this._binding.initialize(this._hostAdress, (err, result) => {
          if (result) {

            /* this._binding.startTls((errTls, stateTls) => {
              if (errTls) {
                reject(new Error(errTls));
              } else {
                this._stateClient = this._E_STATES.INITIALIZED;
                resolve(stateTls);
              } */
            this._stateClient = this._E_STATES.INITIALIZED;
            resolve(result);
          } else {
            reject(err);
          }
        });
      } else {
        reject(new Error('Can initialize only if created'));
      }
    });
  }

  /**
   * Authentificate to LDAP server.
   *
   * @method bind
   * @param {string} username The username of specific client.
   * @param {string} password The password for authentification.
   * @return {Promise} That resolves if the credentials are correct.
   * Reject dn or password are incorect.
   */

  bind(bindDN, passwordUser) {
    return new Promise((resolve, reject) => {
      if (this._stateClient === this._E_STATES.INITIALIZED) {
        this._binding.bind(bindDN, passwordUser, (err, state) => {
          if (err || state !== this._E_STATES.BOUND) {
            this._stateClient = this._E_STATES.INITIALIZED;
            reject(new Error(err));
          } else {
            this._stateClient = state;
            resolve(this._stateClient);
          }
        });
      } else if (this._stateClient === this._E_STATES.UNBOUND) {
        this.initialize()
          .then(() => {
            this.bind(bindDN, passwordUser)
              .then((result) => {
                resolve(result);
              })
              .catch((err) => {
                reject(new Error(err.message));
              });
          });
      } else {
        reject(new Error('The bind operation failed. It could be done if the state of the client is Initialized'));
      }
    });
  }

  /**
   * Search operation.
   *
   * @method search
   * @param {string} base The base node where the search to start.
   * @param {int} scope The mod how the search will return the entrys.
   * @param {string} filter The specification for specific element.
   * @return {Promise} That resolve and return the a string with search result.
   * Reject if an error will occure.
   */

  search(searchBase, scope, searchFilter) {
    return new Promise((resolve, reject) => {
      if (this._stateClient === this._E_STATES.BOUND) {
        this._binding.search(searchBase, scope, searchFilter, (err, result) => {
          if (err) {
            reject(new Error(err));
          } else {
            resolve(result);
          }
        });
      } else {
        reject(new Error('The Search operation can be done just in BOUND state'));
      }

    });
  }

  /**
   * Compare operation.
   *
   * @method search
   * @param {string} dn The dn of the entry to compare.
   * @param {string} attr The attribute given for interogation.
   * @param {string} value Value send to verify.
   * @return {Promise} That resolve and return True if the element are equal or False otherwise.
   * Reject if an error will occure.
   */

  compare(dn, attr, value) {
    return new Promise((resolve, reject) => {
      if (this._stateClient === this._E_STATES.BOUND) {
        this._binding.compare(dn, attr, value, (err, result) => {
          if (err) {
            reject(new Error(err));
          } else {
            resolve(result);
          }
        });
      } else {
        reject(new Error('The Compare operation can be done just in BOUND state'));
      }
    });
  }


  /**
    * Perform an LDAP modify operation
    *
    * @method modify
    * @param{string} dn The dn of the entry to modify
    * @param{object} mods An array that contains the fields that shall be changed
    * @return {Promise} That resolves if LDAP modified successfully the entry.
    * Reject if the LDAP rejects the operation or the client's state is not BOUND
    */
  modify(dn, json) {
    return new Promise((resolve, reject) => {
      if (this._stateClient === this._E_STATES.BOUND) {
        if (json === null || json === '') {
          reject(new Error('The passed JSON is invalid'));
          return;
        }

        if (dn === null || dn === '') {
          reject(new Error('The passed dn is invalid'));
          return;
        }

        const entry = json.modification;
        const keys = Object.keys(entry);
        const res = [];

        keys.forEach((elem) => {
          res.push(elem);
          res.push(entry[elem]);
        });

        this._binding.modify(dn, json.operation, res, (err, result) => {
          if (err) {
            reject(new Error(err));
          } else {
            resolve(result);
          }
        });
      } else {
        reject(new Error('The operation failed. It could be done if the state of the client is BOUND'));
      }
    });
  }

  /**
    * Perform an LDAP modify operation
    *
    * @method newModify
    * @param{string} dn The dn of the entry to modify
    * @param{object} json have to contain the value of changes and the attributes for the return
    * @return {Promise} That resolves if LDAP modified successfully the entry.
    * Reject if the LDAP rejects the operation or the client's state is not BOUND
    */
  newModify(dn, jsonChange, controls) {
    return new Promise((resolve, reject) => {
      const PromiseArray = [];
      jsonChange.forEach((element) => {
        const result = validator(element, changeSchema);
        if (result.valid === true) {
          PromiseArray.push(Promise.resolve(result));
        } else {
          PromiseArray.push(Promise.reject(result));
        }
      });

      if(controls === undefined || controls === null) {
        controls = null;
      } else {
        controls.forEach((element) => {
          console.log('--------------------------')
          const resultMessage = validator(element, controlSchema);
          if (resultMessage.valid === true) {
            PromiseArray.push(Promise.resolve(resultMessage));
          } else {
            PromiseArray.push(Promise.reject(resultMessage));
          }
        });
      }

      return Promise.all(PromiseArray)
        .then((change) => {
          if (this._stateClient !== this._E_STATES.BOUND) {
            reject(new Error('The operation failed. It could be done if the state of the client is BOUND'));
          }
          this._binding.newModify(dn, jsonChange, controls, (err, result) => {
            if (err) {
              reject(new Error(err));
            } else {
              resolve(result);
            }
          });
        });
    });
  }

  /**
    * Unbind from a LDAP server.
    *
    * @method unbind
    * @return {Promise} That resolves if the LDAP structure was unbound.
    * Reject if the LDAP was not unbound.
    */
  unbind() {
    return new Promise((resolve, reject) => {
      if (this._stateClient !== this._E_STATES.UNBOUND) {
        this._binding.unbind((err, state) => {
          if (state !== this._E_STATES.UNBOUND) {
            reject(new Error(err));
          } else {
            this._stateClient = state;
            resolve(this._stateClient);
          }
        });
      } else {
        resolve(this._stateClient);
      }
    });
  }

};

