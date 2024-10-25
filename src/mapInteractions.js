import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';
import { drawStackedBarChart } from './stackedBarChart.js'; // Import the stacked bar chart function
import { stateElectoralVotes, calculateElectoralVotes } from './electoralVotes.js'; // Import the electoral votes dataset
import { updateVoteTotals, updateCountyColor, resetCountyVotes } from './voteUpdates.js'; // Import the vote update functions
import { createInfoPane, createUpdatePane, createTooltip } from './paneSetup.js'; // Import pane setup functions
import './statemap.js';

export function initializeMapInteractions(data) {
    // Create the info pane, update pane, and tooltip using paneSetup.js functions
    const infoPane = createInfoPane();
    const { updatePane, repInput, demInput, submitButton, resetButton } = createUpdatePane();
    const tooltip = createTooltip();

    // Create an SVG container
    const width = 1200;
    const height = 900;
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create the reset all button
    const resetAllButton = d3.select("body").append("button")
        .text("Reset All Counties")
        .style("position", "absolute")
        .style("top", "20px")
        .style("left", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f5f5f5");

    // Load GeoJSON for all counties
    json('data/geojson-counties-fips.json').then(geoData => {
        const usFipsCodes = data.map(d => d.FIPS);
        const filteredGeoData = {
            type: "FeatureCollection",
            features: geoData.features.filter(feature => usFipsCodes.includes(+feature.id))
        };

        filteredGeoData.features.forEach(feature => {
            const county = data.find(d => d.FIPS === +feature.id);
            if (county) {
                feature.properties = { ...county };
            }
        });

        const projection = d3.geoAlbersUsa()
            .fitSize([width, height], filteredGeoData);

        const pathGenerator = d3.geoPath().projection(projection);

        const paths = svg.selectAll("path")
            .data(filteredGeoData.features)
            .enter()
            .append("path")
            .attr("d", pathGenerator)
            .attr("fill", d => d.properties.percentage_republican > d.properties.percentage_democrat
                ? d3.interpolateReds(d.properties.percentage_republican / 100)
                : d3.interpolateBlues(d.properties.percentage_democrat / 100))
            .attr("stroke", "#000")
            .on("mouseover", function(event, d) {
                tooltip.style("display", "block")
                    .html(`County: ${d.properties.County}, ${d.properties.State}<br>
                           <strong><span style="color: red;">Republican:</span></strong> ${d.properties.percentage_republican.toFixed(1)}%<br>
                           <strong><span style="color: blue;">Democrat:</span></strong> ${d.properties.percentage_democrat.toFixed(1)}%<br>
                           <strong>Percentage Difference:</strong> ${Math.abs(d.properties.percentage_republican - d.properties.percentage_democrat).toFixed(1)}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function() {
                tooltip.style("display", "none");
            })
            .on("click", function(event, d) {
                const electoralVotes = stateElectoralVotes[d.properties.State] || 'Unknown';
                const stateTotalPopulation = data.filter(county => county.State === d.properties.State)
                    .reduce((total, county) => total + county.Population, 0);

                const stateVotes = data.filter(county => county.State === d.properties.State);
                const totalRepublicanVotes = stateVotes.reduce((total, county) => total + county.Republican, 0);
                const totalDemocratVotes = stateVotes.reduce((total, county) => total + county.Democrat, 0);

                let winner = totalRepublicanVotes > totalDemocratVotes 
                    ? `<span class="winner-republican">Republicans</span> won this state's ${electoralVotes} electoral votes.` 
                    : `<span class="winner-democrat">Democrats</span> won this state's ${electoralVotes} electoral votes.`;

                const countyType = d.properties.vote_total > 50000 ? 'Urban' : 'Rural';

                infoPane.html(`County: ${d.properties.County}, ${d.properties.State}<br>
                               Population: ${d.properties.Population.toLocaleString()}<br>
                               State Total Population: ${stateTotalPopulation.toLocaleString()}<br>
                               <strong>Winner: ${winner}</strong><br>
                               Vote Turnout: ${d.properties.turnout.toFixed(2)}%<br>
                               Electoral Votes: ${electoralVotes}<br>
                               Type: ${countyType}`)
                    .style("display", "block");

                updatePane.style("display", "block");
                repInput.property("value", d.properties.Republican);
                demInput.property("value", d.properties.Democrat);

                submitButton.on("click", function(e) {
                    e.preventDefault();
                    const newRepublicanVotes = +repInput.property("value");
                    const newDemocratVotes = +demInput.property("value");

                    if (!isNaN(newRepublicanVotes) && !isNaN(newDemocratVotes)) {
                        updateVoteTotals(d.properties, newRepublicanVotes, newDemocratVotes);

                        const selectedCountyPath = svg.selectAll("path").filter(function(f) {
                            return f.properties.FIPS === d.properties.FIPS;
                        });
                        updateCountyColor(selectedCountyPath, d.properties);

                        infoPane.html(`County: ${d.properties.County}, ${d.properties.State}<br>
                                       Population: ${d.properties.Population.toLocaleString()}<br>
                                       State Total Population: ${stateTotalPopulation.toLocaleString()}<br>
                                       <strong>Winner: ${winner}</strong><br>
                                       Vote Turnout: ${d.properties.turnout.toFixed(2)}%<br>
                                       Electoral Votes: ${electoralVotes}<br>
                                       Type: ${countyType}`)
                            .style("display", "block");

                        updatePane.style("display", "none");
                    }
                });

                resetButton.on("click", function(e) {
                    e.preventDefault();
                    resetCountyVotes(d.properties);

                    const selectedCountyPath = svg.selectAll("path").filter(function(f) {
                        return f.properties.FIPS === d.properties.FIPS;
                    });
                    updateCountyColor(selectedCountyPath, d.properties);

                    infoPane.html(`County: ${d.properties.County}, ${d.properties.State}<br>
                                   Population: ${d.properties.Population.toLocaleString()}<br>
                                   State Total Population: ${stateTotalPopulation.toLocaleString()}<br>
                                   <strong>Winner: ${winner}</strong><br>
                                   Vote Turnout: ${d.properties.turnout.toFixed(2)}%<br>
                                   Electoral Votes: ${electoralVotes}<br>
                                   Type: ${countyType}`)
                        .style("display", "block");

                    updatePane.style("display", "none");
                });
            });

        resetAllButton.on("click", function(e) {
            e.preventDefault();
            filteredGeoData.features.forEach(function(feature) {
                resetCountyVotes(feature.properties);
                const countyPath = svg.selectAll("path").filter(function(d) {
                    return d.properties.FIPS === feature.properties.FIPS;
                });
                updateCountyColor(countyPath, feature.properties);
            });
        });
    });
}

