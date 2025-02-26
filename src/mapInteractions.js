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
import { createStateMap, updateStateColors } from './statemap.js'; // Import updateStateColors

// Constants
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

    setupMouseEvents(interactionLayer, tooltip, updatePane, sliders, buttons, svg, infoPane, projection);
};

// Main function to initialize map interactions
export function initializeMapInteractions() {
    const infoPane = d3.select("#info-container");
    const updateContainer = d3.select("#update-container");

    // Clear existing panes to avoid duplication
    infoPane.html("");
    updateContainer.html("");

    const infoPaneElement = createInfoPane();
    const { updatePane, repSlider, demSlider, otherSlider, submitButton, resetButton } = createUpdatePane();
    const tooltip = createTooltip();
    const resetAllButton = createResetAllButton();

    const sliders = { repSlider, demSlider, otherSlider };
    const buttons = { submitButton, resetButton };

    const svg = d3.select("#county-map")
        .html("") // Clear existing SVG to ensure a fresh map
        .append("svg")
        .attr("width", MAP_WIDTH)
        .attr("height", MAP_HEIGHT);

    createZoomControls(svg, MAP_WIDTH, MAP_HEIGHT);

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
                // Assign Bedford City's properties from Bedford County
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

        // Render county map paths
        renderMap(svg, filteredGeoData, pathGenerator);

        // Set up interactions
        setupInteractions(svg, filteredGeoData, tooltip, updatePane, sliders, buttons, infoPaneElement, projection);

        // Load and render state borders
        json('data/states-10m.json').then(stateData => {
            const states = feature(stateData, stateData.objects.states);

            svg.append("g")
                .attr("class", "state-borders")
                .selectAll("path")
                .data(states.features)
                .enter()
                .append("path")
                .attr("d", pathGenerator)
                .attr("fill", "none") // No fill for state borders
                .attr("stroke", "#000") // Black stroke for state borders
                .attr("stroke-width", 1.5) // Thicker stroke for visibility
                .attr("pointer-events", "none"); // Ensure no interaction interference
        });

        // Reset all counties on button click
        resetAllButton.on("click", function (e) {
            e.preventDefault();
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
        // Update county data with the new CSV
        initializeCountyDataArray(data);

        // Recalculate and display updated popular vote
        recalculateAndDisplayPopularVote(data);

        // Refresh map interactions
        initializeMapInteractions();

        // Reinitialize the state map with the new dataset
        createStateMap(filePath);
    });
});