import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';
import { drawStackedBarChart } from './stackedBarChart.js';
import { stateElectoralVotes, calculateElectoralVotes } from './electoralVotes.js';
import { updateVoteTotals, updateCountyColor, resetCountyVotes } from './voteUpdates.js';
import { createInfoPane, createUpdatePane, createTooltip, updateInfoPane, updateTooltip, hideTooltip, createResetAllButton } from './paneSetup.js';
import { createZoomControls } from './zoom.js';
import './statemap.js';
import { calculatePopularVote, displayPopularVote } from './popularVote.js';

export function initializeMapInteractions(data) {
    const infoPane = createInfoPane();
    const { updatePane, repInput, demInput, otherInput, submitButton, resetButton } = createUpdatePane();
    const tooltip = createTooltip();
    const resetAllButton = createResetAllButton();

    const width = 1200;
    const height = 900;
    const svg = d3.select("#county-map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    createZoomControls(svg, width, height);

    json('data/geojson-counties-fips.json').then(geoData => {
        const usFipsCodes = data.map(d => d.FIPS);
        const filteredGeoData = {
            type: "FeatureCollection",
            features: geoData.features.filter(feature => usFipsCodes.includes(+feature.id))
        };

        filteredGeoData.features.forEach(feature => {
            if (+feature.id === 51515) {
                const bedfordCountyData = data.find(d => d.FIPS === 51019);
                if (bedfordCountyData) {
                    feature.properties = { ...bedfordCountyData, FIPS: 51515 };
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
            .attr("stroke", "none")
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
                const stateTotalPopulation = data
                    .filter(county => county.FIPS !== 51515)
                    .reduce((total, county) => total + county.Population, 0);

                const countyType = d.properties.vote_total > 50000 ? 'Urban' : 'Rural';

                updateInfoPane(infoPane, d.properties, stateTotalPopulation, countyType);

                updatePane.style("display", "block");
                repInput.property("value", d.properties.Republican);
                demInput.property("value", d.properties.Democrat);
                otherInput.property("value", d.properties.OtherVotes);

                submitButton.on("click", function(e) {
                    e.preventDefault();
                    const newRepublicanVotes = +repInput.property("value");
                    const newDemocratVotes = +demInput.property("value");
                    const newOtherVotes = +otherInput.property("value");

                    if (!isNaN(newRepublicanVotes) && !isNaN(newDemocratVotes) && !isNaN(newOtherVotes)) {
                        updateVoteTotals(d.properties, newRepublicanVotes, newDemocratVotes, newOtherVotes);

                        const selectedCountyPath = svg.selectAll("path").filter(f => f.properties.FIPS === d.properties.FIPS || f.properties.FIPS === 51515);
                        updateCountyColor(selectedCountyPath, d.properties);

                        updateInfoPane(infoPane, d.properties, stateTotalPopulation, countyType);

                        updatePane.style("display", "none");
                    }
                });

                resetButton.on("click", function(e) {
                    e.preventDefault();
                    resetCountyVotes(d.properties);

                    const selectedCountyPath = svg.selectAll("path").filter(f => f.properties.FIPS === d.properties.FIPS || f.properties.FIPS === 51515);
                    updateCountyColor(selectedCountyPath, d.properties);

                    updateInfoPane(infoPane, d.properties, stateTotalPopulation, countyType);

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

// Load vote data and calculate initial popular vote by party
d3.csv('data/usacounty_votes.csv').then(data => {
    data.forEach(d => {
        d.Republican = +d.Republican;
        d.Democrat = +d.Democrat;
        d.OtherVotes = +d['Other Votes'];
    });

    const popularVoteResults = calculatePopularVote(data);
    displayPopularVote(popularVoteResults);
});
