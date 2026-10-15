# Planetary Interaction — ESI + esi-docs

Docs: https://developers.eveonline.com/docs/guides/pi/  
Source: `docs/guides/pi.md` + `snippets/formulae/pi-extraction.*`

## ESI routes (verify in OpenAPI)

| Route | Scope (typical) | Cache / limits |
|-------|-----------------|----------------|
| `GET /characters/{character_id}/planets` | `esi-planets.manage_planets.v1` | ~600s TTL; rate group `char-industry` |
| `GET /characters/{character_id}/planets/{planet_id}` | same | same; layout includes `pins`, `links`, `routes` |
| `GET /universe/planets/{planet_id}` | public | daily expiry (see route description) |
| `GET /corporations/{corporation_id}/customs_offices` | corp scope per OpenAPI | PI customs offices |

**Stale layout data:** OpenAPI states colony detail is only recalculated when the player views the colony in the EVE client. Tools must not assume real-time pin state if the player has not opened the colony.

## Extractor head output (not raw ESI numbers)

ESI exposes extractor configuration (cycle time, total cycles, quantity per cycle, pin type). **Per-cycle extracted amount** follows a decay + noise curve documented in esi-docs.

Default dogma (may vary by pin `type_id` — confirm in SDE `dgmAttributeTypes`):

| Attribute ID | Role | Default (docs) |
|--------------|------|----------------|
| 1683 | Decay factor | 0.012 |
| 1687 | Noise factor | 0.8 |

Reference implementation (from `snippets/formulae/pi-extraction.py`):

```python
import math

decay_factor = 0.012   # dogma 1683 for pin type
noise_factor = 0.8     # dogma 1687 for pin type

def calculate_extractor_values(total_cycles=30, cycle_time=30 * 60, qty_per_cycle=6965):
    bar_width = float(cycle_time) / 900.0
    for cycle in range(total_cycles):
        t = (cycle + 0.5) * bar_width
        decay_value = qty_per_cycle / (1 + t * decay_factor)
        phase_shift = pow(qty_per_cycle, 0.7)
        sin_a = math.cos(phase_shift + t * (1 / 12))
        sin_b = math.cos(phase_shift / 2 + t * 0.2)
        sin_c = math.cos(t * 0.5)
        sin_stuff = max((sin_a + sin_b + sin_c) / 3, 0)
        bar_height = decay_value * (1 + noise_factor * sin_stuff)
        yield bar_width * bar_height
```

Sum yielded values for total extraction over the program, or plot per-cycle for UI.

## SDE vs ESI for PI

| Need | Source |
|------|--------|
| Schematic types, commodities, planet resources | SDE + universe endpoints |
| Live colony layout, routes, extractor timers | Character planets endpoints |
| Pin type dogma (decay/noise) | SDE dogma attributes on pin `type_id` |

## Related esi-docs snippets

- `snippets/formulae/planet-warp-in.*` — warp-in geometry (map tools)
- Route formulae under `snippets/formulae/route-*.py` — hauling between colonies
