import * as d3 from 'd3';
import { selectedCounties } from './mouseEvents.js'; // Import the selectedCounties array

const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1IjoibWFya2VybWFuIiwiYSI6ImNtOGpiamE0ZTBsdWQybHNmdmZ1dWpwOXIifQ.lNFvchcvc2U0DeVspUMN8A';
const MAPBOX_STATIC_URL = 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static';

// State management
let isSatelliteMode = false;
let selectedCounty = null; // Keep for backward compatibility
let satelliteImage = null;
let currentProjection = null;
let countyClipPath = null;
let svgContainer = null;
let satelliteCounties = new Set(); // Track FIPS of counties with satellite view

export function createSatelliteToggle(svg, projection) {
    console.log('📡 createSatelliteToggle called');
    
    currentProjection = projection;
    svgContainer = svg;
    
    svg.selectAll('.satellite-toggle').remove();
    
    // Calculate position: 500 pixels down from original position (20 + 500 = 520)
    const toggleX = svg.attr('width') - 200;
    const toggleY = 20 + 500; // 500 pixels lower
    
    const toggleGroup = svg.append('g')
        .attr('class', 'satellite-toggle')
        .attr('transform', `translate(${toggleX}, ${toggleY})`) // Updated Y position
        .style('cursor', 'pointer')
        .style('pointer-events', 'all')
        .style('opacity', 1) // Changed from 0.5 to 1 (no transparency)
        .style('display', 'block');

    // Solid dark grey rectangle background for better text readability
    toggleGroup.append('rect')
        .attr('width', 180)
        .attr('height', 36)
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('fill', '#2c3e50') // Dark grey background
        .attr('stroke', '#34495e')
        .attr('stroke-width', 1)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');

    // Icon - position adjusted for rectangle
    toggleGroup.append('text')
        .attr('x', 25) // Adjusted for rectangle
        .attr('y', 22)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ecf0f1')
        .attr('font-size', '18px')
        .text('🛰️');

    // Label - position adjusted for rectangle
    toggleGroup.append('text')
        .attr('x', 40) // Adjusted for rectangle (was 40)
        .attr('y', 22)
        .attr('fill', '#ecf0f1')
        .attr('font-size', '13px')
        .attr('font-weight', '600')
        .text('Satellite View');

    // Toggle switch - position adjusted: moved UP 5px and LEFT 10px
    const switchGroup = toggleGroup.append('g')
        .attr('transform', 'translate(135, 6)'); // Changed from (140, 8) to (130, 3)

    // Toggle background (small rectangle for switch only)
    switchGroup.append('rect')
        .attr('width', 44)
        .attr('height', 24)
        .attr('rx', 12)
        .attr('ry', 12)
        .attr('fill', '#7f8c8d')
        .attr('stroke', '#95a5a6')
        .attr('stroke-width', 1);

    const toggleCircle = switchGroup.append('circle')
        .attr('cx', 12)
        .attr('cy', 12)
        .attr('r', 10)
        .attr('fill', 'white')
        .attr('stroke', '#95a5a6')
        .attr('stroke-width', 1)
        .style('transition', 'transform 0.2s');

    toggleGroup.on('click', async function(event) {
        event.stopPropagation();
        event.preventDefault();
        
        console.log('🔄 Satellite toggle clicked');
        console.log('📊 Currently tracked satellite counties:', Array.from(satelliteCounties));
        
        // Check if any counties are selected (using the imported array)
        if (!selectedCounties || selectedCounties.length === 0) {
            console.warn('❌ No counties selected for satellite view');
            alert('Please select at least one county first by clicking on it.');
            return;
        }
        
        isSatelliteMode = !isSatelliteMode;
        
        toggleCircle
            .transition()
            .duration(200)
            .attr('cx', isSatelliteMode ? 32 : 12)
            .attr('fill', isSatelliteMode ? '#2ecc71' : 'white');
        
        // Update toggle switch background color
        switchGroup.select('rect')
            .attr('fill', isSatelliteMode ? '#34495e' : '#7f8c8d');
        
        // Update button background color when toggled
        toggleGroup.select('rect')
            .attr('fill', isSatelliteMode ? '#1a252f' : '#2c3e50'); // Darker when active
        
        if (isSatelliteMode) {
            // Turn ON satellite for currently selected counties
            await showSatelliteInlay(svg);
        } else {
            // Turn OFF satellite only for currently selected counties
            selectedCounties.forEach(county => {
                hideSatelliteInlay(svg, county.FIPS);
            });
        }
    });

    console.log('✅ Satellite toggle created at position:', { x: toggleX, y: toggleY });
    return toggleGroup;
}

