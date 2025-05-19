from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from ..core.config import config


class MongoDB:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

    @classmethod
    async def connect_to_database(cls):
        try:
            cls.client = AsyncIOMotorClient(config["mongodb"]["uri"])
            cls.db = cls.client[config["mongodb"]["database"]]
            # 测试连接
            await cls.db.command("ping")

            # 检查并创建集合和索引
            await cls._check_and_create_collections()
        except Exception as e:
            print(f"数据库连接失败: {str(e)}")
            raise

    @classmethod
    async def close_database_connection(cls):
        if cls.client:
            cls.client.close()

    @classmethod
    async def _check_and_create_collections(cls):
        # 获取所有集合名称
        collections = await cls.db.list_collection_names()

        # 如果集合不存在，则创建集合和索引
        if "environments" not in collections:
            await cls.db.create_collection("environments")
            collection = cls.db.get_collection("environments")
            await collection.create_index("name", unique=True)
            await collection.create_index("id", unique=True)

        if "decks" not in collections:
            await cls.db.create_collection("decks")
            collection = cls.db.get_collection("decks")
            await collection.create_index("id", unique=True)
            await collection.create_index("environment_id")
            await collection.create_index("author_id")
            await collection.create_index([("name", "text"), ("description", "text")])

        if "match_types" not in collections:
            await cls.db.create_collection("match_types")
            collection = cls.db.get_collection("match_types")
            await collection.create_index("name", unique=True)
            await collection.create_index("id", unique=True)
            # 创建默认比赛类型
            await collection.update_one(
                {"name": "普通对战"},
                {"$setOnInsert": {"id": 1, "name": "普通对战"}},
                upsert=True,
            )

        if "match_results" not in collections:
            await cls.db.create_collection("match_results")
            collection = cls.db.get_collection("match_results")
            await collection.create_index("id", unique=True)
            await collection.create_index("environment_id")
            await collection.create_index("first_deck_id")
            await collection.create_index("second_deck_id")
            await collection.create_index("winning_deck_id")
            await collection.create_index("losing_deck_id")
            await collection.create_index("match_type_id")

        if "counters" not in collections:
            await cls.db.create_collection("counters")
            collection = cls.db.get_collection("counters")
            await collection.create_index("name", unique=True)
            # 初始化计数器
            await collection.update_one(
                {"name": "environment_id"}, {"$setOnInsert": {"seq": 0}}, upsert=True
            )
            await collection.update_one(
                {"name": "deck_id"}, {"$setOnInsert": {"seq": 0}}, upsert=True
            )
            await collection.update_one(
                {"name": "match_type_id"}, {"$setOnInsert": {"seq": 0}}, upsert=True
            )
            await collection.update_one(
                {"name": "match_result_id"}, {"$setOnInsert": {"seq": 0}}, upsert=True
            )

    @classmethod
    def get_collection(cls, collection_name: str):
        return cls.db[collection_name]

    @property
    def environments(self):
        return self.db.get_collection("environments")

    @property
    def decks(self):
        return self.db.get_collection("decks")

    @property
    def match_types(self):
        return self.db.get_collection("match_types")

    @property
    def match_results(self):
        return self.db.get_collection("match_results")

    @property
    def counters(self):
        return self.db.get_collection("counters")


db = MongoDB()
