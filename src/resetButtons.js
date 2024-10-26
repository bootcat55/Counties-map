/*
import * as d3 from 'd3';
import { resetCountyVotes, updateCountyColor } from './voteUpdates.js';
import { updateInfoPane } from './paneSetup.js';

// Function to create a Reset County button for individual county reset
export function createResetButton(updatePane, selectedCounty, svg, infoPane, stateTotalPopulation, winner, electoralVotes, countyType) {
    // Check if the reset button already exists in the update pane
    let resetButton = updatePane.select("button.reset-county");
    
    if (resetButton.empty()) {
        // Create the reset button only if it doesn't already exist
        resetButton = updatePane.append("button")
            .text("Reset County")
            .attr("class", "reset-county")
            .style("display", "inline-block")
            .style("margin-left", "10px")  // Space between the Update Votes and Reset County button
            .on("click", function (e) {
                e.preventDefault();
                resetCountyVotes(selectedCounty.properties);

                // Update the color of the selected county based on reset votes
                const selectedCountyPath = svg.selectAll("path")
                    .filter(f => f.properties.FIPS === selectedCounty.properties.FIPS || f.properties.FIPS === 51515);
                updateCountyColor(selectedCountyPath, selectedCounty.properties);

                // Update the information pane with the reset values
                updateInfoPane(infoPane, selectedCounty.properties, stateTotalPopulation, winner, electoralVotes, countyType);

                // Hide the update pane
                updatePane.style("display", "none");
            });
    }

    return resetButton;
}

// Function to create a Reset All Counties button to reset all counties at once
export function createResetAllButton(svg, filteredGeoData) {
    const resetAllButton = d3.select("body").append("button")
        .text("Reset All Counties")
        .style("position", "absolute")
        .style("top", "20px")
        .style("left", "20px")
        .style("padding", "10px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f5f5f5")
        .on("click", function (e) {
            e.preventDefault();

            // Iterate through each county feature and reset votes
            filteredGeoData.features.forEach(function (feature) {
                resetCountyVotes(feature.properties);
                const countyPath = svg.selectAll("path")
                    .filter(d => d.properties.FIPS === feature.properties.FIPS);
                updateCountyColor(countyPath, feature.properties);
            });
        });

    return resetAllButton;
}

*/