async function showSatelliteInlay(svg) {
    console.log('🛰️ showSatelliteInlay called');
    console.log('📊 Number of selected counties:', selectedCounties.length);
    console.log('📊 Already have satellite view:', Array.from(satelliteCounties));
    
    // Check which selected counties already have satellite view
    const newCounties = selectedCounties.filter(county => !satelliteCounties.has(county.FIPS));
    const existingCounties = selectedCounties.filter(county => satelliteCounties.has(county.FIPS));
    
    if (existingCounties.length > 0) {
        console.log(`⚠️ ${existingCounties.length} counties already have satellite view:`, 
            existingCounties.map(c => c.County));
    }
    
    if (newCounties.length === 0) {
        console.log('✅ All selected counties already have satellite view');
        return;
    }
    
    if (!currentProjection) {
        console.error('❌ Missing required data');
        return;
    }
    
    try {
        // Get the GeoJSON features for NEW selected counties only
        const pathGenerator = d3.geoPath().projection(currentProjection);
        
        // Get all map layers to find the GeoJSON features
        const allMapLayers = svg.selectAll('path.map-layer');
        const selectedFeatures = [];
        
        // For each NEW selected county, find its GeoJSON feature
        newCounties.forEach(selectedCountyData => {
            const matchingLayer = allMapLayers.filter(d => 
                d.properties && d.properties.FIPS === selectedCountyData.FIPS
            );
            
            if (!matchingLayer.empty()) {
                const feature = matchingLayer.datum();
                selectedFeatures.push(feature);
                console.log(`✅ Found GeoJSON for ${selectedCountyData.County}, ${selectedCountyData.State}`);
            } else {
                console.warn(`❓ Could not find GeoJSON for ${selectedCountyData.County}, ${selectedCountyData.State}`);
            }
        });
        
        if (selectedFeatures.length === 0) {
            throw new Error('Could not find GeoJSON features for selected counties');
        }
        
        console.log(`✅ Found ${selectedFeatures.length} NEW GeoJSON features`);
        
        // Calculate combined bounds for NEW selected counties only
        const combinedBounds = getCombinedLatLngBounds(selectedFeatures);
        if (!combinedBounds) {
            throw new Error('Could not calculate combined bounds');
        }
        
        const { south, north, west, east } = combinedBounds;
        console.log('📍 Combined bounds for new counties:', {
            south: south.toFixed(6),
            north: north.toFixed(6),
            west: west.toFixed(6),
            east: east.toFixed(6)
        });
        
        // Validate bounds
        if (!isValidBounds(combinedBounds)) {
            console.error('❌ Invalid geographic bounds');
            throw new Error('Combined bounds are outside valid geographic range');
        }
        
        // Calculate center
        const centerLng = clampLng((west + east) / 2);
        const centerLat = clampLat((south + north) / 2);
        const zoom = calculateOptimalZoom(combinedBounds);
        
        console.log('🎯 Center of combined area:', { lng: centerLng.toFixed(6), lat: centerLat.toFixed(6) });
        console.log('🔍 Zoom level for combined area:', zoom);
        
        // Adjust image dimensions based on number of counties
        const baseWidth = 1280;
        const baseHeight = 960;
        const width = baseWidth;
        const height = baseHeight;
        
        // Build URL
        const imageUrl = `${MAPBOX_STATIC_URL}/${centerLng.toFixed(6)},${centerLat.toFixed(6)},${zoom}/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}&attribution=false&logo=false`;
        
        console.log('🔗 Image URL for combined area:', imageUrl);
        
        // Test the URL
        console.log('🧪 Testing URL...');
        try {
            const testResponse = await fetch(imageUrl, { method: 'HEAD' });
            if (!testResponse.ok) {
                console.error('❌ URL test failed:', testResponse.status, testResponse.statusText);
                throw new Error(`Mapbox rejected request: ${testResponse.status} ${testResponse.statusText}`);
            }
            console.log('✅ URL test passed');
        } catch (fetchError) {
            console.warn('⚠️ Could not test URL (CORS or network issue), proceeding anyway...');
        }
        
        // Get existing defs or create new ones
        let defs = svg.select('defs');
        if (defs.empty()) {
            defs = svg.append('defs');
        }
        
        // Get existing clipPath or create new one
        let countyClipPath = defs.select('#county-clip-path');
        if (countyClipPath.empty()) {
            countyClipPath = defs.append('clipPath')
                .attr('id', 'county-clip-path');
        }
        
        // Add paths for NEW counties to the clip path
        selectedFeatures.forEach(feature => {
            const countyPath = pathGenerator(feature);
            if (countyPath) {
                countyClipPath.append('path')
                    .attr('d', countyPath);
            }
        });
        
        console.log(`✅ Added ${selectedFeatures.length} new counties to clip path`);
        
        // Calculate combined SVG bounds for positioning
        let combinedSvgBounds = null;
        selectedFeatures.forEach(feature => {
            const bounds = pathGenerator.bounds(feature);
            if (bounds) {
                if (!combinedSvgBounds) {
                    combinedSvgBounds = bounds;
                } else {
                    // Expand bounds to include this county
                    combinedSvgBounds[0][0] = Math.min(combinedSvgBounds[0][0], bounds[0][0]);
                    combinedSvgBounds[0][1] = Math.min(combinedSvgBounds[0][1], bounds[0][1]);
                    combinedSvgBounds[1][0] = Math.max(combinedSvgBounds[1][0], bounds[1][0]);
                    combinedSvgBounds[1][1] = Math.max(combinedSvgBounds[1][1], bounds[1][1]);
                }
            }
        });
        
        if (!combinedSvgBounds) {
            throw new Error('Could not calculate combined SVG bounds');
        }
        
        const [[x0, y0], [x1, y1]] = combinedSvgBounds;
        const combinedWidth = x1 - x0;
        const combinedHeight = y1 - y0;
        const combinedCenterX = (x0 + x1) / 2;
        const combinedCenterY = (y0 + y1) / 2;
        
        console.log('📐 Combined SVG bounds:', { x0, y0, x1, y1 });
        console.log('📐 Combined SVG dimensions:', { width: combinedWidth, height: combinedHeight });
        
        // Create satellite inlay group in the zoom group
        const zoomGroup = svg.select('.zoom-group');
        const inlayGroup = zoomGroup.append('g')
            .attr('class', 'satellite-inlay-group')
            .attr('data-counties', newCounties.map(c => c.FIPS).join(',')); // Track which counties
        
        // Convert geographic bounds to SVG coordinates
        const sw = currentProjection([west, south]);
        const ne = currentProjection([east, north]);
        
        if (sw && ne) {
            const x = Math.min(sw[0], ne[0]);
            const y = Math.min(sw[1], ne[1]);
            const widthPx = Math.abs(ne[0] - sw[0]);
            const heightPx = Math.abs(ne[1] - sw[1]);
            
            console.log('📐 Projected dimensions for combined area:', { x, y, widthPx, heightPx });
            
            // Create the satellite image covering the combined area
            satelliteImage = inlayGroup.append('image')
                .attr('class', 'satellite-inlay')
                .attr('x', x)
                .attr('y', y)
                .attr('width', widthPx)
                .attr('height', heightPx)
                .attr('preserveAspectRatio', 'xMidYMid slice')
                .attr('clip-path', 'url(#county-clip-path)') // Clip to all selected counties
                .attr('opacity', 0)
                .attr('href', imageUrl)
                .attr('pointer-events', 'none')
                .attr('image-rendering', 'optimizeQuality');
        } else {
            throw new Error('Could not project combined bounds to SVG coordinates');
        }
        
        console.log(`✅ No yellow borders added (per request)`);
        
        // Hide original NEW counties (make fill transparent so satellite shows through)
        newCounties.forEach(county => {
            const countyFIPS = county.FIPS;
            svg.selectAll('path.map-layer')
                .filter(d => d.properties.FIPS === countyFIPS)
                .style('fill-opacity', 0); // Just hide fill, keep everything else
        });
        
        console.log(`✅ Hid ${newCounties.length} new original counties`);
        
        // Add new counties to tracking set
        newCounties.forEach(county => {
            satelliteCounties.add(county.FIPS);
        });
        console.log(`📡 Updated satellite counties: ${Array.from(satelliteCounties)}`);
        
        // Add loading indicator at the center of combined area
        const loadingText = svg.append('text')
            .attr('class', 'loading-indicator')
            .attr('x', combinedCenterX)
            .attr('y', combinedCenterY)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .attr('paint-order', 'stroke')
            .attr('stroke', '#000')
            .attr('stroke-width', '3px')
            .text(`Loading satellite for ${newCounties.length} new county${newCounties.length > 1 ? 's' : ''}...`);
        
        // Load image
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        return new Promise((resolve, reject) => {
            img.onload = function() {
                console.log(`✅ Image loaded successfully for ${newCounties.length} new counties`);
                loadingText.remove();
                satelliteImage
                    .transition()
                    .duration(800)
                    .attr('opacity', 1);
                
                // CRITICAL FIX: Ensure interaction layer is on top of satellite
                const interactionLayer = svg.select('.interaction-layer');
                if (!interactionLayer.empty()) {
                    interactionLayer.raise(); // Move to front (SVG paint order)
                    console.log('✅ Interaction layer moved to front');
                }
                
                resolve();
            };
            
            img.onerror = function(err) {
                console.error(`❌ Failed to load image:`, err);
                loadingText.remove();
                satelliteImage.remove();
                
                // Remove failed counties from tracking
                newCounties.forEach(county => {
                    satelliteCounties.delete(county.FIPS);
                });
                
                // Show error message
                const errorMsg = svg.append('text')
                    .attr('x', combinedCenterX)
                    .attr('y', combinedCenterY)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#ff6b6b')
                    .attr('font-size', '12px')
                    .attr('font-weight', 'bold')
                    .text(`Satellite failed for ${newCounties.length} counties`);
                
                // Add retry button
                const retryGroup = svg.append('g')
                    .attr('class', 'retry-button')
                    .attr('transform', `translate(${combinedCenterX}, ${combinedCenterY + 20})`)
                    .style('cursor', 'pointer');
                
                retryGroup.append('rect')
                    .attr('width', 80)
                    .attr('height', 24)
                    .attr('rx', 4)
                    .attr('ry', 4)
                    .attr('fill', '#3498db')
                    .on('click', async () => {
                        retryGroup.remove();
                        errorMsg.remove();
                        await showSatelliteInlay(svg);
                    });
                
                retryGroup.append('text')
                    .attr('x', 40)
                    .attr('y', 16)
                    .attr('text-anchor', 'middle')
                    .attr('fill', 'white')
                    .attr('font-size', '11px')
                    .text('Retry');
                
                reject(err);
            };
            
            img.src = imageUrl;
        });
        
    } catch (error) {
        console.error('💥 Error in showSatelliteInlay:', error);
        
        // Remove failed counties from tracking
        if (selectedCounties) {
            selectedCounties.forEach(county => {
                satelliteCounties.delete(county.FIPS);
            });
        }
        
        isSatelliteMode = false;
        alert(`Failed to load satellite for selected counties: ${error.message}. Check console for details.`);
    }
}

