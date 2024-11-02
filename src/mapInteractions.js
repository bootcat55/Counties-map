import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';
import { updateVoteTotals, updateCountyColor, resetCountyVotes, initializeCountyDataArray, countyDataArray } from './voteUpdates.js';
import { recalculateAndDisplayPopularVote } from './popularVote.js';
import { createInfoPane, createUpdatePane, createTooltip, updateInfoPane, updateTooltip, hideTooltip, createResetAllButton, updateSliderPercentages } from './paneSetup.js';
import { createZoomControls } from './zoom.js';
import './statemap.js';

export function initializeMapInteractions() {
    const infoPane = createInfoPane();
    const { updatePane, repSlider, demSlider, otherSlider, submitButton, resetButton } = createUpdatePane();
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
                // Remove highlight from any previously selected county
                svg.selectAll("path").attr("stroke", "none").attr("stroke-width", 0);

                // Highlight the selected county with a white border
                d3.select(this).attr("stroke", "white").attr("stroke-width", 2);

                const totalVotes = d.properties.Republican + d.properties.Democrat + d.properties.OtherVotes;
                const stateTotalPopulation = countyDataArray
                    .filter(county => county.FIPS !== 51515)
                    .reduce((total, county) => total + county.Population, 0);
                const countyType = d.properties.vote_total > 50000 ? 'Urban' : 'Rural';

                updateInfoPane(infoPane, d.properties, stateTotalPopulation, countyType);
                updatePane.style("display", "block");

                repSlider.attr("max", totalVotes).property("value", d.properties.Republican);
                demSlider.attr("max", totalVotes).property("value", d.properties.Democrat);
                otherSlider.attr("max", totalVotes).property("value", d.properties.OtherVotes);

                // Initial update of percentages
                updateSliderPercentages(d.properties.Republican, d.properties.Democrat, d.properties.OtherVotes, totalVotes);

                const updateCountyVoteData = (changedSlider) => {
                    let repVotes = +repSlider.property("value");
                    let demVotes = +demSlider.property("value");
                    let otherVotes = +otherSlider.property("value");
                    let remainingVotes = totalVotes - otherVotes;

                    if (changedSlider === 'repSlider') {
                        if (repVotes > remainingVotes) {
                            repVotes = remainingVotes;
                        }
                        demVotes = remainingVotes - repVotes;
                    } else if (changedSlider === 'demSlider') {
                        if (demVotes > remainingVotes) {
                            demVotes = remainingVotes;
                        }
                        repVotes = remainingVotes - demVotes;
                    } else if (changedSlider === 'otherSlider') {
                        remainingVotes = totalVotes - otherVotes;
                        repVotes = Math.min(repVotes, remainingVotes);
                        demVotes = remainingVotes - repVotes;
                    }

                    // Update slider values
                    repSlider.property("value", repVotes);
                    demSlider.property("value", demVotes);
                    otherSlider.property("value", otherVotes);

                    // Update percentages
                    updateSliderPercentages(repVotes, demVotes, otherVotes, totalVotes);

                    updateVoteTotals(d.properties, repVotes, demVotes, otherVotes);

                    const selectedCountyPath = svg.selectAll("path").filter(f => f.properties.FIPS === d.properties.FIPS);
                    updateCountyColor(selectedCountyPath, d.properties);
                    updateInfoPane(infoPane, d.properties, stateTotalPopulation, countyType);

                    recalculateAndDisplayPopularVote(countyDataArray);
                };

                repSlider.on("input", () => updateCountyVoteData('repSlider'));
                demSlider.on("input", () => updateCountyVoteData('demSlider'));
                otherSlider.on("input", () => updateCountyVoteData('otherSlider'));

                submitButton.on("click", function(e) {
                    e.preventDefault();
                    updateCountyVoteData(null);
                    updatePane.style("display", "none");
                });

                resetButton.on("click", function(e) {
                    e.preventDefault();
                    resetCountyVotes(d.properties);

                    const selectedCountyPath = svg.selectAll("path").filter(f => f.properties.FIPS === d.properties.FIPS);
                    updateCountyColor(selectedCountyPath, d.properties);

                    updateInfoPane(infoPane, d.properties, stateTotalPopulation, countyType);
                    updatePane.style("display", "none");

                    recalculateAndDisplayPopularVote(countyDataArray);
                });
            });

        resetAllButton.on("click", function(e) {
            e.preventDefault();
            filteredGeoData.features.forEach(function(feature) {
                resetCountyVotes(feature.properties);
                const countyPath = svg.selectAll("path").filter(d => d.properties.FIPS === feature.properties.FIPS);
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





