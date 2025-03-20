import * as d3 from 'd3';
import { updateTooltip, hideTooltip, updateInfoPane } from './paneSetup.js';
import { countyDataArray } from './voteManager.js';
import { setupSliders } from './sliderHandler.js';

// Export selectedCounties array
export let selectedCounties = []; // Track selected counties

export function setupMouseEvents(interactionLayer, tooltip, updatePane, sliders, buttons, svg, infoPane) {
    const dropdown = document.getElementById('data-year-selector'); // Get the dropdown element

    interactionLayer.selectAll("path")
        .on("mouseover", function (event, d) {
            if (dropdown && dropdown.classList.contains("open")) {
                hideTooltip(tooltip); // Ensure tooltip is hidden when dropdown is open
                return;
            }
            updateTooltip(tooltip, d, event);
        })
        .on("mousemove", function (event) {
            if (dropdown && dropdown.classList.contains("open")) {
                hideTooltip(tooltip); // Ensure tooltip is hidden when dropdown is open
                return;
            }
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function () {
            hideTooltip(tooltip);
        })
        .on("click", function (event, d) {
            const alreadySelected = selectedCounties.find(c => c.FIPS === d.properties.FIPS);
            if (alreadySelected) {
                selectedCounties = selectedCounties.filter(c => c.FIPS !== d.properties.FIPS);
                d3.select(this).attr("stroke", "none").attr("stroke-width", 0);
            } else {
                selectedCounties.push(d.properties);
                d3.select(this).attr("stroke", "white").attr("stroke-width", 1);
            }

            console.log("Number of selected counties:", countSelectedCounties()); // Output the count

            if (selectedCounties.length > 0) {
                updatePane.style("display", "block");

                // Aggregate votes for selected counties
                const aggregatedVotes = selectedCounties.reduce((totals, county) => {
                    totals.Republican += county.Republican;
                    totals.Democrat += county.Democrat;
                    totals.OtherVotes += county.OtherVotes;
                    return totals;
                }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

                const totalVotes = aggregatedVotes.Republican + aggregatedVotes.Democrat + aggregatedVotes.OtherVotes;
                const firstCounty = selectedCounties[0];

                // Calculate the total population of all counties in the same state as the first county
                const stateTotalPopulation = countyDataArray
                    .filter(county => county.State === firstCounty.State)
                    .reduce((sum, county) => sum + county.Population, 0);

                // Update Info Pane with aggregated votes and metadata
                updateInfoPane(infoPane, {
                    counties: selectedCounties,
                    aggregatedVotes,
                    totalVotes,
                    stateTotalPopulation,
                    countyType: firstCounty.vote_total > 50000 ? "Urban" : "Rural",
                });

                // Delegate slider handling to sliderHandler.js
                setupSliders(sliders, buttons, selectedCounties, updatePane, infoPane, svg, aggregatedVotes, totalVotes);
            } else {
                updatePane.style("display", "none");
            }
        })
        .on("dblclick", function (event, d) {
            const stateAbbreviation = d.properties.State; // Get the state abbreviation
            const stateCounties = countyDataArray.filter(county => county.State === stateAbbreviation);

            // Check if all counties in the state are already selected
            const allSelected = stateCounties.every(county => 
                selectedCounties.some(selected => selected.FIPS === county.FIPS)
            );

            if (allSelected) {
                // Deselect all counties in the state
                selectedCounties = selectedCounties.filter(
                    selected => !stateCounties.some(county => county.FIPS === selected.FIPS)
                );
            } else {
                // Select all counties in the state
                selectedCounties = selectedCounties.concat(stateCounties);
            }

            // Update the UI
            updateCountySelection(svg, stateCounties, !allSelected);
            updateInfoPaneWithSelectedCounties(stateCounties, !allSelected);
        });
}

// Function to update county selection on the map
function updateCountySelection(svg, counties, isSelected) {
    counties.forEach(county => {
        const countyPath = svg.selectAll("path").filter(d => d.properties.FIPS === county.FIPS);
        if (isSelected) {
            countyPath.attr("stroke", "white").attr("stroke-width", 2);
        } else {
            countyPath.attr("stroke", "none").attr("stroke-width", 0);
        }
    });
}

// Function to update the info pane with selected counties
function updateInfoPaneWithSelectedCounties(counties, isSelected) {
    const infoPane = d3.select("#info-container");
    if (isSelected) {
        const aggregatedVotes = counties.reduce((totals, county) => {
            totals.Republican += county.Republican;
            totals.Democrat += county.Democrat;
            totals.OtherVotes += county.OtherVotes;
            return totals;
        }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

        const totalVotes = aggregatedVotes.Republican + aggregatedVotes.Democrat + aggregatedVotes.OtherVotes;
        const firstCounty = counties[0];

        // Calculate the total population of all counties in the same state as the first county
        const stateTotalPopulation = countyDataArray
            .filter(county => county.State === firstCounty.State)
            .reduce((sum, county) => sum + county.Population, 0);

        // Update the info pane with aggregated data
        updateInfoPane(infoPane, {
            counties,
            aggregatedVotes,
            totalVotes,
            stateTotalPopulation,
            countyType: firstCounty.vote_total > 50000 ? "Urban" : "Rural",
        });
    } else {
        infoPane.style("display", "none");
    }
}

export function countSelectedCounties() {
    return selectedCounties.length;
}