// Calculate combined bounds for multiple GeoJSON features
function getCombinedLatLngBounds(features) {
    if (!features || features.length === 0 || !currentProjection) {
        console.error('❌ No features or projection available');
        return null;
    }
    
    console.log(`Calculating combined bounds for ${features.length} features`);
    
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    features.forEach(feature => {
        const coordinates = feature.geometry.coordinates;
        
        if (!coordinates || coordinates.length === 0) {
            return;
        }
        
        // Flatten multipolygon if needed
        const flatCoords = coordinates.flat(2);
        
        for (let i = 0; i < flatCoords.length; i += 2) {
            const lng = flatCoords[i];
            const lat = flatCoords[i + 1];
            
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        }
    });
    
    // Check if we found valid bounds
    if (!isFinite(minLng) || !isFinite(maxLng) || !isFinite(minLat) || !isFinite(maxLat)) {
        console.error('❌ Could not calculate valid combined bounds');
        return null;
    }
    
    // Add padding (less padding for combined areas since they're already larger)
    const padding = 0.01;
    
    const bounds = {
        south: minLat - padding,
        north: maxLat + padding,
        west: minLng - padding,
        east: maxLng + padding
    };
    
    console.log('📐 Combined bounds with padding:', {
        south: bounds.south.toFixed(6),
        north: bounds.north.toFixed(6),
        west: bounds.west.toFixed(6),
        east: bounds.east.toFixed(6)
    });
    
    return bounds;
}

