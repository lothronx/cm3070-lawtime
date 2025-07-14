import os
import sys
from dotenv import load_dotenv

from typing import List

from alibabacloud_credentials.client import Client as CredentialClient
from alibabacloud_credentials.models import Config

from alibabacloud_tea_openapi import models as open_api_models
from alibabacloud_tea_util import models as util_models
from alibabacloud_tea_util.client import Client as UtilClient

from alibabacloud_dysmsapi20170525.client import Client as Dysmsapi20170525Client
from alibabacloud_dysmsapi20170525 import models as dysmsapi_20170525_models


class Sample:
    def __init__(self):
        pass

    @staticmethod
    def create_client() -> Dysmsapi20170525Client:
        """
        使用凭据初始化账号Client
        @return: Client
        @throws Exception
        """
        load_dotenv('.env.local')

        credentialsConfig = Config(
            type="access_key",
            access_key_id=os.environ.get("ALIBABA_DYSMS_ACCESS_KEY_ID"),
            access_key_secret=os.environ.get("ALIBABA_DYSMS_ACCESS_KEY_SECRET"),
        )
        credentialClient = CredentialClient(credentialsConfig)
        config = open_api_models.Config(credential=credentialClient)

        config.endpoint = f"dysmsapi.aliyuncs.com"
        return Dysmsapi20170525Client(config)

    @staticmethod
    def main(
        args: List[str],
    ) -> None:
        client = Sample.create_client()
        send_sms_request = dysmsapi_20170525_models.SendSmsRequest(
            sign_name="北京二分文化传媒",
            template_code="SMS_325135041",
            phone_numbers="18501052017", # replace it with the real phone number
            template_param='{"code":"1345"}', # replace it with the generated OTP code
        )
        runtime = util_models.RuntimeOptions()
        try:
            # 复制代码运行请自行打印 API 的返回值
            client.send_sms_with_options(send_sms_request, runtime)
        except Exception as error:
            # 此处仅做打印展示，请谨慎对待异常处理，在工程项目中切勿直接忽略异常。
            # 错误 message
            print(error.message)
            # 诊断地址
            print(error.data.get("Recommend"))
            UtilClient.assert_as_string(error.message)

    @staticmethod
    async def main_async(
        args: List[str],
    ) -> None:
        client = Sample.create_client()
        send_sms_request = dysmsapi_20170525_models.SendSmsRequest(
            sign_name="北京二分文化传媒",
            template_code="SMS_325135041",
            phone_numbers="18501052017",
            template_param='{"code":"1345"}',
        )
        runtime = util_models.RuntimeOptions()
        try:
            # 复制代码运行请自行打印 API 的返回值
            await client.send_sms_with_options_async(send_sms_request, runtime)
        except Exception as error:
            # 此处仅做打印展示，请谨慎对待异常处理，在工程项目中切勿直接忽略异常。
            # 错误 message
            print(error.message)
            # 诊断地址
            print(error.data.get("Recommend"))
            UtilClient.assert_as_string(error.message)


if __name__ == "__main__":
    Sample.main(sys.argv[1:])
