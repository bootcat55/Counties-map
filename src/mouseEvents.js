import * as d3 from 'd3';
import { updateTooltip, hideTooltip, updateInfoPane } from './paneSetup.js';
import { countyDataArray } from './voteManager.js';
import { setupSliders } from './sliderHandler.js';

let selectedCounties = []; // Track selected counties

export function setupMouseEvents(interactionLayer, tooltip, updatePane, sliders, buttons, svg, infoPane) {
    interactionLayer.selectAll("path")
        .on("mouseover", function (event, d) {
            updateTooltip(tooltip, d, event);
        })
        .on("mousemove", function (event) {
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
                d3.select(this).attr("stroke", "white").attr("stroke-width", 2);
            }

            console.log("Number of selected counties:", countSelectedCounties()); // Output the count

            if (selectedCounties.length > 0) {
                updatePane.style("display", "block");

                const aggregatedVotes = selectedCounties.reduce((totals, county) => {
                    totals.Republican += county.Republican;
                    totals.Democrat += county.Democrat;
                    totals.OtherVotes += county.OtherVotes;
                    return totals;
                }, { Republican: 0, Democrat: 0, OtherVotes: 0 });

                const totalVotes = aggregatedVotes.Republican + aggregatedVotes.Democrat + aggregatedVotes.OtherVotes;
                const firstCounty = selectedCounties[0];

                // Update Info Pane with aggregated votes and metadata of the first county
                updateInfoPane(infoPane, {
                    ...firstCounty,
                    Republican: aggregatedVotes.Republican,
                    Democrat: aggregatedVotes.Democrat,
                    OtherVotes: aggregatedVotes.OtherVotes,
                }, firstCounty.Population, firstCounty.vote_total > 50000 ? "Urban" : "Rural");

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
