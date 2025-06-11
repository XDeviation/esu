import sys
import os
from loguru import logger

# 创建logs目录（如果不存在）
log_dir = "logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

# 移除默认的处理器
logger.remove()

# 添加控制台处理器
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO",
    colorize=True
)

# 添加文件处理器
logger.add(
    os.path.join(log_dir, "app.log"),
    rotation="10 MB",  # 日志文件大小达到10MB时轮转
    retention="1 week",  # 保留1周的日志
    compression="zip",  # 压缩轮转的日志文件
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    level="INFO",
    encoding="utf-8"
)

# 添加错误日志文件处理器
logger.add(
    os.path.join(log_dir, "error.log"),
    rotation="10 MB",
    retention="1 week",
    compression="zip",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    level="ERROR",
    encoding="utf-8"
) 