// Validate bounds are within geographic limits
function isValidBounds(bounds) {
    const { south, north, west, east } = bounds;
    
    // Check for valid latitude (-90 to 90)
    if (south < -90 || south > 90 || north < -90 || north > 90) {
        console.error('Invalid latitude:', south, north);
        return false;
    }
    
    // Check for valid longitude (-180 to 180)
    if (west < -180 || west > 180 || east < -180 || east > 180) {
        console.error('Invalid longitude:', west, east);
        return false;
    }
    
    // Check that south < north and west < east
    if (south >= north || west >= east) {
        console.error('Invalid bounds ordering:', { south, north, west, east });
        return false;
    }
    
    return true;
}

// Clamp longitude to valid range
function clampLng(lng) {
    // Normalize longitude to -180 to 180
    while (lng < -180) lng += 360;
    while (lng > 180) lng -= 360;
    return lng;
}

// Clamp latitude to valid range
function clampLat(lat) {
    // Clamp latitude to -85 to 85 (Mapbox limits)
    return Math.max(-85, Math.min(85, lat));
}

function calculateOptimalZoom(bounds) {
    const { south, north, west, east } = bounds;
    const latDiff = Math.abs(north - south);
    const lngDiff = Math.abs(east - west);
    const maxDiff = Math.max(latDiff, lngDiff);
    
    console.log('🔍 Zoom calculation for combined area:', { maxDiff: maxDiff.toFixed(4) });
    
    // Adjust zoom based on area size - larger areas need lower zoom
    if (maxDiff > 15) return 5;    // Very large combined area (multiple states)
    if (maxDiff > 10) return 6;    // Large combined area (entire state)
    if (maxDiff > 5) return 7;     // Medium-large combined area
    if (maxDiff > 2.5) return 8;   // Medium combined area
    if (maxDiff > 1) return 9;     // Small combined area
    if (maxDiff > 0.5) return 10;  // Smaller combined area
    if (maxDiff > 0.25) return 11; // Very small combined area
    return 12;                     // Tiny combined area
}

