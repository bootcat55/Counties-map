import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';
import { feature } from 'topojson-client';
import { countyDataArray, resetCountyVotes, updateCountyColor, initializeCountyDataArray, updateStateVotes } from './voteManager.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import { createInfoPane, createUpdatePane, createTooltip, createResetAllButton } from './paneSetup.js';
import { createZoomControls } from './zoom.js';
import { setupMouseEvents } from './mouseEvents.js';
import { readCsvFile } from './index.js';
import { createStateMap, updateStateColors } from './statemap.js';
import { initializeSatelliteToggle, setSelectedCounty, resetSatelliteMode } from './geoMap.js';
import { stateColorToggle } from './statemap.js'; // ADD THIS LINE

const BEDFORD_CITY_FIPS = 51515;
const BEDFORD_COUNTY_FIPS = 51019;
const MAP_WIDTH = 1200;
const MAP_HEIGHT = 900;

// Helper function to render the map
const renderMap = (svg, geoData, pathGenerator) => {
    svg.selectAll("path.map-layer")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("class", "map-layer")
        .attr("d", pathGenerator)
        .attr("fill", d => {
            const properties = d.properties || {};
            const repPercentage = properties.percentage_republican ?? 0;
            const demPercentage = properties.percentage_democrat ?? 0;

            if (repPercentage > demPercentage) {
                return d3.interpolateReds(repPercentage / 100);
            } else if (demPercentage > repPercentage) {
                return d3.interpolateBlues(demPercentage / 100);
            } else {
                return "#ccc"; // Default for no data or ties
            }
        });
};

// Helper function to set up interactions
const setupInteractions = (svg, geoData, tooltip, updatePane, sliders, buttons, infoPane, projection) => {
    const interactionLayer = svg.append("g").attr("class", "interaction-layer");

    interactionLayer.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("class", "interaction-layer")
        .attr("d", d3.geoPath().projection(projection))
        .attr("fill", "transparent");

    setupMouseEvents(interactionLayer, tooltip, updatePane, sliders, buttons, svg, infoPane, projection, geoData);
};

