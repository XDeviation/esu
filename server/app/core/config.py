import os
from pathlib import Path
from typing import List

import yaml


def load_config():
    # 获取 server 根目录
    server_root = Path(__file__).parent.parent.parent
    config_path = server_root / "config.yaml"

    if not config_path.exists():
        raise FileNotFoundError(f"配置文件不存在: {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


config = load_config()
