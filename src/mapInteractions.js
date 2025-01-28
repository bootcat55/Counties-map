import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';
import { countyDataArray, resetCountyVotes, updateCountyColor, initializeCountyDataArray, updateStateVotes } from './voteManager.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import { createInfoPane, createUpdatePane, createTooltip, createResetAllButton } from './paneSetup.js';
import { createZoomControls } from './zoom.js';
import { setupMouseEvents } from './mouseEvents.js';
import { readCsvFile } from './index.js';
import { createStateMap } from './statemap.js';

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

    const width = 1200;
    const height = 900;
    const svg = d3.select("#county-map")
        .html("") // Clear existing SVG to ensure a fresh map
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    createZoomControls(svg, width, height);

    json('data/geojson-counties-fips.json').then(geoData => {
        const bedfordCityFIPS = 51515;
        const bedfordCountyFIPS = 51019;

        const filteredGeoData = {
            type: "FeatureCollection",
            features: geoData.features.filter(feature => {
                return countyDataArray.some(d => d.FIPS === +feature.id);
            })
        };

        filteredGeoData.features.forEach(feature => {
            const countyData = countyDataArray.find(d => d.FIPS === +feature.id);

            if (+feature.id === bedfordCityFIPS) {
                // Assign Bedford City's properties from Bedford County
                const bedfordCountyData = countyDataArray.find(d => d.FIPS === bedfordCountyFIPS);
                if (bedfordCountyData) {
                    feature.properties = { ...bedfordCountyData };
                }
            } else if (countyData) {
                feature.properties = { ...countyData };
            }
        });

        const projection = d3.geoAlbersUsa().fitSize([width, height], filteredGeoData);
        const pathGenerator = d3.geoPath().projection(projection);

        // Render map paths
        svg.selectAll("path.map-layer")
            .data(filteredGeoData.features)
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

        // Add interaction layer
        const interactionLayer = svg.append("g").attr("class", "interaction-layer");

        interactionLayer.selectAll("path")
            .data(filteredGeoData.features)
            .enter()
            .append("path")
            .attr("class", "interaction-layer")
            .attr("d", pathGenerator)
            .attr("fill", "transparent");

        // Setup mouse events
        setupMouseEvents(interactionLayer, tooltip, updatePane, sliders, buttons, svg, infoPaneElement, projection);

        resetAllButton.on("click", function (e) {
            e.preventDefault();
            filteredGeoData.features.forEach(function (feature) {
                resetCountyVotes(feature.properties);
                const countyPath = svg.selectAll("path.map-layer").filter(d => d.properties.FIPS === feature.properties.FIPS);
                updateCountyColor(countyPath, feature.properties);
            });

            recalculateAndDisplayPopularVote(countyDataArray);
        });
    });
}

const dataYearSelector = document.getElementById('data-year-selector');

dataYearSelector.addEventListener('change', (event) => {
    const selectedYear = event.target.value;

    const filePath = selectedYear === '2024' 
        ? 'data/2024county_votes.csv' 
        : 'data/usacounty_votes.csv';

    readCsvFile(filePath, (data) => {
        // Update county data with the new CSV
        initializeCountyDataArray(data);

        // Recalculate and display updated popular vote
        recalculateAndDisplayPopularVote(data);

        // Refresh map interactions
        initializeMapInteractions();
    });
});
