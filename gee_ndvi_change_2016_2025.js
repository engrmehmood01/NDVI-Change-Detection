/*******************************************************
 * NDVI Change Detection (2016 vs 2025) - GEE Script
 * Data: Landsat 8/9 Collection 2 Level 2 (SR)
 * Output: NDVI 2016, NDVI 2025, dNDVI (2025-2016)
 * Legends: NDVI + Change
 *******************************************************/

// =====================
// ROI
// Option A: Draw a polygon in the Code Editor and name it `roi`
// Option B: Replace this geometry with your ROI
// =====================
var roi = /* color: #d63000 */ ee.Geometry.Polygon(
  [[[73.0, 34.0], [73.0, 33.5], [73.8, 33.5], [73.8, 34.0]]],
  null,
  false
);

Map.centerObject(roi, 9);
Map.addLayer(roi, {color: 'red'}, 'ROI');


// =====================
// Helpers: Landsat C2 L2 scaling + masking + NDVI
// =====================

// Apply scale factors for Landsat C2 L2 Surface Reflectance
function applyScaleFactorsL8L9(img) {
  // SR scale: 0.0000275 and offset: -0.2
  var optical = img.select(['SR_B2','SR_B3','SR_B4','SR_B5','SR_B6','SR_B7'])
    .multiply(0.0000275)
    .add(-0.2);
  return img.addBands(optical, null, true);
}

// Mask clouds/shadows/snow using QA_PIXEL bits
function maskLandsatC2L2(img) {
  var qa = img.select('QA_PIXEL');

  // Bits (QA_PIXEL):
  // 0 Fill
  // 1 Dilated Cloud
  // 2 Cirrus
  // 3 Cloud
  // 4 Cloud Shadow
  // 5 Snow
  var mask = qa.bitwiseAnd(1 << 0).eq(0)
    .and(qa.bitwiseAnd(1 << 1).eq(0))
    .and(qa.bitwiseAnd(1 << 2).eq(0))
    .and(qa.bitwiseAnd(1 << 3).eq(0))
    .and(qa.bitwiseAnd(1 << 4).eq(0))
    .and(qa.bitwiseAnd(1 << 5).eq(0));

  return img.updateMask(mask);
}

// Add NDVI band (Landsat 8/9: NIR=SR_B5, RED=SR_B4)
function addNDVI(img) {
  var ndvi = img.normalizedDifference(['SR_B5','SR_B4']).rename('NDVI');
  return img.addBands(ndvi);
}


// =====================
// Build image collection
// =====================
var l89 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
  .filterBounds(roi)
  .map(applyScaleFactorsL8L9)
  .map(maskLandsatC2L2)
  .map(addNDVI);


// =====================
// Time windows
// Tip: For less seasonal noise, use the same season both years
// Example seasonal windows:
// 2016-06-01 to 2016-09-30
// 2025-06-01 to 2025-09-30
// =====================
var start2016 = '2016-01-01';
var end2016   = '2016-12-31';

var start2025 = '2025-01-01';
var end2025   = '2025-12-31';

var ndvi2016 = l89.filterDate(start2016, end2016)
  .median()
  .select('NDVI')
  .clip(roi);

var ndvi2025 = l89.filterDate(start2025, end2025)
  .median()
  .select('NDVI')
  .clip(roi);


// =====================
// Visualization
// =====================

// NDVI palette (dry/bare -> green vegetation)
var ndviVis = {
  min: -0.2,
  max: 0.9,
  palette: [
    '8c510a','bf812d','dfc27d','f6e8c3', // dry/bare
    'c7eae5','80cdc1','35978f','01665e', // light veg
    '1a9850','006837'                    // dense veg
  ]
};

// dNDVI palette (loss -> neutral -> gain)
var dndviVis = {
  min: -0.5,
  max: 0.5,
  palette: ['b2182b','ef8a62','f7f7f7','67a9cf','2166ac']
};

