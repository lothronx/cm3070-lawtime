declare module "hydrogen-js-sdk" {
  interface BmobSmsSuccessResult {
    smsId: number;
  }

  interface BmobSmsErrorResult {
    code: number;
    error: string;
  }

  interface BmobVerifySuccessResult {
    msg: string;
  }

  interface BmobVerifyErrorResult {
    code: number;
    error: string;
  }

  type BmobSmsResult = BmobSmsSuccessResult | BmobSmsErrorResult;
  type BmobVerifyResult = BmobVerifySuccessResult | BmobVerifyErrorResult;

  interface BmobStatic {
    initialize(secretKey: string, apiSecurityKey: string): void;
    requestSmsCode(params: { mobilePhoneNumber: string; template: string }): Promise<BmobSmsResult>;
    verifySmsCode(
      smsCode: string,
      params: { mobilePhoneNumber: string }
    ): Promise<BmobVerifyResult>;
  }

  const Bmob: BmobStatic;
  export default Bmob;
}
