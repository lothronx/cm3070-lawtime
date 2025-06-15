import Bmob from "hydrogen-js-sdk";
// eslint-disable-next-line import/no-unresolved
import { BMOB_SECRET_KEY, BMOB_API_SECURITY_KEY } from "@env";

// Type definitions
interface SmsResponse {
  success: boolean;
  smsId?: number;
  message?: string;
  error?: string;
}

interface VerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Initialize Bmob SDK
Bmob.initialize(BMOB_SECRET_KEY, BMOB_API_SECURITY_KEY);

/**
 * Send SMS verification code to a mobile phone number
 * @param mobilePhoneNumber - The mobile phone number to send SMS to
 * @param template - The SMS template (default: "短信验证码")
 * @returns Promise that resolves with SMS ID
 */
export const sendSmsCode = async (
  mobilePhoneNumber: string,
  template: string = "短信验证码"
): Promise<SmsResponse> => {
  try {
    if (
      !mobilePhoneNumber ||
      mobilePhoneNumber.length !== 11 ||
      !/^1[3-9]\d{9}$/.test(mobilePhoneNumber)
    ) {
      return {
        success: false,
        error: "请提供正确的手机号码",
      };
    }

    const result = await Bmob.requestSmsCode({
      mobilePhoneNumber,
      template,
    });

    // Check if the result contains an error
    if ("code" in result && "error" in result) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Success case
    if ("smsId" in result) {
      return {
        success: true,
        smsId: result.smsId,
        message: "短信发送成功",
      };
    }

    // Fallback case
    return {
      success: false,
      error: "未知错误",
    };
  } catch (error) {
    console.error("短信发送失败：", error);
    const errorMessage = error instanceof Error ? error.message : "短信发送失败";
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Verify SMS code for a mobile phone number
 * @param smsCode - The SMS verification code
 * @param mobilePhoneNumber - The mobile phone number
 * @returns Promise that resolves with verification result
 */
export const verifySmsCode = async (
  smsCode: string,
  mobilePhoneNumber: string
): Promise<VerificationResponse> => {
  try {
    if (!smsCode || !mobilePhoneNumber || smsCode.length !== 6) {
      return {
        success: false,
        error: "请输入正确的手机号码和短信验证码",
      };
    }

    const result = await Bmob.verifySmsCode(smsCode, { mobilePhoneNumber });

    // Check if the result contains an error
    if ("code" in result && "error" in result) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Success case
    if ("msg" in result) {
      return {
        success: true,
        message: result.msg || "验证成功",
      };
    }

    // Fallback case
    return {
      success: false,
      error: "未知错误",
    };
  } catch (error) {
    console.error("短信验证失败：", error);
    const errorMessage = error instanceof Error ? error.message : "验证失败";
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * SMS service object with all available methods
 */
interface SmsServiceInterface {
  sendCode: (mobilePhoneNumber: string, template?: string) => Promise<SmsResponse>;
  verifyCode: (smsCode: string, mobilePhoneNumber: string) => Promise<VerificationResponse>;
}

export const smsService: SmsServiceInterface = {
  sendCode: sendSmsCode,
  verifyCode: verifySmsCode,
};

export default smsService;
