#include <nan.h>
#include <ldap.h>
#include <iostream>
#include <string>
#include <thread>
#include <chrono>

using namespace Nan;
using namespace v8;
using namespace std;

class LDAPPagedSearchProgress : public AsyncProgressWorker
{
private:
  LDAP *ld;
  Callback *progress;
  int result = 0;
  LDAPMessage *resultMsg;
  int msgID;
  char *base;
  char *filter;
  int scope;
  int pageSize;
  struct berval *cookie;
  std::string pageResult;
  int status = 0;

public:
  LDAPPagedSearchProgress(Callback *callback, Callback *progress, LDAP *ld, char *base, int scope, char *filter, int pgSize, struct berval *cookie)
      : AsyncProgressWorker(callback), progress(progress), ld(ld),base(base), scope(scope),filter(filter) , pageSize(pgSize), cookie(cookie)
  {
  }
  // Executes in worker thread
  void Execute(const AsyncProgressWorker::ExecutionProgress &progress)
  {

    char *dn;
    char *attribute;
    char **values;
    char *matchedDN;
    char *errorMessage = nullptr;
    int errorCode;
    int prc;

    std::string resultLocal = "\n";
    BerElement *ber;

    char pagingCriticality = 'T';
    LDAPControl *pageControl = nullptr;
    LDAPControl **returnedControls = nullptr;
    LDAPControl *M_controls[2] = {nullptr, nullptr};
    int message;
    int searchResult;
    int finished = 0;
    struct timeval timeOut = {0, 1};
    int totalCount = 0;

    ldap_create_page_control(ld, pageSize, NULL, pagingCriticality, &pageControl);
    M_controls[0] = pageControl;
    cout<<"filter:"<<filter<<endl;
    cout<<"base:"<<base<<endl;
    cout<<"scope:"<<scope<<endl;

    searchResult = ldap_search_ext(ld,
                                   "dc=demoApp,dc=com",
                                   scope,
                                   filter,
                                   NULL,
                                   0,
                                   M_controls,
                                   NULL,
                                   NULL,
                                   LDAP_NO_LIMIT,
                                   &message);

    while (finished == 0)
    {

      result = ldap_result(ld, message, 1, &timeOut, &resultMsg);

      resultLocal.clear();
      resultLocal = "\n";

      switch (result)
      {
      case -1:
        // flagVerification = false;
        ldap_perror(ld, "ldap_result");
        return;

      case 0:
        break;

      case LDAP_RES_SEARCH_ENTRY:
        //flagVerification = true;
        if ((dn = ldap_get_dn(ld, resultMsg)) != nullptr)
        {
          resultLocal += "dn:";
          resultLocal += dn;
          ldap_memfree(dn);

          resultLocal += "\n";
        }

        // You have to implement the attribute side
        for (attribute = ldap_first_attribute(ld, resultMsg, &ber);
             attribute != nullptr;
             attribute = ldap_next_attribute(ld, resultMsg, ber))
        {
          if ((values = ldap_get_values(ld, resultMsg, attribute)) != nullptr)
          {
            for (int i = 0; values[i] != nullptr; i++)
            {
              resultLocal += attribute;
              resultLocal += ":";
              resultLocal += values[i];
              resultLocal += "\n";
            }
            ldap_value_free(values);
          }
          ldap_memfree(attribute);
        }
        resultLocal += "\n";
        ber_free(ber, 0);
        ldap_msgfree(resultMsg);

        pageResult += resultLocal;
        break;

      case LDAP_RES_SEARCH_RESULT:
        finished = 1;
        status = ldap_result2error(ld, resultMsg, 0);

        prc = ldap_parse_result(ld,
                                resultMsg,
                                &errorCode,
                                &matchedDN,
                                &errorMessage,
                                nullptr,
                                &returnedControls,
                                1);

        if (prc != LDAP_SUCCESS)
        {
          //in case of error ?
          std::cout << "parse result failed with:" << ldap_err2string(prc) << std::endl;
          return;
        }

        if (matchedDN != nullptr && *matchedDN != 0)
        {
          ldap_memfree(matchedDN);
        }

        if (errorMessage != nullptr)
        {
          ldap_memfree(errorMessage);
        }

        if (cookie != nullptr)
        {
          ber_bvfree(cookie);
          cookie = nullptr;
        }

        //get cookie for the next page

        prc = ldap_parse_page_control(ld, returnedControls, &totalCount, &cookie);

        if (returnedControls != nullptr)
        {
          ldap_controls_free(returnedControls);
          returnedControls = nullptr;
        }

        ldap_control_free(pageControl);
        M_controls[0] = nullptr;
        pageControl = nullptr;
/*
        if (resultMsg != nullptr)
        {
          //should not be null
          ldap_msgfree(resultMsg);
        }
        */
        //ldap_msgfree(resultMsg);
 
        break;
      default:
        break;
      }
    }
  }
  // Executes in event loop
  void HandleOKCallback()
  {
    Nan::HandleScope scope;
    v8::Local<v8::Value> stateClient[2] = {Nan::Null(), Nan::Null()};

    if (status != LDAP_SUCCESS)
    {
      stateClient[0] = Nan::New(status);
      callback->Call(1, stateClient);
    }
    else
    {
      stateClient[1] = Nan::New(pageResult).ToLocalChecked();
      callback->Call(2, stateClient);
    }

    cookie != nullptr ? std::cout << "cookie is not null" << std::endl : std::cout << "cookie is null " << std::endl;
   // ldap_msgfree(resultMsg);
    callback->Reset();
    progress->Reset();
  }

