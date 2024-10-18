import './styles.css';
import * as d3 from 'd3';
import { json } from 'd3-fetch';

// Function to read the CSV file
function readCsvFile(url, callback) {
    d3.csv(url).then(data => {
        // Parse numeric values and ensure all properties are correctly defined
        data.forEach(d => {
            d.FIPS = +d.FIPS;
            d.County = d.County ? d.County.trim() : 'Unknown'; // Trim any spaces from the County name
            d.State = d.State ? d.State.trim() : 'Unknown';     // Trim any spaces from the State label
            d.Republican = +d.Republican || 0;
            d.Democrat = +d.Democrat || 0;
            d.Population = +d.Population || 0;
            d.vote_total = d.Republican + d.Democrat;
            d.percentage_republican = (d.Republican / d.vote_total) * 100 || 0;
            d.percentage_democrat = (d.Democrat / d.vote_total) * 100 || 0;
            d.turnout = ((d.Population - d.vote_total) / d.Population) * 100 || 0;

            // Store the original votes so we can reset later
            d.originalVotes = {
                Republican: d.Republican,
                Democrat: d.Democrat
            };
        });
        callback(data);
    });
}

//USER ADDITION
//Function to calculate total votes for Republicans and Democrats in the same state
function calculateStateVotes(selectedCounty, data) {
    const stateVotes = data.filter(county => county.State === selectedCounty.State);

    const totalRepublicanVotes = stateVotes.reduce((total, county) => total + county.Republican, 0);
    const totalDemocratVotes = stateVotes.reduce((total, county) => total + county.Democrat, 0);
    
    // Get the electoral votes for the state
    const electoralVotes = stateElectoralVotes[selectedCounty.State] || 0;

    // Determine which party won
    if (totalRepublicanVotes > totalDemocratVotes) {
        console.log(`Republicans won this state with ${totalRepublicanVotes} votes and ${electoralVotes} electoral votes.`);
    } else if (totalDemocratVotes > totalRepublicanVotes) {
        console.log(`Democrats won this state with ${totalDemocratVotes} votes and ${electoralVotes} electoral votes.`);
    } else {
        console.log(`It's a tie with ${totalRepublicanVotes} Republican votes and ${totalDemocratVotes} Democrat votes. Electoral votes: ${electoralVotes}`);
    }
}
//END USER ADDITION

// Dataset of state abbreviations and electoral votes
const stateElectoralVotes = {
    'AL': 9, 'AK': 3, 'AZ': 11, 'AR': 6, 'CA': 54, 'CO': 10, 'CT': 7,
    'DE': 3, 'FL': 30, 'GA': 16, 'HI': 4, 'ID': 4, 'IL': 19, 'IN': 11,
    'IA': 6, 'KS': 6, 'KY': 8, 'LA': 8, 'ME': 4, 'MD': 10, 'MA': 11,
    'MI': 15, 'MN': 10, 'MS': 6, 'MO': 10, 'MT': 4, 'NE': 5, 'NV': 6,
    'NH': 4, 'NJ': 14, 'NM': 5, 'NY': 28, 'NC': 16, 'ND': 3, 'OH': 17,
    'OK': 7, 'OR': 8, 'PA': 19, 'RI': 4, 'SC': 9, 'SD': 3, 'TN': 11,
    'TX': 40, 'UT': 6, 'VT': 3, 'VA': 13, 'WA': 12, 'WV': 4, 'WI': 10, 
    'WY': 3, 'DC': 3
};

// Function to update the vote totals of a clicked county
function updateVoteTotals(county, newRepublicanVotes, newDemocratVotes) {
    county.Republican = newRepublicanVotes;
    county.Democrat = newDemocratVotes;
    county.vote_total = county.Republican + county.Democrat;
    county.percentage_republican = (county.Republican / county.vote_total) * 100;
    county.percentage_democrat = (county.Democrat / county.vote_total) * 100;
}

// Function to update the map color based on the vote percentages
function updateCountyColor(path, county) {
    if (county.percentage_republican > county.percentage_democrat) {
        path.attr("fill", d3.interpolateReds(county.percentage_republican / 100));
    } else {
        path.attr("fill", d3.interpolateBlues(county.percentage_democrat / 100));
    }
}

// Function to reset a county's votes and color to original values
function resetCountyVotes(county) {
    county.Republican = county.originalVotes.Republican;
    county.Democrat = county.originalVotes.Democrat;
    county.vote_total = county.Republican + county.Democrat;
    county.percentage_republican = (county.Republican / county.vote_total) * 100;
    county.percentage_democrat = (county.Democrat / county.vote_total) * 100;
}

