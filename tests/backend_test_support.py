from __future__ import annotations

import sys
import types


class _FieldInfo:
    def __init__(self, default=..., default_factory=None):
        self.default = default
        self.default_factory = default_factory


def _field(default=..., default_factory=None, **_kwargs):
    return _FieldInfo(default=default, default_factory=default_factory)


class _BaseModel:
    def __init__(self, **kwargs):
        for name, value in self._declared_fields().items():
            if name in kwargs:
                setattr(self, name, kwargs.pop(name))
            elif isinstance(value, _FieldInfo):
                if value.default_factory is not None:
                    setattr(self, name, value.default_factory())
                elif value.default is not ...:
                    setattr(self, name, value.default)
            else:
                setattr(self, name, value)
        for name, value in kwargs.items():
            setattr(self, name, value)

    @classmethod
    def _declared_fields(cls):
        fields = {}
        for current in reversed(cls.__mro__):
            for name, value in current.__dict__.items():
                if name.startswith("_"):
                    continue
                if isinstance(value, (staticmethod, classmethod, property)):
                    continue
                if callable(value):
                    continue
                fields[name] = value
        return fields

    def model_dump(self):
        return dict(self.__dict__)


class FakeDocument:
    def __init__(self, page_content: str, metadata: dict | None = None):
        self.page_content = page_content
        self.metadata = metadata or {}


class _FakePrompt:
    @classmethod
    def from_messages(cls, _messages):
        return cls()

    def __or__(self, other):
        return other


class _StructuredInvoker:
    def __init__(self, model):
        self.model = model

    def invoke(self, _payload):
        try:
            return self.model()
        except Exception:
            return types.SimpleNamespace(model_dump=lambda: {})


class _FakeChatAnthropic:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    def with_structured_output(self, model):
        return _StructuredInvoker(model)


class _FakeEmbeddings:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs


class _FakeChroma:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        self.docs = []

    @classmethod
    def from_documents(
        cls, documents, embedding=None, collection_name=None, persist_directory=None
    ):
        inst = cls(
            embedding=embedding,
            collection_name=collection_name,
            persist_directory=persist_directory,
        )
        inst.docs = list(documents)
        return inst

    def add_documents(self, docs):
        self.docs.extend(docs)

    def similarity_search(self, question, k=4, filter=None):
        del question, k, filter
        return []

    def get(self, where=None, include=None, limit=None, where_document=None):
        del where, include, limit, where_document
        return {"ids": [], "documents": [], "metadatas": []}


class _FakeDocxDocument:
    def __init__(self, _path):
        self.paragraphs = []


class _FakeWorkbook:
    worksheets = []

    def close(self):
        return None


class _FakeUploadFile:
    def __init__(self, filename="uploaded.txt", content=b""):
        self.filename = filename
        self._content = content

    async def read(self):
        return self._content


class _FakeFastAPI:
    def __init__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs

    def get(self, *args, **kwargs):
        del args, kwargs

        def decorator(func):
            return func

        return decorator

    def post(self, *args, **kwargs):
        del args, kwargs

        def decorator(func):
            return func

        return decorator


class _FakeHTTPException(Exception):
    def __init__(self, status_code, detail):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def install_backend_stubs():
    dotenv = types.ModuleType("dotenv")
    dotenv.load_dotenv = lambda *args, **kwargs: None
    sys.modules["dotenv"] = dotenv

    pydantic = types.ModuleType("pydantic")
    pydantic.BaseModel = _BaseModel
    pydantic.Field = _field
    sys.modules["pydantic"] = pydantic

    fastapi = types.ModuleType("fastapi")
    fastapi.FastAPI = _FakeFastAPI
    fastapi.HTTPException = _FakeHTTPException
    fastapi.UploadFile = _FakeUploadFile
    fastapi.File = lambda default=...: default
    fastapi.Form = lambda default=None: default
    sys.modules["fastapi"] = fastapi

    langchain_core_documents = types.ModuleType("langchain_core.documents")
    langchain_core_documents.Document = FakeDocument
    sys.modules["langchain_core.documents"] = langchain_core_documents

    langchain_core_prompts = types.ModuleType("langchain_core.prompts")
    langchain_core_prompts.ChatPromptTemplate = _FakePrompt
    sys.modules["langchain_core.prompts"] = langchain_core_prompts

    langchain_anthropic = types.ModuleType("langchain_anthropic")
    langchain_anthropic.ChatAnthropic = _FakeChatAnthropic
    sys.modules["langchain_anthropic"] = langchain_anthropic

    langchain_huggingface = types.ModuleType("langchain_huggingface")
    langchain_huggingface.HuggingFaceEmbeddings = _FakeEmbeddings
    sys.modules["langchain_huggingface"] = langchain_huggingface

    langchain_chroma = types.ModuleType("langchain_chroma")
    langchain_chroma.Chroma = _FakeChroma
    sys.modules["langchain_chroma"] = langchain_chroma

    splitter_mod = types.ModuleType("langchain.text_splitter")

    class _FakeSplitter:
        def __init__(self, *args, **kwargs):
            self.args = args
            self.kwargs = kwargs

        def split_text(self, text):
            return [text]

    splitter_mod.RecursiveCharacterTextSplitter = _FakeSplitter
    sys.modules["langchain.text_splitter"] = splitter_mod

    splitter_fallback = types.ModuleType("langchain_text_splitters")
    splitter_fallback.RecursiveCharacterTextSplitter = _FakeSplitter
    sys.modules["langchain_text_splitters"] = splitter_fallback

    fitz = types.ModuleType("fitz")

    class _FakeFitzDoc:
        def __enter__(self):
            return []

        def __exit__(self, exc_type, exc, tb):
            del exc_type, exc, tb
            return False

    fitz.open = lambda _path: _FakeFitzDoc()
    sys.modules["fitz"] = fitz

    docx = types.ModuleType("docx")
    docx.Document = _FakeDocxDocument
    sys.modules["docx"] = docx

    openpyxl = types.ModuleType("openpyxl")
    openpyxl.load_workbook = lambda *args, **kwargs: _FakeWorkbook()
    sys.modules["openpyxl"] = openpyxl


__all__ = ["FakeDocument", "install_backend_stubs"]
