import sys

from passlib.context import CryptContext

# 创建密码上下文，使用 bcrypt 加密方式
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def convert_md5_to_bcrypt(md5_password: str) -> str:
    """
    将 MD5 密码转换为 bcrypt 加密的密码
    """
    return pwd_context.hash(md5_password)


def main():
    if len(sys.argv) != 2:
        print("使用方法: python password_converter.py <MD5密码>")
        sys.exit(1)

    md5_password = sys.argv[1]
    bcrypt_password = convert_md5_to_bcrypt(md5_password)
    print(f"MD5 密码: {md5_password}")
    print(f"Bcrypt 加密后的密码: {bcrypt_password}")


if __name__ == "__main__":
    main()
