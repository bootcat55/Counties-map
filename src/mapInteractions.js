import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';
import { initializeCountyDataArray, countyDataArray } from './voteManager.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import { createInfoPane, createUpdatePane, createTooltip, createResetAllButton } from './paneSetup.js';
import { createZoomControls } from './zoom.js';
import { setupMouseEvents } from './mouseEvents.js';
import { resetCountyVotes, updateCountyColor } from './voteManager.js';
import { setupSliders } from './sliderHandler.js';

export function initializeMapInteractions() {
    const infoPane = createInfoPane();
    const { updatePane, repSlider, demSlider, otherSlider, submitButton, resetButton } = createUpdatePane();
    const tooltip = createTooltip();
    const resetAllButton = createResetAllButton();

    const sliders = { repSlider, demSlider, otherSlider };
    const buttons = { submitButton, resetButton };

    const width = 1200;
    const height = 900;
    const svg = d3.select("#county-map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    createZoomControls(svg, width, height);

    json('data/geojson-counties-fips.json').then(geoData => {
        const usFipsCodes = countyDataArray.map(d => d.FIPS);
        const filteredGeoData = {
            type: "FeatureCollection",
            features: geoData.features.filter(feature => usFipsCodes.includes(+feature.id))
        };

        filteredGeoData.features.forEach(feature => {
            const countyData = countyDataArray.find(d => d.FIPS === +feature.id);
            if (countyData) {
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
            .attr("fill", d => d.properties.percentage_republican > d.properties.percentage_democrat
                ? d3.interpolateReds(d.properties.percentage_republican / 100)
                : d3.interpolateBlues(d.properties.percentage_democrat / 100))
            .attr("stroke", "none");

        // Add interaction layer
        const interactionLayer = svg.append("g").attr("class", "interaction-layer");

        interactionLayer.selectAll("path")
            .data(filteredGeoData.features)
            .enter()
            .append("path")
            .attr("class", "interaction-layer")
            .attr("d", pathGenerator)
            .attr("fill", "transparent");

        // Setup mouse events and sliders
        setupMouseEvents(interactionLayer, tooltip, updatePane, sliders, buttons, svg, infoPane, projection);

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

d3.csv('data/usacounty_votes.csv').then(data => {
    data.forEach(d => {
        d.Republican = +d.Republican;
        d.Democrat = +d.Democrat;
        d.OtherVotes = +d['Other Votes'];
    });

    initializeCountyDataArray(data);
    recalculateAndDisplayPopularVote(countyDataArray);
});
