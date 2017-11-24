#include "ldap_add_progress.h"
#include <string>
#include "constants.h"
#include "ldap_control.h"

LDAPAddProgress::LDAPAddProgress(Nan::Callback *callback,
                                 Nan::Callback *progress,
                                 const std::shared_ptr<LDAP> &ld,
                                 const int msgID)
    : Nan::AsyncProgressWorker(callback),
      ld_(ld),
      progress_(progress),
      msgID_(msgID) {}

LDAPAddProgress::~LDAPAddProgress() {}

void LDAPAddProgress::Execute(
    const Nan::AsyncProgressWorker::ExecutionProgress &progress) {
  struct timeval timeOut = {constants::ZERO_SECONDS, constants::ONE_USECOND};
  while (result_ == constants::LDAP_NOT_FINISHED) {
    result_ = ldap_result(ld_.get(), msgID_, constants::ALL_RESULTS, &timeOut,
                          &resultMsg_);
  }
}

void LDAPAddProgress::HandleOKCallback() {
  std::string addResult;
  v8::Local<v8::Value> stateClient[2] = {Nan::Null(), Nan::Null()};
  if (result_ == constants::LDAP_ERROR) {
    stateClient[0] = Nan::New<v8::Number>(result_);
    callback->Call(1, stateClient);
  } else {
    const auto status = ldap_result2error(ld_.get(), resultMsg_, false);
    if (status != LDAP_SUCCESS) {
      stateClient[0] = Nan::New<v8::Number>(status);
      callback->Call(1, stateClient);
    } else {
      const auto &ldap_controls = new LdapControls();
      addResult =
          ldap_controls->PrintModificationControls(ld_.get(), resultMsg_);
      if (!addResult.empty()) {
        stateClient[1] = Nan::New(addResult).ToLocalChecked();
        callback->Call(2, stateClient);

      } else {
        stateClient[1] = Nan::New<v8::Number>(LDAP_SUCCESS);
        callback->Call(2, stateClient);
      }
      delete ldap_controls;
    }
  }
  callback->Reset();
  progress_->Reset();
}

void LDAPAddProgress::HandleProgressCallback(const char *data, size_t size) {}
