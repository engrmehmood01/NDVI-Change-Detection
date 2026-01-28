# NDVI Change Detection (2016 vs 2025) in Google Earth Engine

This repo contains a Google Earth Engine (GEE) script to compute and visualize:

- NDVI for **2016**
- NDVI for **2025**
- NDVI change: **dNDVI = NDVI_2025 − NDVI_2016**
- Map legends for NDVI and change
- Optional threshold masks for vegetation loss/gain
- Drive exports (NDVI 2016, NDVI 2025, dNDVI, loss mask, gain mask)

The workflow is designed to run inside the **GEE Code Editor (JavaScript)** using **Landsat Collection 2 Level 2 Surface Reflectance** (Landsat 8 + Landsat 9) for consistent comparisons.

---

## Files

- `gee_ndvi_change_2016_2025.js`  
  Main GEE script (copy/paste into https://code.earthengine.google.com)

---

## Requirements

- A Google Earth Engine account: https://earthengine.google.com
- Access to the GEE Code Editor: https://code.earthengine.google.com

---

## How to run

1. Open the **GEE Code Editor**
2. Create a new script and paste the contents of `gee_ndvi_change_2016_2025.js`
3. Set your ROI:
   - Option A: Draw a polygon and name it `roi`
   - Option B: Replace the ROI geometry in the script
4. Click **Run**
5. (Optional) Click **Tasks** and run the exports to Google Drive

---

## Notes / Best practices

- For cleaner change results, compare the **same season** in both years (e.g., June–August in both 2016 and 2025).
- Thresholds for loss/gain depend on your landscape:
  - Common starting points:
    - Loss: `dNDVI <= -0.2`
    - Gain: `dNDVI >= 0.2`
- If the ROI is large, exports may take time. Use reasonable `scale` (30m for Landsat).

---

## Outputs

- NDVI 2016 (colored)
- NDVI 2025 (colored)
- dNDVI map (loss/gain)
- Optional loss and gain masks

---

## License

MIT (or your preferred license)
