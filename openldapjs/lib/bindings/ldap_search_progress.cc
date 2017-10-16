#include "ldap_search_progress.h"
#include "constants.h"
#include "ldap_control.h"

LDAPSearchProgress::LDAPSearchProgress(Nan::Callback *callback,
                                       Nan::Callback *progress, LDAP *ld,
                                       const int msgID)
    : Nan::AsyncProgressWorker(callback),
      progress_(progress),
      ld_(ld),
      msgID_(msgID) {
        mapResult_ = std::make_shared<LDAPMapResult>();
      }

void LDAPSearchProgress::Execute(
    const Nan::AsyncProgressWorker::ExecutionProgress &progress) {
  struct timeval timeOut = {constants::ONE_SECOND, constants::ZERO_USECONDS};

  BerElement *ber{};
  LDAPMessage *l_result{};
  LDAPMessage *l_entry{};
  char *attribute{};
  char **values{};
  char *l_dn{};
  int result{};

  while (result == constants::LDAP_NOT_FINISHED) {
    result =
        ldap_result(ld_, msgID_, constants::ALL_RESULTS, &timeOut, &l_result);
  }

  for (l_entry = ldap_first_entry(ld_, l_result); l_entry != nullptr;
       l_entry = ldap_next_entry(ld_, l_entry)) {
    l_dn = ldap_get_dn(ld_, l_entry);

    mapResult_->GenerateMapEntryDn(l_dn);
    ldap_memfree(l_dn);

    for (attribute = ldap_first_attribute(ld_, l_entry, &ber);
         attribute != nullptr;
         attribute = ldap_next_attribute(ld_, l_entry, ber)) {
      if ((values = ldap_get_values(ld_, l_entry, attribute)) != nullptr) {
        mapResult_->GenerateMapAttribute(attribute, values);
        ldap_value_free(values);
      }
      ldap_memfree(attribute);
    }
    mapResult_->FillLdifList(mapResult_->GetEntry());
    mapResult_->ClearEntry();
    ber_free(ber, false);
  }

  status_ = ldap_result2error(ld_, l_result, false);

  /* Free the search results.                                       */
  ldap_msgfree(l_result);
}

// Executes in event loop
void LDAPSearchProgress::HandleOKCallback() {
  Nan::HandleScope scope;
  v8::Local<v8::Value> stateClient[2] = {Nan::Null(), Nan::Null()};
  if (status_ != LDAP_SUCCESS) {
    stateClient[0] = Nan::New(status_);
    callback->Call(1, stateClient);
  } else {
    stateClient[1] = Nan::New(mapResult_->ResultLDIFString()).ToLocalChecked();
    callback->Call(2, stateClient);
  }

  callback->Reset();
  progress_->Reset();
}

void LDAPSearchProgress::HandleProgressCallback(const char *data, size_t size) {
  // Required, this is not created automatically
}
