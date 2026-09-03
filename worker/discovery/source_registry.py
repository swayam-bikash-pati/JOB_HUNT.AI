"""
Source registry — loads sources.json and creates adapter instances.

Adding a new company = adding a JSON entry.
Adding a new source type = adding an adapter class.
"""
import json
import os
from pathlib import Path
from typing import Optional

from worker.discovery.base_adapter import SourceAdapter
from worker.discovery.greenhouse_adapter import GreenhouseAdapter
from worker.discovery.lever_adapter import LeverAdapter


# Map source type names to adapter classes
ADAPTER_REGISTRY: dict[str, type[SourceAdapter]] = {
    "greenhouse": GreenhouseAdapter,
    "lever": LeverAdapter,
}


def load_sources(config_path: Optional[str] = None) -> list[SourceAdapter]:
    """
    Load job source configurations and return adapter instances.

    Args:
        config_path: Path to sources.json. Defaults to worker/config/sources.json.

    Returns:
        List of configured and enabled SourceAdapter instances.
    """
    if config_path is None:
        config_path = str(
            Path(__file__).parent.parent / "config" / "sources.json"
        )

    if not os.path.exists(config_path):
        print(f"[SourceRegistry] Config not found: {config_path}")
        return []

    with open(config_path, "r") as f:
        config = json.load(f)

    adapters: list[SourceAdapter] = []

    for source in config.get("sources", []):
        source_type = source.get("type", "")
        enabled = source.get("enabled", True)
        name = source.get("name", "unknown")

        if not enabled:
            print(f"[SourceRegistry] Skipping disabled source: {name}")
            continue

        adapter_class = ADAPTER_REGISTRY.get(source_type)
        if adapter_class is None:
            print(
                f"[SourceRegistry] Unknown source type '{source_type}' "
                f"for source '{name}'. Skipping."
            )
            continue

        try:
            adapter = adapter_class(source)
            adapters.append(adapter)
            print(f"[SourceRegistry] Loaded: {name} ({source_type})")
        except Exception as e:
            print(
                f"[SourceRegistry] Failed to create adapter for "
                f"'{name}': {e}"
            )

    print(f"[SourceRegistry] {len(adapters)} sources loaded")
    return adapters