  void HandleProgressCallback(const char *data, size_t size)
  {
    // Required, this is not created automatically
    Nan::HandleScope scope;
    Local<Value> argv[] = {
        New<v8::Number>(*reinterpret_cast<int *>(const_cast<char *>(data)))};
    progress->Call(1, argv);
  }
};

class LDAPBindProgress : public AsyncProgressWorker
{
private:
  LDAP *ld;
  Callback *progress;
  int result = 0;
  LDAPMessage *resultMsg;
  int msgID;

public:
  LDAPBindProgress(Callback *callback, Callback *progress, LDAP *ld, int msgID)
      : AsyncProgressWorker(callback), progress(progress), ld(ld), msgID(msgID)
  {
  }
  // Executes in worker thread
  void Execute(const AsyncProgressWorker::ExecutionProgress &progress)
  {
    struct timeval timeOut = {0, 1};
    while (result == 0)
    {
      result = ldap_result(ld, msgID, 1, &timeOut, &resultMsg);
      progress.Send(reinterpret_cast<const char *>(&result), sizeof(int));
    }
  }
  // Executes in event loop
  void HandleOKCallback()
  {
    Local<Value> stateClient[2] = {Null(), Null()};
    if (result == -1)
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(1, stateClient);
    }
    else
    {
      int status = ldap_result2error(ld, resultMsg, 0);
      if (status != LDAP_SUCCESS)
      {
        stateClient[0] = Nan::New<Number>(status);
        callback->Call(1, stateClient);
      }
      else
      {
        stateClient[1] = Nan::New<Number>(2);
        callback->Call(2, stateClient);
      }
    }
  }

  void HandleProgressCallback(const char *data, size_t size)
  {
    // Required, this is not created automatically
    Nan::HandleScope scope;
    Local<Value> argv[] = {
        New<v8::Number>(*reinterpret_cast<int *>(const_cast<char *>(data)))};
    progress->Call(1, argv);
  }
};

class LDAPSearchProgress : public AsyncProgressWorker
{
private:
  LDAP *ld;
  Callback *progress;
  int result = 0;
  LDAPMessage *resultMsg, *entry;
  int finished = 0;
  bool flagVerification = false;
  string resultSearch;
  int i = 0, msgID;
  LDAPMessage *testVar = 0;
  int status = 0;
  //int LDAP_NO_SUCH_OBJECT = 32;
public:
  LDAPSearchProgress(Callback *callback, Callback *progress, LDAP *ld, int msgID)
      : AsyncProgressWorker(callback), progress(progress), ld(ld), msgID(msgID)
  {
  }
  // Executes in worker thread
  void Execute(const AsyncProgressWorker::ExecutionProgress &progress)
  {
    struct timeval timeOut = {1, 0};
    while (finished == 0)
    {
      result = ldap_result(ld, msgID, LDAP_MSG_ONE, &timeOut, &resultMsg);
      progress.Send(reinterpret_cast<const char *>(&result), sizeof(int));
      std::this_thread::sleep_for(chrono::milliseconds(10));
    }
  }
  // Executes in event loop
  void HandleOKCallback()
  {

    Local<Value> stateClient[2] = {Null(), Null()};

    if (status == LDAP_INVALID_DN_SYNTAX || status == LDAP_NO_SUCH_OBJECT)
    {
      stateClient[0] = Nan::New("The Search Operation Failed").ToLocalChecked();
      callback->Call(1, stateClient);
    }
    else
    {
      stateClient[1] = Nan::New(resultSearch).ToLocalChecked();
      callback->Call(2, stateClient);
    }
  }

