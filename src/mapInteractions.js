import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';
import { drawStackedBarChart } from './stackedBarChart.js'; // Import the stacked bar chart function
import { stateElectoralVotes, calculateElectoralVotes } from './electoralVotes.js'; // Import the electoral votes dataset
import { updateVoteTotals, updateCountyColor, resetCountyVotes } from './voteUpdates.js'; // Import the vote update functions
import './statemap.js';

export function initializeMapInteractions(data) {
    // Create an SVG container
    const width = 1200;
    const height = 900;
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create an information pane for county details (top-right)
    const infoPane = d3.select("#info-container")
        .attr("class", "info-pane")
        .style("position", "absolute")
        .style("top", "20px")
        .style("right", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f9f9f9")
        .style("display", "none");

    // Create an update pane for inputting new vote totals (bottom-right)
    const updatePane = d3.select("#update-container")
        .attr("class", "update-pane")
        .style("position", "absolute")
        .style("bottom", "20px")
        .style("right", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f0f0f0")
        .style("display", "none");

    // Form fields for entering new votes
    const updateForm = updatePane.append("form");
    updateForm.append("label").text("New Republican Votes: ");
    const repInput = updateForm.append("input")
        .attr("type", "number")
        .attr("id", "republicanVotes");
    updateForm.append("br");
    updateForm.append("label").text("New Democrat Votes: ");
    const demInput = updateForm.append("input")
        .attr("type", "number")
        .attr("id", "democratVotes");
    updateForm.append("br");
    const submitButton = updateForm.append("button")
        .text("Update Votes");

    // Add the reset button to the update form (for a single county)
    const resetButton = updateForm.append("button")
        .text("Reset County")
        .style("margin-left", "10px");

    // Add a reset button to reset all counties
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
        // Filter GeoJSON to include only US counties using the FIPS codes
        const usFipsCodes = data.map(d => d.FIPS);
        const filteredGeoData = {
            type: "FeatureCollection",
            features: geoData.features.filter(feature => usFipsCodes.includes(+feature.id))
        };

        // Merge the CSV data with filtered GeoJSON
        filteredGeoData.features.forEach(feature => {
            const county = data.find(d => d.FIPS === +feature.id);
            if (county) {
                // Store CSV properties in the GeoJSON feature's properties
                feature.properties = {
                    ...county // Spread CSV properties into GeoJSON properties
                };
            }
        });

        // Create a projection and path generator
        const projection = d3.geoAlbersUsa()
            .fitSize([width, height], filteredGeoData);

        const pathGenerator = d3.geoPath().projection(projection);

        // Tooltip div
        const tooltip = d3.select("#tooltip-container")
            .attr("class", "tooltip")
            .style("display", "none");

        // Draw the map
        const paths = svg.selectAll("path")
            .data(filteredGeoData.features)
            .enter()
            .append("path")
            .attr("d", pathGenerator)
            .attr("fill", d => {
                return d.properties.percentage_republican > d.properties.percentage_democrat
                    ? d3.interpolateReds(d.properties.percentage_republican / 100)
                    : d3.interpolateBlues(d.properties.percentage_democrat / 100);
            })
            .attr("stroke", "#000")
            .on("mouseover", function(event, d) {
                // Show Republican and Democrat percentages
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
