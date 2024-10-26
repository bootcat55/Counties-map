import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';
import { drawStackedBarChart } from './stackedBarChart.js';
import { stateElectoralVotes, calculateElectoralVotes } from './electoralVotes.js';
import { updateVoteTotals, updateCountyColor, resetCountyVotes } from './voteUpdates.js';
import { createInfoPane, createUpdatePane, createTooltip, updateInfoPane, updateTooltip, hideTooltip, createResetAllButton } from './paneSetup.js';
import { createZoomControls } from './zoom.js';
import './statemap.js';

export function initializeMapInteractions(data) {
    // Create the info pane, update pane, tooltip, and reset button using paneSetup.js functions
    const infoPane = createInfoPane();
    const { updatePane, repInput, demInput, submitButton, resetButton } = createUpdatePane();
    const tooltip = createTooltip();
    const resetAllButton = createResetAllButton();

    // Create an SVG container
    const width = 1200;
    const height = 900;
    const svg = d3.select("#county-map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Add zoom controls for the map
    createZoomControls(svg, width, height);

    // Load GeoJSON for all counties
    json('data/geojson-counties-fips.json').then(geoData => {
        const usFipsCodes = data.map(d => d.FIPS);
        const filteredGeoData = {
            type: "FeatureCollection",
            features: geoData.features.filter(feature => usFipsCodes.includes(+feature.id))
        };

        // Apply Bedford County's data to Bedford City
        filteredGeoData.features.forEach(feature => {
            if (+feature.id === 51515) { // Bedford City
                const bedfordCountyData = data.find(d => d.FIPS === 51019);
                if (bedfordCountyData) {
                    feature.properties = { ...bedfordCountyData, FIPS: 51515 }; // Bedford City's FIPS with Bedford County's data
                }
            } else {
                const county = data.find(d => d.FIPS === +feature.id);
                if (county) {
                    feature.properties = { ...county };
                }
            }
        });

        const projection = d3.geoAlbersUsa().fitSize([width, height], filteredGeoData);
        const pathGenerator = d3.geoPath().projection(projection);

        const paths = svg.selectAll("path")
            .data(filteredGeoData.features)
            .enter()
            .append("path")
            .attr("d", pathGenerator)
            .attr("fill", d => d.properties.percentage_republican > d.properties.percentage_democrat
                ? d3.interpolateReds(d.properties.percentage_republican / 100)
                : d3.interpolateBlues(d.properties.percentage_democrat / 100))
            .attr("stroke", "none")  // Remove county borders
            .on("mouseover", function(event, d) {
                updateTooltip(tooltip, d, event);
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function() {
                hideTooltip(tooltip);
            })
            .on("click", function(event, d) {
                const electoralVotes = stateElectoralVotes[d.properties.State] || 'Unknown';
                const stateTotalPopulation = data
                    .filter(county => county.FIPS !== 51515) // Exclude Bedford City
                    .reduce((total, county) => total + county.Population, 0);

                const stateVotes = data.filter(county => county.State === d.properties.State && county.FIPS !== 51515);
                const totalRepublicanVotes = stateVotes.reduce((total, county) => total + county.Republican, 0);
                const totalDemocratVotes = stateVotes.reduce((total, county) => total + county.Democrat, 0);

                let winner = totalRepublicanVotes > totalDemocratVotes 
                    ? `<span class="winner-republican">Republicans</span> won this state's ${electoralVotes} electoral votes.` 
                    : `<span class="winner-democrat">Democrats</span> won this state's ${electoralVotes} electoral votes.`;

                const countyType = d.properties.vote_total > 50000 ? 'Urban' : 'Rural';

                updateInfoPane(infoPane, d.properties, stateTotalPopulation, winner, electoralVotes, countyType);

                updatePane.style("display", "block");
                repInput.property("value", d.properties.Republican);
                demInput.property("value", d.properties.Democrat);

                submitButton.on("click", function(e) {
                    e.preventDefault();
                    const newRepublicanVotes = +repInput.property("value");
                    const newDemocratVotes = +demInput.property("value");

                    if (!isNaN(newRepublicanVotes) && !isNaN(newDemocratVotes)) {
                        updateVoteTotals(d.properties, newRepublicanVotes, newDemocratVotes);

                        const selectedCountyPath = svg.selectAll("path").filter(f => f.properties.FIPS === d.properties.FIPS || f.properties.FIPS === 51515);
                        updateCountyColor(selectedCountyPath, d.properties);

                        updateInfoPane(infoPane, d.properties, stateTotalPopulation, winner, electoralVotes, countyType);

                        updatePane.style("display", "none");
                    }
                });

                resetButton.on("click", function(e) {
                    e.preventDefault();
                    resetCountyVotes(d.properties);

                    const selectedCountyPath = svg.selectAll("path").filter(f => f.properties.FIPS === d.properties.FIPS || f.properties.FIPS === 51515);
                    updateCountyColor(selectedCountyPath, d.properties);

                    updateInfoPane(infoPane, d.properties, stateTotalPopulation, winner, electoralVotes, countyType);

                    updatePane.style("display", "none");
                });
            });

        resetAllButton.on("click", function(e) {
            e.preventDefault();
            filteredGeoData.features.forEach(function(feature) {
                resetCountyVotes(feature.properties);
                const countyPath = svg.selectAll("path").filter(d => d.properties.FIPS === feature.properties.FIPS);
                updateCountyColor(countyPath, feature.properties);
            });
        });
    });
}