// Function to create county search
function createCountySearch(svg, geoData, projection, zoom) {
    const searchGroup = svg.append("g")
        .attr("class", "county-search")
        .attr("transform", `translate(${MAP_WIDTH - 250}, 10)`);

    // Search background
    searchGroup.append("rect")
        .attr("width", 240)
        .attr("height", 32)
        .attr("fill", "white")
        .attr("stroke", "#ccc")
        .attr("stroke-width", 1)
        .attr("rx", 4)
        .attr("ry", 4);

    // Search input
    const foreignObject = searchGroup.append("foreignObject")
        .attr("width", 200)
        .attr("height", 30)
        .attr("x", 10)
        .attr("y", 1);

    const searchDiv = foreignObject.append("xhtml:div")
        .style("width", "100%")
        .style("height", "100%");

    const searchInput = searchDiv.append("xhtml:input")
        .attr("type", "text")
        .attr("placeholder", "Search county, state (e.g., Cook, IL)")
        .style("width", "100%")
        .style("height", "100%")
        .style("border", "none")
        .style("outline", "none")
        .style("padding", "0 8px")
        .style("font-size", "14px")
        .on("input", function() {
            const query = this.value.toLowerCase().trim();
            clearSearchResults();
            
            if (query.length > 0) {
                const results = searchCounties(query, geoData);
                showSearchResults(results, svg, projection, zoom);
            }
        });

    // Search icon
    searchGroup.append("text")
        .attr("x", 220)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("fill", "#666")
        .attr("font-size", "14px")
        .text("🔍");

    // Results container
    const resultsGroup = svg.append("g")
        .attr("class", "search-results")
        .attr("transform", `translate(${MAP_WIDTH - 250}, 45)`)
        .style("display", "none");

    // Function to search counties
    function searchCounties(query, geoData) {
        const results = [];
        const queryParts = query.split(',').map(part => part.trim().toLowerCase());
        const countyQuery = queryParts[0] || '';
        const stateQuery = queryParts[1] || '';

        geoData.features.forEach(feature => {
            const countyName = (feature.properties?.County || '').toLowerCase();
            const stateName = (feature.properties?.State || '').toLowerCase();
            
            let matches = false;
            
            if (stateQuery) {
                matches = countyName.includes(countyQuery) && stateName.includes(stateQuery);
            } else {
                matches = countyName.includes(countyQuery);
            }
            
            if (matches) {
                results.push({
                    feature: feature,
                    county: feature.properties?.County || '',
                    state: feature.properties?.State || '',
                    fips: feature.properties?.FIPS || ''
                });
            }
        });

        return results.sort((a, b) => {
            if (a.state === b.state) return a.county.localeCompare(b.county);
            return a.state.localeCompare(b.state);
        }).slice(0, 10);
    }

    // Function to show search results
    function showSearchResults(results, svg, projection, zoom) {
        clearSearchResults();
        
        if (results.length === 0) return;

        const resultsGroup = svg.select(".search-results");
        resultsGroup.style("display", "block");

        // Results background
        resultsGroup.append("rect")
            .attr("width", 240)
            .attr("height", results.length * 28 + 10)
            .attr("fill", "white")
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1)
            .attr("rx", 4)
            .attr("ry", 4)
            .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

        // Add results
        results.forEach((result, index) => {
            const resultGroup = resultsGroup.append("g")
                .attr("transform", `translate(10, ${index * 28 + 10})`)
                .style("cursor", "pointer");

            resultGroup.append("rect")
                .attr("width", 220)
                .attr("height", 24)
                .attr("fill", "transparent")
                .on("mouseover", function() { d3.select(this).attr("fill", "#f0f0f0"); })
                .on("mouseout", function() { d3.select(this).attr("fill", "transparent"); })
                .on("click", function() {
                    zoomToCounty(result.feature, svg, projection, zoom);
                    searchInput.node().value = `${result.county}, ${result.state}`;
                    clearSearchResults();
                });

            resultGroup.append("text")
                .attr("x", 5)
                .attr('y', 16)
                .attr("fill", "#333")
                .attr("font-size", "12px")
                .text(`${result.county}, ${result.state}`);
        });

        // Close button
        const closeGroup = resultsGroup.append("g")
            .attr("transform", `translate(220, 5)`)
            .style("cursor", "pointer");

        closeGroup.append("circle")
            .attr("r", 8)
            .attr("fill", "#f0f0f0")
            .on("mouseover", function() { d3.select(this).attr("fill", "#e0e0e0"); })
            .on("mouseout", function() { d3.select(this).attr("fill", "#f0f0f0"); })
            .on("click", clearSearchResults);

        closeGroup.append("text")
            .attr("x", 0)
            .attr("y", 3)
            .attr("text-anchor", "middle")
            .attr("fill", "#666")
            .attr("font-size", "10px")
            .text("×");
    }

    // Function to clear search results
    function clearSearchResults() {
        const resultsGroup = svg.select(".search-results");
        resultsGroup.selectAll("*").remove();
        resultsGroup.style("display", "none");
    }

    // Function to zoom to a county with 25% extra zoom
    function zoomToCounty(feature, svg, projection, zoom) {
        const pathGenerator = d3.geoPath().projection(projection);
        const bounds = pathGenerator.bounds(feature);
        
        if (!bounds || bounds[0][0] === Infinity) return;

        // Calculate the bounding box
        const [[x0, y0], [x1, y1]] = bounds;
        const dx = x1 - x0;
        const dy = y1 - y0;
        const x = (x0 + x1) / 2;
        const y = (y0 + y1) / 2;
        
        // Calculate scale to fit county with 25% extra zoom (1.125 = 0.9 * 1.25)
        const padding = 50;
        const scale = Math.min(
            0.9 / Math.max(dx / (MAP_WIDTH - padding * 2), dy / (MAP_HEIGHT - padding * 2)),
            100  // Maximum zoom limit
        );
        
        // Calculate translation
        const translate = [
            MAP_WIDTH / 2 - scale * x,
            MAP_HEIGHT / 2 - scale * y
        ];
        
        // Create and apply transform
        const transform = d3.zoomIdentity
            .translate(translate[0], translate[1])
            .scale(scale);
        
        svg.transition()
            .duration(750)
            .call(zoom.transform, transform);
    }

    // Clear results when clicking outside
    svg.on("click", function(event) {
        const searchGroup = svg.select(".county-search");
        const resultsGroup = svg.select(".search-results");
        
        if (!searchGroup.node().contains(event.target) && 
            !resultsGroup.node().contains(event.target)) {
            clearSearchResults();
        }
    });
}

