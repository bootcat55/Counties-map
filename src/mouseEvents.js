import * as d3 from 'd3';
import { updateTooltip, hideTooltip, updateInfoPane } from './paneSetup.js';
import { countyDataArray } from './voteManager.js';
import { setupSliders } from './sliderHandler.js';

let selectedCounties = []; // Track selected counties

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
        });
}

export function countSelectedCounties() {
    return selectedCounties.length;
}