function hideSatelliteInlay(svg, countyFIPS = null) {
    if (countyFIPS) {
        console.log(`👋 Hiding satellite view for county FIPS: ${countyFIPS}`);
        
        // Remove from tracking set
        satelliteCounties.delete(countyFIPS);
        console.log(`📡 Updated satellite counties: ${Array.from(satelliteCounties)}`);
        
        // Find and remove the satellite inlay group that contains this county
        const allInlayGroups = svg.selectAll('.satellite-inlay-group');
        
        allInlayGroups.each(function() {
            const group = d3.select(this);
            const countiesAttr = group.attr('data-counties');
            if (countiesAttr && countiesAttr.includes(countyFIPS)) {
                // This group contains the county - remove it
                group.remove();
                console.log(`✅ Removed satellite group containing county ${countyFIPS}`);
            }
        });
        
        // Restore that specific county's original appearance
        svg.selectAll('path.map-layer')
            .filter(d => d.properties.FIPS === countyFIPS)
            .style('fill-opacity', 1);
        
        console.log(`✅ Restored original appearance for county ${countyFIPS}`);
        
    } else {
        // Original behavior: hide all (only when toggling off globally or resetting)
        console.log('👋 Hiding ALL satellite views');
        
        svg.selectAll('.satellite-inlay-group').remove();
        svg.selectAll('defs').remove();
        svg.selectAll('.retry-button').remove();
        
        // Restore ALL counties that had satellite view
        satelliteCounties.forEach(fips => {
            svg.selectAll('path.map-layer')
                .filter(d => d.properties.FIPS === fips)
                .style('fill-opacity', 1);
        });
        
        satelliteCounties.clear();
        console.log('✅ Cleared all satellite tracking');
    }
    
    // Remove loading indicator if it exists
    svg.selectAll('.loading-indicator').remove();
}

