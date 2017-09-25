#include "ldap_compare_progress.h"
#include "constants.h"

LDAPCompareProgress::LDAPCompareProgress(Nan::Callback *callback,
                                         Nan::Callback *progress, LDAP *ld,
                                         const int msgID)
    : Nan::AsyncProgressWorker(callback),
      progress_(progress),
      ld_(ld),
      msgID_(msgID) {}

// Executes in worker thread
void LDAPCompareProgress::Execute(
    const Nan::AsyncProgressWorker::ExecutionProgress &progress) {
  struct timeval timeOut = {constants::ZERO_SECONDS, constants::ONE_USECOND};

  while (result_ == constants::LDAP_NOT_FINISHED) {
    result_ =
        ldap_result(ld_, msgID_, constants::ALL_RESULTS, &timeOut, &resultMsg_);
  }
}
// Executes in event loop
void LDAPCompareProgress::HandleOKCallback() {
  v8::Local<v8::Value> stateClient[2] = {Nan::Null(), Nan::Null()};
  if (result_ == constants::LDAP_ERROR) {
    stateClient[1] = Nan::New("The Comparison Result: false").ToLocalChecked();
    callback->Call(2, stateClient);
  } else {
    const auto status = ldap_result2error(ld_, resultMsg_, false);
    if (status == LDAP_COMPARE_TRUE || status == LDAP_COMPARE_FALSE) {
      if (status == LDAP_COMPARE_TRUE) {
        stateClient[1] =
            Nan::New("The Comparison Result: true").ToLocalChecked();
      } else {
        stateClient[1] =
            Nan::New("The Comparison Result: false").ToLocalChecked();
      }
      callback->Call(2, stateClient);
    } else {
      // Return ERROR
      stateClient[0] = Nan::New(status);
      callback->Call(1, stateClient);
    }
  }
  callback->Reset();
  ldap_msgfree(resultMsg_);
  progress_->Reset();
}

void LDAPCompareProgress::HandleProgressCallback(const char *data,
                                                 size_t size) {
  //
}
