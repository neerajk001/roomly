# 05 — Estimate Engine

Package: `packages/estimate`. **Pure TypeScript. No IO. No database. No floats for money.** All UI and server code gets prices from here.

## Inputs

```ts
type Opening = { type: "DOOR" | "WINDOW"; widthMm: number; heightMm: number; qty: number };

type RoomInput = {
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  openings: Opening[];
};

type RateUnit = "AREA_FLOOR" | "AREA_CEILING" | "AREA_WALL" | "LENGTH_PERIMETER" | "PER_UNIT" | "LUMP_SUM";

type RateItem = {
  key: string;
  label: string;
  category: string;
  unit: RateUnit;
  unitPriceMinor: number;      // price per m², per m, per unit, or lump sum
};

type Selection = {
  itemKey: string;
  quantityOverride?: number;   // required for PER_UNIT; optional override for others
};

type Config = {
  currency: string;
  markupBps: number;           // 1000 = 10%
  taxBps: number;
  rangeBps?: number;           // for rough estimates, e.g. 1500 = ±15%
};
```

## Derived quantities (metric)

Convert mm to metres first (`mm / 1000`).

- `floorArea = width × length` (m²)
- `ceilingArea = floorArea`
- `perimeter = 2 × (width + length)` (m)
- `grossWallArea = perimeter × height`
- `openingsArea = Σ (opening.width × opening.height × qty)`
- `wallArea = max(0, grossWallArea − openingsArea)`

Quantity per unit type:

| Unit | Quantity |
|---|---|
| `AREA_FLOOR` | `floorArea` |
| `AREA_CEILING` | `ceilingArea` |
| `AREA_WALL` | `wallArea` |
| `LENGTH_PERIMETER` | `perimeter` |
| `PER_UNIT` | `quantityOverride` (default 1) |
| `LUMP_SUM` | `1` |

If `quantityOverride` is given for any unit, use it instead of the derived quantity.

## Rounding (MUST be exact and tested)

- Quantities are rounded to 2 decimals (half up).
- `lineTotalMinor = round_half_up(quantity × unitPriceMinor)` as an integer.
- `subtotal = Σ lineTotalMinor`
- `markupMinor = round_half_up(subtotal × markupBps / 10000)`
- `taxMinor = round_half_up((subtotal + markupMinor) × taxBps / 10000)`
- `total = subtotal + markupMinor + taxMinor`
- Range (if `rangeBps`): `low = round(total × (10000 − rangeBps) / 10000)`, `high = round(total × (10000 + rangeBps) / 10000)`.
- Use integer arithmetic or a decimal library for the multiplication. Never accumulate float error.

## Output

```ts
type EstimateResult = {
  currency: string;
  lines: { itemKey: string; label: string; category: string; unit: RateUnit; quantity: number; unitPriceMinor: number; totalMinor: number }[];
  subtotalMinor: number;
  markupMinor: number;
  taxMinor: number;
  totalMinor: number;
  lowMinor?: number;
  highMinor?: number;
};

function computeEstimate(room: RoomInput, items: RateItem[], selections: Selection[], config: Config): EstimateResult;
```

## Imperial display

Only the UI converts. Storage and math stay metric (mm → m). Provide `formatLength(mm, system)` and `formatArea(m2, system)` helpers in `packages/shared`. Imperial: ft/in and sq ft. Rate cards in imperial workspaces show price per sq ft and per ft, but `unitPriceMinor` stays per m²/m in storage, converted at the UI edge: `pricePerSqFt = pricePerM2 / 10.7639` (store the converted value back as per m² when the user edits).

## Home mode defaults

- Use a seeded default rate card per currency with **sample numbers clearly labelled "illustrative defaults"** in code comments and in the UI ("Rough range. Actual prices vary by location and provider"). Do NOT present them as market data.
- Always return a range (`rangeBps` default 2000 = ±20%).
- Default scope by room type (config file `packages/shared/src/default-scope.ts`), e.g. living room: paint walls, paint ceiling, flooring, lighting points ×N, curtains, furniture package (lump sum). Renter mode removes flooring, ceiling work, built-ins.

## Pro mode

- Uses the studio's selected rate card. Shows exact lines and totals (no range by default).
- Designer can edit any line (label, quantity, unit price), add custom lines, and remove lines. Edits recalculate totals with the same functions (`recompute(lines, config)` helper exported from this package).
- An estimate is saved as a versioned record. Sent proposals reference a specific estimate version, which becomes immutable.

## Golden test (MUST pass)

Room: width 4000 mm, length 3000 mm, height 2700 mm. Openings: 1 door 900×2100 mm, 1 window 1500×1200 mm.

| Quantity | Expected |
|---|---|
| floorArea | 12.00 m² |
| ceilingArea | 12.00 m² |
| perimeter | 14.00 m |
| grossWallArea | 37.80 m² |
| openingsArea | 3.69 m² |
| wallArea | 34.11 m² |

Rate items: wall paint `AREA_WALL` at 1000 minor/m²; flooring `AREA_FLOOR` at 3000 minor/m²; skirting `LENGTH_PERIMETER` at 500 minor/m; lighting point `PER_UNIT` at 2500 with override 4.

Expected lines: wall paint 34.11 × 1000 = **34110**; flooring 12.00 × 3000 = **36000**; skirting 14.00 × 500 = **7000**; lighting 4 × 2500 = **10000**. Subtotal **87110**.

With `markupBps = 1000` and `taxBps = 500`: markup = 8711; tax = round(95821 × 0.05) = 4791 (4791.05 → 4791); total = 95821 + 4791 = **100612**.

With `rangeBps = 1500`: low = 85520 (100612 × 0.85 = 85520.2), high = 115704 (100612 × 1.15 = 115703.8).

Add more tests: zero openings; openings larger than the wall (wallArea = 0); quantityOverride; rounding at .5 boundaries; very small and very large rooms; markup 0 and tax 0; empty selections (total 0).