  void HandleProgressCallback(const char *data, size_t size)
  {
    // Required, this is not created automatically
    char *dn, *attribute, **values, *matchedDN, *errorMessage = NULL;
    int errorCode, prc;

    string resultLocal = "\n";
    BerElement *ber;

    switch (result)
    {
    case -1:
      flagVerification = false;
      ldap_perror(ld, "ldap_result");
      return;

    case 0:
      finished = 1;
      if (resultMsg != NULL)
      {
        ldap_msgfree(resultMsg);
      }
      return;

    case LDAP_RES_SEARCH_ENTRY:
      flagVerification = true;
      if ((dn = ldap_get_dn(ld, resultMsg)) != NULL)
      {
        resultLocal += "dn:";
        resultLocal += dn;
        ldap_memfree(dn);
        resultLocal += "\n";
      }

      // You have to implement the attribute side
      entry = ldap_first_entry(ld, resultMsg);
      for (attribute = ldap_first_attribute(ld, entry, &ber);
           attribute != NULL;
           attribute = ldap_next_attribute(ld, entry, ber))
      {
        if ((values = (char **)(intptr_t)ldap_get_values(ld, entry, attribute)) != NULL)
        {
          for (i = 0; values[i] != NULL; i++)
          {
            resultLocal += attribute;
            resultLocal += ":";
            resultLocal += values[i];
            resultLocal += "\n";
          }
          ldap_value_free(values);
        }
        ldap_memfree(attribute);
      }
      resultLocal += "\n";
      ber_free(ber, 0);

      resultSearch += resultLocal;
      break;

    case LDAP_RES_SEARCH_RESULT:
      finished = 1;
      //testVar = *resultMsg;
      status = ldap_result2error(ld, resultMsg, 0);

      prc = ldap_parse_result(ld,
                              resultMsg,
                              &errorCode,
                              &matchedDN,
                              &errorMessage,
                              NULL,
                              NULL,
                              1);

      if (matchedDN != NULL && *matchedDN != 0)
      {
        ldap_memfree(matchedDN);
      }
      break;
    default:
      break;
    }

    Nan::HandleScope scope;
    Local<Value> argv[1] = {Null()};
    argv[0] = Nan::New(resultLocal).ToLocalChecked();
    progress->Call(1, argv);
    return;
  }
};

class LDAPCompareProgress : public AsyncProgressWorker
{
private:
  LDAP *ld;
  Callback *progress;
  int result = 0;
  LDAPMessage *resultMsg;
  int msgID;

public:
  LDAPCompareProgress(Callback *callback, Callback *progress, LDAP *ld, int msgID)
      : AsyncProgressWorker(callback), progress(progress), ld(ld), msgID(msgID)
  {
  }
  // Executes in worker thread
  void Execute(const AsyncProgressWorker::ExecutionProgress &progress)
  {
    struct timeval timeOut = {0, 1};
    while (result == 0)
    {
      result = ldap_result(ld, msgID, 1, &timeOut, &resultMsg);
      progress.Send(reinterpret_cast<const char *>(&result), sizeof(int));
    }
  }
  // Executes in event loop
  void HandleOKCallback()
  {
    Local<Value> stateClient[2] = {Null(), Null()};
    if (result == -1)
    {
      stateClient[1] = Nan::New("The Comparison Result: false").ToLocalChecked();
      callback->Call(2, stateClient);
    }
    else
    {
      int status = ldap_result2error(ld, resultMsg, 0);
      if (status == LDAP_COMPARE_TRUE || status == LDAP_COMPARE_FALSE)
      {
        if (status == LDAP_COMPARE_TRUE)
        {
          stateClient[1] = Nan::New("The Comparison Result: true").ToLocalChecked();
        }
        else
        {
          stateClient[1] = Nan::New("The Comparison Result: false").ToLocalChecked();
        }
        callback->Call(2, stateClient);
      }
      else
      {
        // Return ERROR
        stateClient[0] = Nan::New(status);
        callback->Call(1, stateClient);
      }
    }
  }

