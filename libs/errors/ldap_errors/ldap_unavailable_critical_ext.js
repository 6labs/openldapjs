'use strict';

const LdapError = require('./ldap_error');
const ServerError = require('./server_error');

class LdapCriticalExtensionError extends ServerError {

  static get code() {
    return 12;
  }

  get description() {
    return 'Indicates that the LDAP server was unable to satisfy a request because one or more critical' +
    ' extensions were not available. Either the server does not support the control or the control is not appropriate for the operation type.';
  }

  get code() {
    return LdapCriticalExtensionError.code;
  }


}

module.exports = LdapCriticalExtensionError;
