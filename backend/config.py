from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    github_token: str
    openai_api_key: str

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()