// Load the CSV data
readCsvFile('data/delaware_votes.csv', data => {
    console.log("CSV Data:", data);

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
        // Filter GeoJSON to include only Delaware counties using the FIPS codes
        const delawareFipsCodes = data.map(d => d.FIPS);
        const filteredGeoData = {
            type: "FeatureCollection",
            features: geoData.features.filter(feature => delawareFipsCodes.includes(+feature.id))
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

                 // Fetch the state's electoral votes from the dataset
                const electoralVotes = stateElectoralVotes[d.properties.State] || 'Unknown';

                // Calculate total population for the state
                const stateTotalPopulation = data
                    .filter(county => county.State === d.properties.State)
                    .reduce((total, county) => total + county.Population, 0);

                // Calculate total votes for Republicans and Democrats in the state
                const stateVotes = data.filter(county => county.State === d.properties.State);
                const totalRepublicanVotes = stateVotes.reduce((total, county) => total + county.Republican, 0);
                const totalDemocratVotes = stateVotes.reduce((total, county) => total + county.Democrat, 0);

                // Determine the winner
                let winner = '';
                if (totalRepublicanVotes > totalDemocratVotes) {
                    winner = `<span class="winner-republican">Republicans</span> won this state's ${electoralVotes} electoral votes.`;
                } else if (totalDemocratVotes > totalRepublicanVotes) {
                    winner = `<span class="winner-democrat">Democrats</span> won this state's ${electoralVotes} electoral votes.`;
                } else {
                    winner = `It's too close to call, with the state's ${electoralVotes} electoral votes undecided.`;
                }

                // Determine rural or urban classification
                const countyType = d.properties.vote_total > 50000 ? 'Urban' : 'Rural';

                // Update top-right info pane with county details
                infoPane.html(`County: ${d.properties.County}, ${d.properties.State}<br>
                               Population: ${d.properties.Population.toLocaleString()}<br>
                               State Total Population: ${stateTotalPopulation.toLocaleString()}<br>
                               <strong>Winner: ${winner}</strong><br>
                               Vote Turnout: ${d.properties.turnout.toFixed(2)}%<br>
                               Electoral Votes: ${electoralVotes}<br>
                               Type: ${countyType}`)
                    .style("display", "block");

                // Show update form and autofill with current vote totals
                updatePane.style("display", "block");
                repInput.property("value", d.properties.Republican);
                demInput.property("value", d.properties.Democrat);

                // Update button logic
                submitButton.on("click", function(e) {
                    e.preventDefault();
                    const newRepublicanVotes = +repInput.property("value");
                    const newDemocratVotes = +demInput.property("value");

                    if (!isNaN(newRepublicanVotes) && !isNaN(newDemocratVotes)) {
                        updateVoteTotals(d.properties, newRepublicanVotes, newDemocratVotes);

                        const selectedCountyPath = svg.selectAll("path").filter(function (f) {
                            return f.properties.FIPS === d.properties.FIPS;
                        });
                        updateCountyColor(selectedCountyPath, d.properties);

                        // Update info pane after votes have been updated
                        infoPane.html(`County: ${d.properties.County}, ${d.properties.State}<br>
                                       Population: ${d.properties.Population.toLocaleString()}<br>
                                       Vote Turnout: ${d.properties.turnout.toFixed(2)}%<br>
                                       Type: ${countyType}`)
                            .style("display", "block");

                        // Hide update pane after updating
                        updatePane.style("display", "none");
                    }
                });

                // Reset button logic to restore the original votes
                resetButton.on("click", function(e) {
                    e.preventDefault();

                    // Reset to original votes stored in 'originalVotes'
                    resetCountyVotes(d.properties);

                    // Update the color of the county on the map
                    const selectedCountyPath = svg.selectAll("path").filter(function (f) {
                        return f.properties.FIPS === d.properties.FIPS;
                    });
                    updateCountyColor(selectedCountyPath, d.properties);

                    // Reset the info pane with the original totals
                    infoPane.html(`County: ${d.properties.County}, ${d.properties.State}<br>
                                   Population: ${d.properties.Population.toLocaleString()}<br>
                                   Vote Turnout: ${d.properties.turnout.toFixed(2)}%<br>
                                   Type: ${countyType}`)
                        .style("display", "block");

                    // Hide update pane after resetting
                    updatePane.style("display", "none");
                });
            });
        
        // Reset All Counties button logic
        resetAllButton.on("click", function(e) {
            e.preventDefault();
            // Reset votes and color for all counties
            filteredGeoData.features.forEach(function(feature) {
                resetCountyVotes(feature.properties);
                const countyPath = svg.selectAll("path").filter(function (d) {
                    return d.properties.FIPS === feature.properties.FIPS;
                });
                updateCountyColor(countyPath, feature.properties);
            });
        });
    });
});