  void HandleProgressCallback(const char *data, size_t size)
  {
    // Required, this is not created automatically
    Nan::HandleScope scope;
    Local<Value> argv[] = {
        New<v8::Number>(*reinterpret_cast<int *>(const_cast<char *>(data)))};
    progress->Call(1, argv);
  }
};

class LDAPClient : public Nan::ObjectWrap
{
public:
  static NAN_MODULE_INIT(Init)
  {
    v8::Local<v8::FunctionTemplate> tpl = Nan::New<v8::FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("LDAPClient").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    Nan::SetPrototypeMethod(tpl, "initialize", initialize);
    Nan::SetPrototypeMethod(tpl, "startTls", startTls);
    Nan::SetPrototypeMethod(tpl, "bind", bind);
    Nan::SetPrototypeMethod(tpl, "search", search);
    Nan::SetPrototypeMethod(tpl, "pagedSearch", pagedSearch);
    Nan::SetPrototypeMethod(tpl, "compare", compare);
    Nan::SetPrototypeMethod(tpl, "unbind", unbind);

    constructor().Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New("LDAPClient").ToLocalChecked(),
             Nan::GetFunction(tpl).ToLocalChecked());
  }

protected:
private:
  LDAP *ld;
  LDAPMessage *result;
  unsigned int stateClient = 0;
  int msgid;
  bool initializedFlag = false;
  explicit LDAPClient(){};
  //LDAPMod *attrs[4];

  ~LDAPClient(){};

  static NAN_METHOD(New)
  {
    if (info.IsConstructCall())
    {
      LDAPClient *obj = new LDAPClient();
      obj->Wrap(info.This());
    }
    else
    {
      const int argc = 1;
      v8::Local<v8::Value> argv[argc] = {info[0]};
      v8::Local<v8::Function> cons = Nan::New(constructor());
      info.GetReturnValue().Set(cons->NewInstance(argc, argv));
    }
  }

  static NAN_METHOD(initialize)
  {
    LDAPClient *obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());

    Nan::Utf8String hostArg(info[0]);
    Local<Value> stateClient[2] = {Null(), Null()};
    Callback *callback = new Callback(info[1].As<Function>());
    obj->initializedFlag = true;

    char *hostAddress = *hostArg;
    int state;
    int protocol_version = LDAP_VERSION3;

    stateClient[0] = Nan::New<Number>(0);
    state = ldap_initialize(&obj->ld, hostAddress);
    if (state != LDAP_SUCCESS || obj->ld == 0)
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(1, stateClient);
      // Needed for catch a specific error
      obj->initializedFlag = false;
      return;
    }

    state = ldap_set_option(obj->ld, LDAP_OPT_PROTOCOL_VERSION, &protocol_version);
    if (state != LDAP_SUCCESS)
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(1, stateClient);
      obj->initializedFlag = false;
      return;
    }

    /*state = ldap_start_tls_s(obj->ld, NULL, NULL);
    if(state != LDAP_SUCCESS) {
      stateClient[0] = Nan::New<Number>(state);
      callback->Call(1, stateClient);
      return;
    }*/

    stateClient[1] = Nan::New<Number>(1);
    callback->Call(2, stateClient);
    return;
  }

  static NAN_METHOD(startTls)
  {
    LDAPClient *obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());

    Local<Value> stateClient[2] = {Null(), Null()};
    Callback *callback = new Callback(info[0].As<Function>());

    int state;
    int msgId;

    stateClient[0] = Nan::New<Number>(0);

    state = ldap_start_tls_s(obj->ld, NULL, NULL);
    if (state != LDAP_SUCCESS)
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(1, stateClient);
      return;
    }
    stateClient[1] = Nan::New<Number>(1);
    callback->Call(2, stateClient);
    return;
  }

  static NAN_METHOD(bind)
  {
    LDAPClient *obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());
    Nan::Utf8String userArg(info[0]);
    Nan::Utf8String passArg(info[1]);

    Local<Value> stateClient[2] = {Null(), Null()};
    Callback *callback = new Callback(info[2].As<Function>());
    Callback *progress = new Callback(info[3].As<v8::Function>());

    char *username = *userArg;
    char *password = *passArg;
    if (obj->ld == 0 || obj->initializedFlag == false)
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(1, stateClient);
      return;
    }
    obj->msgid = ldap_simple_bind(obj->ld, username, password);
    AsyncQueueWorker(new LDAPBindProgress(callback, progress, obj->ld, obj->msgid));
  }

  static NAN_METHOD(search)
  {
    LDAPClient *obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());

    Nan::Utf8String baseArg(info[0]);
    Nan::Utf8String filterArg(info[2]);

    char *DNbase = *baseArg;
    char *filterSearch = *filterArg;
    int message, result;
    struct timeval timeOut = {10, 0};

    Local<Value> stateClient[2] = {Null(), Null()};

    Callback *callback = new Callback(info[3].As<Function>());
    Callback *progress = new Callback(info[4].As<v8::Function>());

    //Verify if the argument is a Number for scope
    if (!info[1]->IsNumber())
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(1, stateClient);
      return;
    }

    int scopeSearch = info[1]->NumberValue();
    if (scopeSearch <= 0 && scopeSearch >= 3)
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(1, stateClient);
      return;
    }

    if (obj->ld == 0)
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(1, stateClient);
      return;
    }

    result = ldap_search_ext(obj->ld,
                             DNbase,
                             scopeSearch,
                             filterSearch,
                             NULL,
                             0,
                             NULL,
                             NULL,
                             &timeOut,
                             LDAP_NO_LIMIT,
                             &message);

    if (result != LDAP_SUCCESS)
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(1, stateClient);
      return;
    }

    AsyncQueueWorker(new LDAPSearchProgress(callback, progress, obj->ld, message));
  }

  static NAN_METHOD(pagedSearch)
  {
    LDAPClient *obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());

    Nan::Utf8String baseArg(info[0]);
    Nan::Utf8String filterArg(info[2]);

    char *DNbase = *baseArg;
    cout<<"baseArg is:"<<*baseArg<<endl;
    cout<<"dnbase is:"<<DNbase<<endl;
    char *filterSearch = *filterArg;
    int message;
    int result;
    struct timeval timeOut = {1, 0};
    struct berval *cookie = nullptr;

    Local<Value> stateClient[2] = {Null(), Null()};

    Callback *callback = new Callback(info[4].As<Function>());
    Callback *progress = new Callback(info[5].As<v8::Function>());

    //Verify if the argument is a Number for scope

    int pageSize = info[3]->NumberValue();
    int scopeSearch = info[1]->NumberValue();

    if (obj->ld == 0)
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(1, stateClient);
      callback->Reset();
      progress->Reset();
      return;
    }

    /*
    if (result != LDAP_SUCCESS)
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(1, stateClient);
      callback->Reset();
      progress->Reset();
      return;
    } */

    AsyncQueueWorker(new LDAPPagedSearchProgress(callback, progress, obj->ld, DNbase, scopeSearch, filterSearch, pageSize, cookie));
  }

  static NAN_METHOD(compare)
  {
    LDAPClient *obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());

    Nan::Utf8String DNArg(info[0]);
    Nan::Utf8String attrArg(info[1]);
    Nan::Utf8String valueArg(info[2]);

    char *DNEntry = *DNArg;
    char *attribute = *attrArg;
    char *value = *valueArg;
    int message, result;

    Local<Value> stateClient[2] = {Null(), Null()};

    Callback *callback = new Callback(info[3].As<Function>());
    Callback *progress = new Callback(info[4].As<v8::Function>());

    struct berval bvalue;

    bvalue.bv_val = value;
    bvalue.bv_len = strlen(value);

    result = ldap_compare_ext(obj->ld,
                              DNEntry,
                              attribute,
                              &bvalue,
                              NULL,
                              NULL,
                              &message);

    AsyncQueueWorker(new LDAPCompareProgress(callback, progress, obj->ld, message));
  }

  static NAN_METHOD(unbind)
  {
    LDAPClient *obj = Nan::ObjectWrap::Unwrap<LDAPClient>(info.Holder());

    Local<Value> stateClient[2] = {Null(), Null()};
    Callback *callback = new Callback(info[0].As<Function>());

    if (obj->ld == NULL || obj->initializedFlag == false)
    {
      stateClient[0] = Nan::New<Number>(0);
      callback->Call(2, stateClient);
      return;
    }

    ldap_unbind(obj->ld);
    obj->initializedFlag = false;

    stateClient[1] = Nan::New<Number>(5);
    callback->Call(2, stateClient);

    return;
  }

  static inline Nan::Persistent<v8::Function> &constructor()
  {
    static Nan::Persistent<v8::Function> my_constructor;
    return my_constructor;
  }
};

NODE_MODULE(objectwrapper, LDAPClient::Init)