// Main function to initialize map interactions
export function initializeMapInteractions() {
    const infoPane = d3.select("#info-container");
    const updateContainer = d3.select("#update-container");

    infoPane.html("");
    updateContainer.html("");

    const infoPaneElement = createInfoPane();
    const { updatePane, repSlider, demSlider, otherSlider, submitButton, resetButton } = createUpdatePane();
    const tooltip = createTooltip();
    const resetAllButton = createResetAllButton();

    const sliders = { repSlider, demSlider, otherSlider };
    const buttons = { submitButton, resetButton };

    const svg = d3.select("#county-map")
        .html("")
        .append("svg")
        .attr("width", MAP_WIDTH)
        .attr("height", MAP_HEIGHT);

    // Create zoom group and get zoom instance
    const zoomGroup = svg.append("g").attr("class", "zoom-group");
    const zoom = createZoomControls(svg, MAP_WIDTH, MAP_HEIGHT);

    // Load county data
    json('data/geojson-counties-fips.json').then(geoData => {
        const filteredGeoData = {
            type: "FeatureCollection",
            features: geoData.features.filter(feature => {
                return countyDataArray.some(d => d.FIPS === +feature.id);
            })
        };

        filteredGeoData.features.forEach(feature => {
            const countyData = countyDataArray.find(d => d.FIPS === +feature.id);

            if (+feature.id === BEDFORD_CITY_FIPS) {
                const bedfordCountyData = countyDataArray.find(d => d.FIPS === BEDFORD_COUNTY_FIPS);
                if (bedfordCountyData) {
                    feature.properties = { ...bedfordCountyData };
                }
            } else if (countyData) {
                feature.properties = { ...countyData };
            }
        });

        const projection = d3.geoAlbersUsa().fitSize([MAP_WIDTH, MAP_HEIGHT], filteredGeoData);
        const pathGenerator = d3.geoPath().projection(projection);

        renderMap(zoomGroup, filteredGeoData, pathGenerator);
        
        // FIXED: Initialize satellite toggle BEFORE setting up interactions
        initializeSatelliteToggle(svg, projection);
        
        createCountySearch(svg, filteredGeoData, projection, zoom);
        
        // FIXED: Setup interactions AFTER toggle is created
        setupInteractions(zoomGroup, filteredGeoData, tooltip, updatePane, sliders, buttons, infoPaneElement, projection);

        // Load state borders
        json('data/states-10m.json').then(stateData => {
            const states = feature(stateData, stateData.objects.states);

            zoomGroup.append("g")
                .attr("class", "state-borders")
                .selectAll("path")
                .data(states.features)
                .enter()
                .append("path")
                .attr("d", pathGenerator)
                .attr("fill", "none")
                .attr("stroke", "#000")
                .attr("stroke-width", 1.5)
                .attr("vector-effect", "non-scaling-stroke") // ADD THIS LINE
                .attr("pointer-events", "none");
        });

        // Reset all counties
        resetAllButton.on("click", function (e) {
            e.preventDefault();
            // Reset satellite mode first
            resetSatelliteMode(svg);
            
            // Reset county votes
            filteredGeoData.features.forEach(feature => {
                resetCountyVotes(feature.properties);
                const countyPath = svg.selectAll("path.map-layer").filter(d => d.properties.FIPS === feature.properties.FIPS);
                updateCountyColor(countyPath, feature.properties);
            });
            recalculateAndDisplayPopularVote(countyDataArray);
        });
    });
}

// Handle data year change
const dataYearSelector = document.getElementById('data-year-selector');

dataYearSelector.addEventListener('change', (event) => {
    const selectedYear = event.target.value;

    const filePath = selectedYear === '2024' 
        ? 'data/2024county_votes.csv' 
        : selectedYear === '2016' 
        ? 'data/2016county_votes.csv' 
        : 'data/usacounty_votes.csv';

    readCsvFile(filePath, (data) => {
        // CLEAR STATE OVERRIDES when loading new data
        stateColorToggle.clear();
        
        // Notify stacked bar chart about data change
        document.dispatchEvent(new CustomEvent('dataYearChanged'));
        
        initializeCountyDataArray(data);
        recalculateAndDisplayPopularVote(data);
        initializeMapInteractions();
        createStateMap(filePath);
    });
});