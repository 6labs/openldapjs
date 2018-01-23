'use strict';

const LdapError = require('./ldap_error');
const OperationalError = require('./operational_error');

class LdapTimeLimitError extends OperationalError {

  static get code() {
    return 3;
  }

  get description() {
    return 'Indicates that the operation\'s time limit specified by either the client or the server' +
    ' has been exceeded. On search operations, incomplete results are returned.';
  }

  get code() {
    return LdapTimeLimitError.code;
  }

  toString() {
    return `${this.code}:${this.description}`;
  }


}

module.exports = LdapTimeLimitError;
