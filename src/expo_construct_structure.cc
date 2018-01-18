#include "expo_construct_structure.h"

ExpoConstructStructure::ExpoConstructStructure()
    : functionMap_{
          {LDAP_EXOP_CANCEL, std::bind(&ExpoConstructStructure::LdapExopCancel,
                                       this, std::placeholders::_1)},
          {LDAP_EXOP_MODIFY_PASSWD,
           std::bind(&ExpoConstructStructure::LdapExopChangePassword, this,
                     std::placeholders::_1)},
          {LDAP_EXOP_REFRESH,
           std::bind(&ExpoConstructStructure::LdapExopRefresh, this,
                     std::placeholders::_1)},
      } {
  valueConstr = ber_alloc_t(LBER_USE_DER);
}

struct berval ExpoConstructStructure::LdapExopCancel(
    const v8::Local<v8::Object> &objectData) {
  v8::String::Utf8Value idOperation(
      objectData->Get(Nan::New("first").ToLocalChecked()));
  int id = std::stoi(*idOperation);
  ber_printf(valueConstr, "{i}", id);
  ber_flatten2(valueConstr, &valueBer, 0);
  return valueBer;
}

struct berval ExpoConstructStructure::LdapExopChangePassword(
    const v8::Local<v8::Object> &objectData) {
  v8::String::Utf8Value userDN(
      objectData->Get(Nan::New("userDN").ToLocalChecked()));
  v8::String::Utf8Value oldPassword(
      objectData->Get(Nan::New("oldPass").ToLocalChecked()));
  v8::String::Utf8Value newPassword(
      objectData->Get(Nan::New("newPass").ToLocalChecked()));
  static struct berval user = {0, NULL};
  static struct berval newpw = {0, NULL};
  static struct berval oldpw = {0, NULL};

  /* The message ID that the ldap_passwd will have */

  /* Set the pointer data into a berval structure */
  user.bv_val = strdup(*userDN);
  user.bv_len = strlen(user.bv_val);

  newpw.bv_val = strdup(*newPassword);
  newpw.bv_len = strlen(newpw.bv_val);

  oldpw.bv_val = strdup(*oldPassword);
  oldpw.bv_len = strlen(oldpw.bv_val);

  ber_printf(valueConstr, "{" /*}*/);
  ber_printf(valueConstr, "tO", LDAP_TAG_EXOP_MODIFY_PASSWD_ID, user);
  ber_printf(valueConstr, "tO", LDAP_TAG_EXOP_MODIFY_PASSWD_OLD, oldpw);
  ber_printf(valueConstr, "tO", LDAP_TAG_EXOP_MODIFY_PASSWD_NEW, newpw);
  ber_printf(valueConstr, /*{*/ "N}");
  ber_flatten2(valueConstr, &valueBer, 0);
  return valueBer;
}
struct berval ExpoConstructStructure::LdapExopRefresh(
    const v8::Local<v8::Object> &objectData) {
  v8::String::Utf8Value userDN(
      objectData->Get(Nan::New("userDN").ToLocalChecked()));
  static struct berval user = {0, NULL};
  user.bv_val = strdup(*userDN);
  user.bv_len = strlen(user.bv_val);
  ber_printf(valueConstr, "{tOtiN}", LDAP_TAG_EXOP_REFRESH_REQ_DN, user,
             LDAP_TAG_EXOP_REFRESH_REQ_TTL, nullptr);
  ber_flatten2(valueConstr, &valueBer, 0);
  return valueBer;
}

std::map<std::string,
         std::function<struct berval(const v8::Local<v8::Object> &)>>
ExpoConstructStructure::functionMap() const {
  return functionMap_;
}