from fastapi import APIRouter, HTTPException
from app.models.schemas import ModelsListResponse, ModelInfo
from app.core.model_loader import MODEL_REGISTRY

router = APIRouter()


@router.get("/models", response_model=ModelsListResponse)
async def list_models():
    models = []
    for model_name, info in MODEL_REGISTRY.items():
        models.append(ModelInfo(
            name=info["name"],
            architecture=info["architecture"],
            filter=info["filter"],
            lookback=info["lookback"],
            is_lopo=info.get("is_lopo", False),
            r2_lopo=info.get("r2_lopo"),
            ic95=info.get("ic95"),
        ))
    return ModelsListResponse(models=models, total=len(models))