// Keep this for backward compatibility (single county selection)
function getCountyLatLngBounds(feature) {
    if (!currentProjection) {
        console.error('❌ No projection available');
        return null;
    }
    
    const coordinates = feature.geometry.coordinates;
    
    if (!coordinates || coordinates.length === 0) {
        console.error('❌ No coordinates in feature');
        return null;
    }
    
    // Flatten multipolygon if needed
    const flatCoords = coordinates.flat(2);
    
    // Find min/max lat/lng
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    for (let i = 0; i < flatCoords.length; i += 2) {
        const lng = flatCoords[i];
        const lat = flatCoords[i + 1];
        
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }
    
    // Add padding
    const padding = 0.02;
    
    return {
        south: minLat - padding,
        north: maxLat + padding,
        west: minLng - padding,
        east: maxLng + padding
    };
}

export function setSelectedCounty(countyFeature, svg) {
    console.log('🎯 setSelectedCounty called:', countyFeature ? `${countyFeature.properties.County}, ${countyFeature.properties.State}` : 'None');
    
    // Keep for backward compatibility, but primary selection is now via selectedCounties array
    selectedCounty = countyFeature;
    
    const toggleButton = svg.select('.satellite-toggle');
    
    if (toggleButton.empty()) {
        console.error('❌ Satellite toggle button not found!');
        return;
    }
    
    // Enable toggle if ANY counties are selected (check the imported array)
    if ((selectedCounties && selectedCounties.length > 0) || countyFeature) {
        toggleButton
            .style('opacity', 1)
            .style('pointer-events', 'all');
        
        // IMPORTANT: DO NOT automatically hide/show satellite view when selecting new counties
        // Satellite view persists until explicitly toggled off
        
    } else {
        toggleButton
            .style('opacity', 1) // Changed from 0.5 to 1 (no transparency)
            .style('pointer-events', 'none'); // Still disable clicks
        
        if (isSatelliteMode) {
            isSatelliteMode = false;
            
            const toggleCircle = toggleButton.select('circle');
            toggleCircle
                .attr('cx', 12)
                .attr('fill', 'white');
            
            // Also reset the toggle switch background
            const switchGroup = toggleButton.select('g');
            switchGroup.select('rect')
                .attr('fill', '#7f8c8d');
            
            // Reset button background color
            toggleButton.select('rect')
                .attr('fill', '#2c3e50');
        }
    }
}

export function getSatelliteMode() {
    return isSatelliteMode;
}

export function resetSatelliteMode(svg) {
    console.log('🔄 resetSatelliteMode called - clearing ALL satellite views');
    isSatelliteMode = false;
    selectedCounty = null;
    
    // Hide ALL satellite inlays
    hideSatelliteInlay(svg); // No parameter = hide all
    
    const toggleButton = svg.select('.satellite-toggle');
    if (!toggleButton.empty()) {
        toggleButton.style('opacity', 1);
        toggleButton.style('pointer-events', 'none'); // Still disable when no selection
        
        const toggleCircle = toggleButton.select('circle');
        toggleCircle
            .attr('cx', 12)
            .attr('fill', 'white');
        
        // Reset the toggle switch background
        const switchGroup = toggleButton.select('g');
        switchGroup.select('rect')
            .attr('fill', '#7f8c8d');
        
        // Reset button background color
        toggleButton.select('rect')
            .attr('fill', '#2c3e50');
    }
}

export function initializeSatelliteToggle(svg, projection) {
    return createSatelliteToggle(svg, projection);
}

// Helper function to check satellite status
export function hasSatelliteView(fips) {
    return satelliteCounties.has(fips);
}

// Get all counties with satellite view
export function getSatelliteCounties() {
    return Array.from(satelliteCounties);
}