Map.addLayer(ndvi2016, ndviVis, 'NDVI 2016');
Map.addLayer(ndvi2025, ndviVis, 'NDVI 2025');

var dndvi = ndvi2025.subtract(ndvi2016).rename('dNDVI');
Map.addLayer(dndvi, dndviVis, 'dNDVI (2025 - 2016)');


// =====================
// Optional: loss/gain masks (tune thresholds)
// =====================
var lossThr = -0.2; // vegetation drop
var gainThr =  0.2; // vegetation increase

var lossMask = dndvi.lte(lossThr).selfMask().rename('loss');
var gainMask = dndvi.gte(gainThr).selfMask().rename('gain');

Map.addLayer(lossMask, {palette: ['ff0000']}, 'Loss mask (dNDVI <= -0.2)');
Map.addLayer(gainMask, {palette: ['0000ff']}, 'Gain mask (dNDVI >= 0.2)');


// =====================
// Legends (NDVI + Change)
// =====================

// ---- NDVI Legend ----
function addNdviLegend() {
  var panel = ui.Panel({
    style: { position: 'bottom-left', padding: '8px 10px' }
  });

  panel.add(ui.Label({
    value: 'NDVI (colored)',
    style: { fontWeight: 'bold', fontSize: '14px', margin: '0 0 6px 0' }
  }));

  // Simple discrete legend labels
  var rows = [
    ['8c510a', 'Very low / bare'],
    ['dfc27d', 'Low'],
    ['c7eae5', 'Moderate'],
    ['35978f', 'High'],
    ['006837', 'Very high']
  ];

  rows.forEach(function(r) {
    var colorBox = ui.Label({
      style: { backgroundColor: r[0], padding: '8px', margin: '0 0 4px 0' }
    });
    var label = ui.Label({ value: r[1], style: { margin: '0 0 4px 6px' } });
    panel.add(ui.Panel({
      widgets: [colorBox, label],
      layout: ui.Panel.Layout.Flow('horizontal')
    }));
  });

  Map.add(panel);
}

// ---- Change Legend ----
function addChangeLegend() {
  var panel = ui.Panel({
    style: { position: 'bottom-right', padding: '8px 10px' }
  });

  panel.add(ui.Label({
    value: 'NDVI Change (2025 – 2016)',
    style: { fontWeight: 'bold', fontSize: '14px', margin: '0 0 6px 0' }
  }));

  function row(color, name) {
    var box = ui.Label({
      style: { backgroundColor: color, padding: '8px', margin: '0 0 4px 0' }
    });
    var lab = ui.Label({ value: name, style: { margin: '0 0 4px 6px' } });
    return ui.Panel({
      widgets: [box, lab],
      layout: ui.Panel.Layout.Flow('horizontal')
    });
  }

  panel.add(row('#b2182b', 'Strong vegetation loss'));
  panel.add(row('#ef8a62', 'Moderate vegetation loss'));
  panel.add(row('#f7f7f7', 'No significant change'));
  panel.add(row('#67a9cf', 'Moderate vegetation gain'));
  panel.add(row('#2166ac', 'Strong vegetation gain'));

  Map.add(panel);
}

addNdviLegend();
addChangeLegend();


// =====================
// Exports to Google Drive (optional)
// =====================
Export.image.toDrive({
  image: ndvi2016,
  description: 'NDVI_2016_roi',
  region: roi,
  scale: 30,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: ndvi2025,
  description: 'NDVI_2025_roi',
  region: roi,
  scale: 30,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: dndvi,
  description: 'dNDVI_2025_minus_2016_roi',
  region: roi,
  scale: 30,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: lossMask,
  description: 'NDVI_lossMask_2025_minus_2016_roi',
  region: roi,
  scale: 30,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: gainMask,
  description: 'NDVI_gainMask_2025_minus_2016_roi',
  region: roi,
  scale: 30,
  maxPixels: 1e13
});
